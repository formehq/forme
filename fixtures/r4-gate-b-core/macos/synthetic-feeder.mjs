import crypto from "node:crypto";
import fs from "node:fs";

const [candidateFdText, controlFdText, mode = "complete"] = process.argv.slice(2);
if (!/^[0-9]+$/u.test(candidateFdText ?? "") || !/^[0-9]+$/u.test(controlFdText ?? "")) process.exit(64);
if (!new Set(["complete", "before-byte", "mid-frame", "full-nonzero", "missing-marker", "early-marker", "bad-marker", "duplicate-marker", "candidate-pipe-marker", "stdout-marker", "stderr-marker", "wrong-control-fd"]).has(mode)) process.exit(64);

const canonicalJson = (value) => {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort((a, b) => Buffer.from(a).compare(Buffer.from(b))).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
};
const sha256 = (bytes) => `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
const candidatePreimage = {
  schemaVersion: "response_candidate.v1",
  candidateId: "candidate_cccccccccccccccccccccccccccccccc",
  interactionId: "interaction_iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
  sessionEnvelopeId: "session_ssssssssssssssssssssssssssssssss",
  roomId: "room_rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
  projectionId: "proj_pppppppppppppppppppppppppppppppp",
  originState: "published_fresh",
  responseText: "Synthetic Forme Gate B response.\nApprove only this exact demonstration handoff.",
  sourceDisclosureClass: "fresh_native_sanitized_snapshot_owner_reviewed",
  twinBasisHash: `sha256:${"b".repeat(64)}`,
  snapshotManifestHash: `sha256:${"d".repeat(64)}`,
  sessionReceiptHash: `sha256:${"e".repeat(64)}`,
  policyHash: `sha256:${"f".repeat(64)}`,
  admittedAt: "2026-08-07T00:00:00.000Z",
  expiresAt: "2026-08-10T00:00:00.000Z",
};
const candidate = { ...candidatePreimage, candidateHash: sha256(Buffer.from(canonicalJson(candidatePreimage), "utf8")) };
const frame = Buffer.from(canonicalJson({
  schemaVersion: "transient_candidate_frame.v1",
  candidate,
  reservationId: "reservation_vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv",
  sessionEnvelopeHash: `sha256:${"1".repeat(64)}`,
  startAuthorizationHash: `sha256:${"a".repeat(64)}`,
}), "utf8");
try {
  if (sha256(frame) !== "sha256:0576ca281013f55670897488801dcfef98fb00db08a303fcbd8a028f97f2c001" || frame.length !== 1390) process.exitCode = 66;
  else if (mode === "before-byte") process.exitCode = 71;
  else {
    if (mode === "early-marker") fs.writeSync(Number(controlFdText), Buffer.from("FRAME_COMPLETE\n", "utf8"));
    const limit = mode === "mid-frame" ? Math.max(1, Math.floor(frame.length / 2)) : frame.length;
    fs.writeSync(Number(candidateFdText), frame.subarray(0, limit));
    if (mode === "mid-frame" || mode === "full-nonzero") process.exitCode = 72;
    else {
      const marker = mode === "bad-marker" ? "BAD\n" : "FRAME_COMPLETE\n";
      if (mode === "candidate-pipe-marker") fs.writeSync(Number(candidateFdText), Buffer.from(marker, "utf8"));
      else if (mode === "stdout-marker") process.stdout.write(marker);
      else if (mode === "stderr-marker") process.stderr.write(marker);
      else if (mode === "wrong-control-fd") {
        try { fs.writeSync(Number(controlFdText) + 10, Buffer.from(marker, "utf8")); process.exitCode = 74; }
        catch { process.exitCode = 74; }
      } else if (mode !== "missing-marker" && mode !== "early-marker") fs.writeSync(Number(controlFdText), Buffer.from(marker, "utf8"));
      if (mode === "duplicate-marker") fs.writeSync(Number(controlFdText), Buffer.from(marker, "utf8"));
      if (process.exitCode === undefined) process.exitCode = 0;
    }
  }
} finally {
  frame.fill(0);
}
