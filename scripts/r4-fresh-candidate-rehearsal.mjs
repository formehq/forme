import { runSyntheticFreshCandidateRehearsal } from "../packages/r4-local/src/fresh-candidate-rehearsal.ts";

const [command = "execute", ...rest] = process.argv.slice(2);
if (command !== "execute" || rest.length !== 0) {
  throw new Error("usage: node scripts/r4-fresh-candidate-rehearsal.mjs execute");
}

const result = await runSyntheticFreshCandidateRehearsal();
process.stdout.write(`${JSON.stringify(result)}\n`);
