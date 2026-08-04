import { createHmac } from "node:crypto";
import {
  canonicalSha256,
  validateSnapshotQueryResultV1,
  validateSnapshotQueryV1,
  type SnapshotQueryBrokerV1,
  type SnapshotQueryResultV1,
  type SnapshotQueryV1,
} from "../../r4-protocol/src/index.ts";
import { sha256, stableJson } from "./body-free.ts";
import type {
  BrokerReadResult,
  BrokerSearchMatch,
  Hash,
  ResponseSourceSnapshot,
  SnapshotAccessAggregate,
} from "./types.ts";

function assertManifestPath(snapshot: ResponseSourceSnapshot, path: string): string {
  if (path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) throw new Error("broker path rejected");
  const file = snapshot.files.find((candidate) => candidate.canonicalPath === path);
  if (!file) throw new Error("broker path is outside the snapshot manifest");
  return file.text;
}

const MAX_SEARCH_MILLISECONDS = 500;
const MAX_AGGREGATE_QUERIES = 256;
const MAX_AGGREGATE_RESULT_BYTES = 128 * 1_024;

class SnapshotQueryTimeout extends Error {}

export class SnapshotQueryBroker implements SnapshotQueryBrokerV1 {
  readonly protocolVersion = "snapshot_query_broker.v1" as const;
  readonly snapshot: ResponseSourceSnapshot;
  private readonly digestKey: Uint8Array;
  private readonly nowMilliseconds: () => number;
  private readonly queryAttempts: string[] = [];
  private readonly resultEvents: string[] = [];
  private resultCount = 0;
  private resultBytes = 0;

  constructor(
    snapshot: ResponseSourceSnapshot,
    digestKey: Uint8Array,
    options?: { nowMilliseconds?: () => number },
  ) {
    this.snapshot = snapshot;
    this.digestKey = digestKey;
    this.nowMilliseconds = options?.nowMilliseconds ?? (() => performance.now());
  }

  evaluate(input: SnapshotQueryV1): SnapshotQueryResultV1 {
    const query = validateSnapshotQueryV1(input);
    const queryHash = canonicalSha256(query);
    try {
      this.reserveQuery({ operation: "protocol_query", queryHash, queryType: query.schemaVersion });
      if (query.schemaVersion === "snapshot_line_read.v1") {
        const value = this.readLinesUncounted(query.canonicalPath, query.lineStart, query.lineEnd);
        return validateSnapshotQueryResultV1({
          schemaVersion: "snapshot_query_result.v1",
          queryHash,
          status: "ok",
          resultText: value.text,
          matchCount: value.text.length === 0 ? 0 : 1,
          resultBytes: Buffer.byteLength(value.text, "utf8"),
          bodyFreeErrorCode: null,
        });
      }
      const matches = this.searchUncounted({ pattern: query.pattern, mode: query.patternKind === "re2" ? "regex" : "literal" });
      const resultText = stableJson(matches);
      return validateSnapshotQueryResultV1({
        schemaVersion: "snapshot_query_result.v1",
        queryHash,
        status: "ok",
        resultText,
        matchCount: matches.length,
        resultBytes: Buffer.byteLength(resultText, "utf8"),
        bodyFreeErrorCode: null,
      });
    } catch (error) {
      if (error instanceof SnapshotQueryTimeout) {
        return validateSnapshotQueryResultV1({
          schemaVersion: "snapshot_query_result.v1",
          queryHash,
          status: "timeout",
          resultText: null,
          matchCount: 0,
          resultBytes: 0,
          bodyFreeErrorCode: "snapshot_query_timeout",
        });
      }
      const code = error instanceof Error && /not found|outside the snapshot/u.test(error.message)
        ? "snapshot_path_not_found"
        : "snapshot_query_rejected";
      return validateSnapshotQueryResultV1({
        schemaVersion: "snapshot_query_result.v1",
        queryHash,
        status: code === "snapshot_path_not_found" ? "not_found" : "rejected",
        resultText: null,
        matchCount: 0,
        resultBytes: 0,
        bodyFreeErrorCode: code,
      });
    }
  }

  readLines(path: string, lineStart: number, lineEnd: number): BrokerReadResult {
    this.reserveQuery({ operation: "direct_read", pathHash: sha256(path), lineStart, lineEnd });
    return this.readLinesUncounted(path, lineStart, lineEnd);
  }

  private readLinesUncounted(path: string, lineStart: number, lineEnd: number): BrokerReadResult {
    if (!Number.isSafeInteger(lineStart) || !Number.isSafeInteger(lineEnd) || lineStart < 1 || lineEnd < lineStart) {
      throw new Error("broker line range is invalid");
    }
    if (lineEnd - lineStart + 1 > 200) throw new Error("broker line read exceeds 200 lines");
    const body = assertManifestPath(this.snapshot, path);
    const lines = body.split(/\r?\n/u);
    const text = lines.slice(lineStart - 1, lineEnd).join("\n");
    if (Buffer.byteLength(text, "utf8") > 32 * 1024) throw new Error("broker line read exceeds 32 KiB");
    const result = { path, lineStart, lineEnd: Math.min(lineEnd, lines.length), text };
    this.record({ operation: "read", path, lineStart, lineEnd, resultBytes: Buffer.byteLength(text) });
    return result;
  }

  search(input: { pattern: string; mode: "literal" | "regex" }): BrokerSearchMatch[] {
    this.reserveQuery({ operation: "direct_search", patternHash: sha256(input.pattern), mode: input.mode });
    return this.searchUncounted(input);
  }

  private searchUncounted(input: { pattern: string; mode: "literal" | "regex" }): BrokerSearchMatch[] {
    if (Buffer.byteLength(input.pattern, "utf8") > 256 || input.pattern.length === 0) {
      throw new Error("broker search pattern is invalid");
    }
    if (input.mode === "regex") {
      // Gate A intentionally has no RE2 dependency. JavaScript RegExp cannot
      // provide the Packet's bounded linear-time guarantee, so uncertainty is
      // a hard denial until the exact Gate B engine is approved.
      throw new Error("broker RE2 engine unavailable in Gate A");
    }
    const startedAt = this.nowMilliseconds();
    const assertWithinDeadline = (): void => {
      const elapsed = this.nowMilliseconds() - startedAt;
      if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= MAX_SEARCH_MILLISECONDS) {
        throw new SnapshotQueryTimeout("broker search exceeded 500 ms");
      }
    };
    const matches: BrokerSearchMatch[] = [];
    assertWithinDeadline();
    for (const file of this.snapshot.files) {
      assertWithinDeadline();
      for (const [index, line] of file.text.split(/\r?\n/u).entries()) {
        assertWithinDeadline();
        const found = line.includes(input.pattern);
        if (!found) continue;
        const item = { path: file.canonicalPath, line: index + 1, excerpt: line };
        const nextBytes = Buffer.byteLength(stableJson([...matches, item]), "utf8");
        if (matches.length >= 100 || nextBytes > 64 * 1024) break;
        matches.push(item);
      }
      if (matches.length >= 100 || Buffer.byteLength(stableJson(matches), "utf8") >= 64 * 1024) break;
    }
    assertWithinDeadline();
    const resultBytes = Buffer.byteLength(stableJson(matches), "utf8");
    this.record({ operation: "search", mode: input.mode, pattern: input.pattern, resultCount: matches.length, resultBytes });
    return matches;
  }

  aggregate(): SnapshotAccessAggregate {
    const digest = createHmac("sha256", this.digestKey)
      .update(stableJson({ attempts: this.queryAttempts, results: this.resultEvents }))
      .digest("hex");
    return {
      queryCount: this.queryAttempts.length,
      resultCount: this.resultCount,
      resultBytes: this.resultBytes,
      accessDigest: `sha256:${digest}` as Hash,
    };
  }

  private record(event: Record<string, unknown>): void {
    const encoded = stableJson(event);
    const count = typeof event.resultCount === "number" ? event.resultCount : 1;
    const bytes = typeof event.resultBytes === "number" ? event.resultBytes : 0;
    if (this.resultBytes + bytes > MAX_AGGREGATE_RESULT_BYTES) throw new Error("broker aggregate result budget exceeded");
    this.resultEvents.push(encoded);
    this.resultCount += count;
    this.resultBytes += bytes;
  }

  private reserveQuery(event: Record<string, unknown>): void {
    if (this.queryAttempts.length >= MAX_AGGREGATE_QUERIES) {
      throw new Error("broker aggregate query budget exceeded");
    }
    this.queryAttempts.push(stableJson(event));
  }
}

export function snapshotPathlessReceiptFields(snapshot: ResponseSourceSnapshot): {
  snapshotManifestHash: Hash;
  snapshotId: string;
  fileCount: number;
  totalBytes: number;
  policyHash: Hash;
  secretPolicyHash: Hash;
} {
  return {
    snapshotManifestHash: snapshot.manifest.manifestHash,
    snapshotId: snapshot.manifest.snapshotId,
    fileCount: snapshot.manifest.fileCount,
    totalBytes: snapshot.manifest.totalBytes,
    policyHash: snapshot.policy.policyHash,
    secretPolicyHash: snapshot.policy.secretPatternPolicyHash,
  };
}

export const BROKER_POLICY_HASH = sha256(stableJson({
  schemaVersion: "r4.snapshot-query-broker.v1",
  read: { maxLines: 200, maxBytes: 32 * 1024 },
  search: { maxPatternBytes: 256, maxMatches: 100, maxBytes: 64 * 1024, maxMilliseconds: 500 },
  aggregate: { maxQueries: 256, maxResultBytes: 128 * 1024, rejectedAndTimeoutAttemptsConsumeQueryBudget: true },
  regex: "denied-until-exact-RE2-engine-is-approved-in-Gate-B",
}));
