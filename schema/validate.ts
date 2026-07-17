import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormatsImport from "ajv-formats";

// ajv-formats is CJS with an ESM `export default`; under verbatimModuleSyntax
// the default binds to the module object, so cast to its (proven) call shape.
const addFormats = addFormatsImport as unknown as (ajv: Ajv2020) => void;
import cardSchema from "./card.schema.json" with { type: "json" };
import eventSchema from "./decision-event.schema.json" with { type: "json" };
import actionReceiptSchema from "./twin/action-receipt.schema.json" with { type: "json" };
import agentMessageSchema from "./twin/agent-message.schema.json" with { type: "json" };
import agentProposalSchema from "./twin/agent-proposal.schema.json" with { type: "json" };
import publishedProjectionSchema from "./twin/published-projection.schema.json" with { type: "json" };
import runtimeEventSchema from "./twin/runtime-event.schema.json" with { type: "json" };
import sourceRecordSchema from "./twin/source-record.schema.json" with { type: "json" };
import twinStateSchema from "./twin/twin-state.schema.json" with { type: "json" };

/**
 * Forme's own validation gate. The design baseline is: the agent is read-only
 * and returns JSON only; Forme code decides whether that JSON is admissible.
 * We never trust a harness's "I followed the schema" — we compile the schema
 * here and check every card/event before anything touches disk.
 */

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictTypes: false,
  // if/then rules legitimately require props defined in the parent schema scope.
  strictRequired: false,
});
addFormats(ajv);

export const validateCard = ajv.compile(cardSchema);
export const validateEvent = ajv.compile(eventSchema);

export const twinContractNames = [
  "action-receipt",
  "agent-message",
  "agent-proposal",
  "published-projection",
  "runtime-event",
  "source-record",
  "twin-state",
] as const;

export type TwinContractName = typeof twinContractNames[number];

const twinValidators: Record<TwinContractName, ValidateFunction> = {
  "action-receipt": ajv.compile(actionReceiptSchema),
  "agent-message": ajv.compile(agentMessageSchema),
  "agent-proposal": ajv.compile(agentProposalSchema),
  "published-projection": ajv.compile(publishedProjectionSchema),
  "runtime-event": ajv.compile(runtimeEventSchema),
  "source-record": ajv.compile(sourceRecordSchema),
  "twin-state": ajv.compile(twinStateSchema),
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map(
    (e) => `${e.instancePath || "(root)"} ${e.message ?? ""}`.trim(),
  );
}

function run(validate: ValidateFunction, data: unknown): ValidationResult {
  const valid = validate(data) === true;
  return { valid, errors: valid ? [] : formatErrors(validate.errors) };
}

export function checkCard(data: unknown): ValidationResult {
  return run(validateCard, data);
}

export function checkEvent(data: unknown): ValidationResult {
  return run(validateEvent, data);
}

export function checkTwinContract(name: TwinContractName, data: unknown): ValidationResult {
  return run(twinValidators[name], data);
}
