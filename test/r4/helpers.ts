import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  BodyFreeRoomEvent,
  BodyFreeRoomLedger,
  Hash,
  ResponseCandidate,
  ResponseSourceSnapshot,
} from "../../packages/r4-local/src/index.ts";
import {
  newBodyFreeLedger,
  RESPONSE_SOURCE_POLICY,
  sha256,
} from "../../packages/r4-local/src/index.ts";
import {
  canonicalSha256,
  validateResponseCandidateV1,
  validateResponseSourceSnapshotV1,
  type ResponseCandidateV1,
  type ResponseSourceSnapshotV1,
} from "../../packages/r4-protocol/src/index.ts";

export const NOW = new Date("2026-08-03T12:00:00.000Z");
export const ROOM_ID = "room_synthetic00000001";
export const INTERACTION_ID = "interaction_synthetic00000001";
export const PROJECTION_ID = "proj_synthetic00000001";

export function temporaryRoot(label: string): string {
  return realpathSync(mkdtempSync(join(tmpdir(), `forme-r4-${label}-`)));
}

export function removeRoot(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

export function ledger(overrides: Partial<BodyFreeRoomLedger> = {}): BodyFreeRoomLedger {
  return {
    ...newBodyFreeLedger({
      roomId: ROOM_ID,
      bindingId: "binding_syntheticledger000001",
      bindingExpiresAt: "2026-09-02T12:00:00.000Z",
    }),
    ...overrides,
  };
}

export function roomEvent(sequence: number, overrides: Partial<BodyFreeRoomEvent> = {}): BodyFreeRoomEvent {
  return {
    schemaVersion: "room_event.v1",
    eventId: `event_synthetic${String(sequence).padStart(16, "0")}`,
    roomId: ROOM_ID,
    sequence,
    objectType: "interaction",
    objectId: `${INTERACTION_ID}_${sequence}`,
    eventType: "interaction.accepted",
    objectVersion: 1,
    payloadHash: sha256(`synthetic-event-${sequence}`),
    committedAt: new Date(NOW.getTime() + sequence * 1_000).toISOString(),
    bodyAvailable: true,
    ...overrides,
  };
}

export function candidate(overrides: Partial<ResponseCandidate> = {}): ResponseCandidate {
  const preimage: Omit<ResponseCandidateV1, "candidateHash"> = {
    schemaVersion: "response_candidate.v1",
    candidateId: "candidate_synthetic00000001",
    interactionId: INTERACTION_ID,
    sessionEnvelopeId: "session_synthetic00000001",
    roomId: ROOM_ID,
    projectionId: PROJECTION_ID,
    originState: "published_fresh",
    responseText: "Synthetic candidate body; no real Guest data.",
    sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed",
    twinBasisHash: sha256("twin"),
    snapshotManifestHash: sha256("snapshot"),
    sessionReceiptHash: sha256("session-receipt"),
    policyHash: sha256("policy"),
    admittedAt: NOW.toISOString(),
    expiresAt: new Date(NOW.getTime() + 24 * 60 * 60 * 1_000).toISOString(),
  };
  const merged = { ...preimage, ...overrides };
  const candidateHash = overrides.candidateHash ?? canonicalSha256(merged);
  return validateResponseCandidateV1({ ...merged, candidateHash });
}

export function syntheticSnapshot(files?: Array<{ path: string; text: string }>): ResponseSourceSnapshot {
  const source = files ?? [{ path: "README.md", text: "one\ntwo\nthree" }];
  const normalized = source.map((file) => ({
    canonicalPath: file.path,
    text: file.text,
    byteCount: Buffer.byteLength(file.text, "utf8"),
    contentHash: sha256(file.text),
  }));
  const preimage: Omit<ResponseSourceSnapshotV1, "manifestHash"> = {
    schemaVersion: "response_source_snapshot.v1",
    snapshotId: "snapshot_synthetic00000001",
    repositoryHead: "a".repeat(40),
    repositoryTreeHash: sha256("synthetic-tree"),
    policyId: RESPONSE_SOURCE_POLICY.policyId,
    policyHash: RESPONSE_SOURCE_POLICY.policyHash,
    files: normalized.map(({ canonicalPath, byteCount, contentHash }) => ({ canonicalPath, byteCount, contentHash })),
    fileCount: normalized.length,
    totalBytes: normalized.reduce((total, file) => total + file.byteCount, 0),
    createdAt: NOW.toISOString(),
  };
  const manifest = validateResponseSourceSnapshotV1({ ...preimage, manifestHash: canonicalSha256(preimage) }, RESPONSE_SOURCE_POLICY);
  return {
    manifest,
    policy: RESPONSE_SOURCE_POLICY,
    files: normalized,
  };
}

export function git(repo: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: repo,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_TERMINAL_PROMPT: "0",
      NODE_ENV: process.env.NODE_ENV ?? "test",
    },
  }).trim();
}

export function createGitRepo(files: Record<string, string | Buffer> = { "README.md": "Synthetic repository\n" }): string {
  const root = temporaryRoot("repo");
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.name", "Forme Synthetic Test"]);
  git(root, ["config", "user.email", "synthetic@example.invalid"]);
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, contents);
  }
  git(root, ["add", "--all"]);
  git(root, ["commit", "--quiet", "-m", "synthetic fixture"]);
  return root;
}

export function asHash(character: string): Hash {
  return `sha256:${character.repeat(64)}`;
}
