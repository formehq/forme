import fs from "node:fs";

const allowed = new Set(["before-byte", "mid-frame", "full-nonzero", "full-zero"]);
const [mode, candidatePath, completionFdText] = process.argv.slice(2);
if (!allowed.has(mode) || !candidatePath || !/^[0-9]+$/u.test(completionFdText ?? "")) process.exit(64);
const bytes = fs.readFileSync(candidatePath);
try {
  if (mode === "before-byte") process.exitCode = 71;
  else if (mode === "mid-frame") { process.stdout.write(bytes.subarray(0, Math.max(1, Math.floor(bytes.length / 2)))); process.exitCode = 72; }
  else {
    process.stdout.write(bytes);
    if (mode === "full-zero") fs.writeSync(Number(completionFdText), Buffer.from(`FRAME_COMPLETE ${bytes.length}\n`, "utf8"));
    process.exitCode = mode === "full-zero" ? 0 : 73;
  }
} finally {
  bytes.fill(0);
}
