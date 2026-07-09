import { readFileSync } from "node:fs";

const ENV_KEYS = {
  NODE: "FORME_RENDER_NODE",
  PATH: "FORME_RENDER_PATH",
  REPO: "FORME_RENDER_REPO",
  VAULT: "FORME_RENDER_VAULT",
  HOUR: "FORME_RENDER_HOUR",
  SD_HOUR: "FORME_RENDER_SD_HOUR",
  LOG: "FORME_RENDER_LOG",
  PORT: "FORME_RENDER_PORT",
  SLOW_ROOT: "FORME_RENDER_SLOW_ROOT",
} as const;

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderPlist(template: string, values: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`{{${key}}}`, xmlEscape(value));
  }
  const missing = [...rendered.matchAll(/\{\{([A-Z_]+)\}\}/g)].map((m) => m[1]);
  if (missing.length) throw new Error(`missing plist value(s): ${[...new Set(missing)].join(", ")}`);
  return rendered;
}

function main(): void {
  const templatePath = process.argv[2];
  if (!templatePath) throw new Error("usage: node render-plist.ts <template>");
  const values: Record<string, string> = {};
  for (const [key, envName] of Object.entries(ENV_KEYS)) {
    const value = process.env[envName];
    if (value !== undefined) values[key] = value;
  }
  process.stdout.write(renderPlist(readFileSync(templatePath, "utf8"), values));
}

if (process.argv[1]?.endsWith("render-plist.ts")) main();
