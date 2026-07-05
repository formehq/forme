import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormatsImport from "ajv-formats";

// ajv-formats is CJS with an ESM `export default`; under verbatimModuleSyntax
// the default binds to the module object, so cast to its (proven) call shape.
const addFormats = addFormatsImport as unknown as (ajv: Ajv2020) => void;
import cardSchema from "./card.schema.json" with { type: "json" };
import eventSchema from "./decision-event.schema.json" with { type: "json" };

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
