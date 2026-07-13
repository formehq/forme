import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

type DoctorReport = {
  codexVersion?: unknown;
  checks?: {
    "updates.status"?: {
      details?: Record<string, unknown>;
    };
  };
};

function versionParts(value: string): number[] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value);
  if (!match) throw new Error(`unrecognized Codex version '${value}'`);
  return match.slice(1).map(Number);
}

export function compareVersions(left: string, right: string): number {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

export function checkCodexDoctor(value: unknown): { current: string; latest: string } {
  if (!value || typeof value !== "object") throw new Error("Codex doctor did not return an object");
  const report = value as DoctorReport;
  if (typeof report.codexVersion !== "string") throw new Error("Codex doctor omitted codexVersion");
  const details = report.checks?.["updates.status"]?.details;
  const latest = details?.["latest version"];
  if (typeof latest !== "string") throw new Error("Codex doctor could not verify the latest available version");
  if (compareVersions(report.codexVersion, latest) < 0) {
    throw new Error(`Codex ${report.codexVersion} is stale; latest available is ${latest}`);
  }
  return { current: report.codexVersion, latest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = JSON.parse(readFileSync(0, "utf8")) as unknown;
    const result = checkCodexDoctor(report);
    console.log(`Codex ${result.current} is current (latest ${result.latest})`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
