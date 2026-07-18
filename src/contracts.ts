import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";
import type {
  HeadRecord,
  TwinRevision,
  WorkspaceContract,
} from "./types.ts";

const require = createRequire(import.meta.url);
const addFormats = require("ajv-formats") as FormatsPlugin;
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

function schema(relativePath: string): object {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8")) as object;
}

const validateWorkspace = ajv.compile<WorkspaceContract>(schema("../schemas/workspace-v1.schema.json"));
const validateRevision = ajv.compile<TwinRevision>(schema("../schemas/twin-revision-v1.schema.json"));

function validationMessage(name: string, validator: ValidateFunction): string {
  return `${name} contract failed: ${ajv.errorsText(validator.errors, { separator: "; " })}`;
}

export function assertWorkspaceContract(value: unknown): asserts value is WorkspaceContract {
  if (!validateWorkspace(value)) throw new Error(validationMessage("workspace", validateWorkspace));
}

export function assertTwinRevision(value: unknown): asserts value is TwinRevision {
  if (!validateRevision(value)) throw new Error(validationMessage("Twin revision", validateRevision));
}

export function assertHeadRecord(value: unknown): asserts value is HeadRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("HEAD contract failed");
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = ["contentHash", "file", "revision", "schemaVersion"];
  if (
    JSON.stringify(keys) !== JSON.stringify(expected)
    || record.schemaVersion !== "1"
    || !Number.isSafeInteger(record.revision)
    || (record.revision as number) < 1
    || record.file !== revisionFilename(record.revision as number)
    || typeof record.contentHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/.test(record.contentHash)
  ) {
    throw new Error("HEAD contract failed");
  }
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => [key, sorted(item)]),
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sorted(value));
}

export function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(value: string | Buffer): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function revisionFilename(revision: number): string {
  return `${String(revision).padStart(6, "0")}.json`;
}
