import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

export type CardLanguage = "zh" | "en" | "mixed";

export function detectTextLanguage(text: string): CardLanguage {
  const sample = text.slice(0, 120_000);
  const cjk = sample.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latin = sample.match(/[A-Za-z]/g)?.length ?? 0;
  const total = cjk + latin;
  if (total < 24) return "mixed";
  const cjkRatio = cjk / total;
  if (cjkRatio >= 0.55) return "zh";
  if (cjkRatio <= 0.08) return "en";
  return "mixed";
}

export function detectVaultLanguage(vault: string, files: string[]): CardLanguage {
  const root = resolve(vault) + sep;
  const chunks: string[] = [];
  for (const file of files.slice(0, 24)) {
    const path = resolve(vault, file);
    if (!path.startsWith(root)) continue;
    try {
      chunks.push(readFileSync(path, "utf8"));
    } catch {
      /* A file may disappear between git scan and prompt assembly. */
    }
  }
  return detectTextLanguage(chunks.join("\n"));
}

export function cardLanguageInstruction(language: CardLanguage): string {
  if (language === "zh") {
    return "卡面的人读字段(title/summary/whyNow/recommendationReason/onAccept)使用简体中文;路径、代码、专名保持原样。";
  }
  if (language === "en") {
    return "Write every human-facing card field (title, summary, whyNow, recommendationReason, onAccept) in English; keep paths, code, and proper nouns unchanged.";
  }
  return "中英混合 vault:每张卡跟随其主要证据的语言;英文证据写英文,中文证据写中文,不要翻译路径、代码或专名。";
}
