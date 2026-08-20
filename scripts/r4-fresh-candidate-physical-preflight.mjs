import { runPinnedFreshCandidatePhysicalPreflight } from "../packages/r4-codex-adapter/src/fresh-candidate-preflight.ts";

const [command, ...rest] = process.argv.slice(2);
if (command !== "execute" || rest.length !== 0) {
  throw new Error("usage: node scripts/r4-fresh-candidate-physical-preflight.mjs execute");
}

const result = await runPinnedFreshCandidatePhysicalPreflight();
process.stdout.write(`${JSON.stringify(result)}\n`);
