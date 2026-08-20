import { runPinnedFreshCandidateSyntheticProviderRoundTrip } from "../packages/r4-codex-adapter/src/index.ts";

if (process.argv.length !== 3 || process.argv[2] !== "execute") {
  process.stderr.write("usage: r4-fresh-candidate-synthetic-provider-round-trip execute\n");
  process.exitCode = 64;
} else {
  try {
    const result = await runPinnedFreshCandidateSyntheticProviderRoundTrip();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "FRESH_SYNTHETIC_PROVIDER_ROUND_TRIP_FAILED"}\n`);
    process.exitCode = 1;
  }
}
