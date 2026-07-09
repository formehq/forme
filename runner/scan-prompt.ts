export interface ScanPromptInput {
  maxCards: number;
  files: string[];
  slowFiles: string[];
  slowRoot: string;
  tasteRules: string[];
}

/** Build the English-first detector prompt. Injected vault evidence may be in any language. */
export function buildScanPrompt(input: ScanPromptInput): string {
  const { maxCards, files, slowFiles, slowRoot, tasteRules } = input;
  return [
    `You are Forme's drift detector. Read only the recently changed Markdown files listed below and report at most ${maxCards} real, specific drift${maxCards === 1 ? "" : "s"} that a minimal diff can fix.`,
    "",
    "Use a kebab-case category such as stale-frontmatter, broken-link, stale-claim, orphan, naming-drift, dangling-task, or claim-drift.",
    "",
    "Thought cards (category=claim-drift, stakes=thought; at most one per run):",
    "- Look for tension between an older stated belief and newer behavior, decisions, or writing. This is about a possible change of mind, not document tidiness.",
    "- A gentle amendment is allowed, but diff.before must still exist verbatim. Do not use a pure insertion.",
    "- recommendationChoice may be park when the tension is real but unresolved.",
    "- Low acceptance is healthy here: park and reject are useful taste signals. Return no thought card when the evidence is weak.",
    "",
    "Each card uses the five-part decision face:",
    "- category: kebab-case slug.",
    "- title: one plain-English sentence a user can understand at first glance.",
    "- summary: one English context line describing what is happening; null when unnecessary.",
    "- whyNow: one English line explaining why this surfaced now; null when unnecessary.",
    "- stakes: reversible-ledger for bookkeeping only, real-world-action for commitments/actions outside the vault, or thought for a belief-level conflict.",
    "- recommendationChoice and recommendationReason: accept, park, or reject plus one clear English reason. Take a position, but do not repeat the choice label in the reason.",
    "- onAccept: one English sentence previewing what accepting changes; do not repeat file paths or rollback mechanics; null when unnecessary.",
    "- evidence: vault-relative path, locator, verbatim quote, and an English note explaining relevance. Quotes stay verbatim in their original language.",
    "- diff: one vault-relative file and minimal replacement hunks. before must match the file verbatim; after must fit the target document's language and style. A pure insertion uses an empty before string.",
    "- estSeconds: estimated decision time; null when unknown.",
    "",
    "English-first product language and world-level legibility:",
    "- All newly generated product-facing prose is English regardless of the vault's main language. This includes title, summary, whyNow, recommendationReason, onAccept, context answers, evidence notes, and prose locators.",
    "- Preserve paths, code, proper nouns, evidence quotes, and diff source text exactly. The diff is vault content, not UI copy; keep it compatible with the target document.",
    "- title, summary, and whyNow describe the user's world: what is unresolved, who or what it blocks, and which commitment or date makes it matter. Put file surgery in onAccept and diff.",
    "- Bad: 'The handle task is buried in the completed list.' This only describes list surgery.",
    "- Good: '@formehq is still unconfirmed, and the August 15 launch needs it.' This names the unresolved real-world fact.",
    "- Scale detail with stakes. Keep reversible-ledger cards thin; give real-world-action cards enough context to decide. Most cards should remain decidable in about ten seconds.",
    "",
    ...(tasteRules.length
      ? [
          "Established taste rules follow. They may be historical and written in any language; obey their meaning, but do not copy their language into the English card face:",
          ...tasteRules.map((rule) => `- ${rule}`),
          "",
        ]
      : []),
    "Hard rules: remain read-only; never edit files; copy diff.before exactly from the target file; obey the English-first face rule; prefer no card over a weak card; return an empty cards array when no reliable drift exists.",
    "",
    "Return only JSON that satisfies the output schema. Recently changed files:",
    ...files.map((file) => `- ${file}`),
    ...(slowFiles.length
      ? [
          "",
          `Slow-layer belief references from ${slowRoot}. Compare them with the recent files for claim-drift; do not propose ordinary cleanup cards against these references:`,
          ...slowFiles.map((file) => `- ${file}`),
        ]
      : []),
  ].join("\n");
}
