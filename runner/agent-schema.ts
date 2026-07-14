/**
 * The JSON Schema codex is given via `--output-schema`. It only SHAPES the
 * agent's output — it is deliberately loose (codex uses OpenAI strict structured
 * outputs, which reject `pattern`/`minItems`/`format` and require every property
 * in `required`, so optionals are nullable unions). The real contract is enforced
 * afterwards by Forme's own AJV (schema/validate.ts against card.schema.json),
 * which is where category slugs, non-empty hunks, etc. are actually checked.
 */
const nullableString = { type: ["string", "null"] };

export function agentOutputSchema(): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: ["cards"],
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "category", "title", "summary",
            "whyNow", "recommendationChoice", "recommendationReason", "onAccept",
            "evidence", "diff", "estSeconds", "stakes",
          ],
          properties: {
            category: { type: "string" },
            title: { type: "string" },
            summary: nullableString,
            whyNow: nullableString,
            recommendationChoice: nullableString,
            recommendationReason: nullableString,
            onAccept: nullableString,
            evidence: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["path", "locator", "quote", "note"],
                properties: {
                  path: { type: "string" },
                  locator: nullableString,
                  quote: nullableString,
                  note: nullableString,
                },
              },
            },
            diff: {
              type: "object",
              additionalProperties: false,
              required: ["file", "hunks"],
              properties: {
                file: { type: "string" },
                hunks: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["locator", "before", "after", "all"],
                    properties: {
                      locator: nullableString,
                      before: { type: "string" },
                      after: { type: "string" },
                      // #36:true = 替换 before 的每一处出现(重复引用类漂移);
                      // 指某一处时用 null 并在 locator 里带 L<行号>。
                      all: { type: ["boolean", "null"] },
                    },
                  },
                },
              },
            },
            estSeconds: { type: ["integer", "null"] },
            stakes: nullableString,
          },
        },
      },
    },
  };
}
