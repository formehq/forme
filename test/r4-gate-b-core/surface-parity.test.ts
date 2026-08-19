import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CORE_EXCLUDED_OPERATION_NAMES,
  CORE_OPERATION_INVENTORY,
  CORE_OPERATION_NAMES,
} from "../../apps/room/src/core-policy.ts";
import { OPERATION_INVENTORY } from "../../apps/room/src/operation-inventory.ts";
import { CORE_ROOM_API_ACTIONS, CORE_ROOM_API_SHAPES } from "../../packages/r4-local/src/hosted-room-api.ts";

test("HTTP, generated schema index, and CLI share one exact Core-32 action order", () => {
  const index = JSON.parse(readFileSync("schemas/r4/gate-b-core/api-v1-index.json", "utf8")) as {
    operations: Array<{ action: string; method: string; path: string; actor: string; mutating: boolean; expectedVersion: boolean }>;
  };
  assert.deepEqual(index.operations.map((operation) => operation.action), [...CORE_OPERATION_NAMES]);
  assert.deepEqual([...CORE_ROOM_API_ACTIONS], [...CORE_OPERATION_NAMES]);
  assert.deepEqual(CORE_OPERATION_INVENTORY.map((operation) => ({
    action: operation.name,
    method: operation.method,
    path: operation.path,
    actor: operation.actor,
    mutating: operation.mutating,
    expectedVersion: operation.expectedVersion,
  })), index.operations.map(({ action, method, path, actor, mutating, expectedVersion }) => ({ action, method, path, actor, mutating, expectedVersion })));
  for (const action of CORE_OPERATION_NAMES) {
    assert.equal(CORE_ROOM_API_SHAPES[action].path, CORE_OPERATION_INVENTORY.find((operation) => operation.name === action)?.path);
  }
});

test("Core and excluded operations are an exact disjoint partition of Full-45", () => {
  const core = new Set<string>(CORE_OPERATION_NAMES);
  const excluded = new Set<string>(CORE_EXCLUDED_OPERATION_NAMES);
  assert.equal(core.size, 32);
  assert.equal(excluded.size, 13);
  assert.deepEqual(
    [...new Set([...core, ...excluded])].sort(),
    OPERATION_INVENTORY.map((operation) => operation.name).sort(),
  );
  assert.equal([...core].some((name) => excluded.has(name)), false);
});
