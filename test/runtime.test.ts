import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { auditCodexJsonl, inspectCapabilityProbe, selectCodexModel } from "../src/runtime.ts";
import { reflectionProposalJsonSchema } from "../src/contracts.ts";
import { removeWorkspace } from "./helpers.ts";

test("R2 runtime audit accepts only reasoning and a final agent message", () => {
  const final = JSON.stringify({ schemaVersion: "1" });
  const output = [
    JSON.stringify({ type: "thread.started", thread_id: "test" }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.started", item: { id: "1", type: "reasoning" } }),
    JSON.stringify({ type: "item.completed", item: { id: "1", type: "reasoning", text: "private reasoning is not persisted" } }),
    JSON.stringify({ type: "item.completed", item: { id: "2", type: "agent_message", text: final } }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 12, output_tokens: 8 } }),
  ].join("\n");
  const audited = auditCodexJsonl(output);
  assert.equal(audited.finalMessage, final);
  assert.deepEqual(audited.audit.itemTypes, ["agent_message", "reasoning"]);
  assert.equal(audited.audit.toolEventCount, 0);
  assert.equal(audited.audit.inputTokens, 12);
});

test("R2 runtime selects the authenticated catalog's highest-priority visible model", () => {
  const catalog = {
    models: [
      { slug: "hidden", visibility: "hide", priority: 0 },
      { slug: "second", visibility: "list", priority: 2 },
      { slug: "first", visibility: "list", priority: 1 },
    ],
  };
  assert.equal(selectCodexModel(catalog), "first");
  assert.equal(selectCodexModel(catalog, "second"), "second");
  assert.throws(() => selectCodexModel(catalog, "missing"), /not available/);
});

test("R2 structured-output const and enum nodes declare explicit JSON types", () => {
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    assert.equal("uniqueItems" in node, false);
    if ("const" in node || "enum" in node) {
      assert.equal(typeof node.type, "string");
    }
    Object.values(node).forEach(visit);
  };
  visit(reflectionProposalJsonSchema());
});

test("R2 runtime audit fails closed on command, file, MCP, web, or unknown item types", () => {
  for (const itemType of ["command_execution", "file_change", "mcp_tool_call", "web_search", "plan_update", "future_tool"]) {
    const output = [
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "item.completed", item: { id: "1", type: itemType } }),
      JSON.stringify({ type: "item.completed", item: { id: "2", type: "agent_message", text: "{}" } }),
      JSON.stringify({ type: "turn.completed", usage: {} }),
    ].join("\n");
    assert.throws(() => auditCodexJsonl(output), /unauthorized item type/);
  }
});

test("R2 capability probe requires an exact read-only packet root and rejects ambient workspace visibility", (context) => {
  const packetRoot = mkdtempSync(join(tmpdir(), "forme-r2-probe-packet-"));
  const forbiddenRoot = mkdtempSync(join(tmpdir(), "forme-r2-probe-forbidden-"));
  context.after(() => {
    removeWorkspace(packetRoot);
    removeWorkspace(forbiddenRoot);
  });
  mkdirSync(join(packetRoot, "nested"));
  const visibleRoot = realpathSync(packetRoot);
  const environmentText = `<environment_context><filesystem><workspace_roots><root>${visibleRoot}</root></workspace_roots><permission_profile type="managed"><file_system type="restricted"><entry access="read"><special>:minimal</special></entry><entry access="read"><path>${visibleRoot}</path></entry></file_system></permission_profile></filesystem></environment_context>`;
  const probeWith = (text: string): string => JSON.stringify([{
    type: "message",
    content: [{ type: "input_text", text }],
  }]);
  const probe = probeWith(environmentText);
  assert.doesNotThrow(() => inspectCapabilityProbe(probe, packetRoot, [forbiddenRoot]));
  assert.throws(
    () => inspectCapabilityProbe(
      probeWith(environmentText.replace("</file_system>", `<entry access="read"><path>${forbiddenRoot}</path></entry></file_system>`)),
      packetRoot,
      [forbiddenRoot],
    ),
    /forbidden path/,
  );
  assert.throws(
    () => inspectCapabilityProbe(probeWith(environmentText.replace('access="read"', 'access="write"')), packetRoot, []),
    /cannot prove|required packet-only|write or unrestricted/,
  );
});
