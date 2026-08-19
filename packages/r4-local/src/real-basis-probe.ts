import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalSha256 } from "../../r4-protocol/src/index.ts";
import { assertHeadRecord, assertTwinRevision } from "../../../src/contracts.ts";
import { sha256 as spineSha256 } from "../../../src/contracts.ts";
import type { HeadRecord, TwinRevision } from "../../../src/types.ts";
import { compileProjectionDraft } from "./projection.ts";

export interface RealTwinBasisProbeResult {
  schemaVersion: "r4.real-twin-basis-probe.v1";
  readOnly: true;
  bodyFree: true;
  twinRevision: number;
  twinRevisionHash: `sha256:${string}`;
  workspaceContractHash: `sha256:${string}`;
  ownerFrameFactHash: `sha256:${string}`;
  correctedReflection: { id: string; contentHash: `sha256:${string}` };
  r3History: { proposalId: string; receiptIds: string[]; contentHash: `sha256:${string}` };
  projectionBasisHash: `sha256:${string}`;
  projectionPayloadHash: `sha256:${string}`;
  eligibilityClasses: ["owner_frame", "owner_corrected_reflection", "rolled_back_history"];
  reportedSourceBodyBytes: 0;
}

function readCurrentTwin(workspaceRoot: string): { head: HeadRecord; revision: TwinRevision } {
  const stateRoot = join(resolve(workspaceRoot), ".forme");
  const head: unknown = JSON.parse(readFileSync(join(stateRoot, "HEAD"), "utf8"));
  assertHeadRecord(head);
  const revisionBytes = readFileSync(join(stateRoot, "revisions", head.file), "utf8");
  const revision: unknown = JSON.parse(revisionBytes);
  assertTwinRevision(revision);
  if (revision.revision !== head.revision || spineSha256(revisionBytes) !== head.contentHash) {
    throw new Error("real Twin HEAD/revision hash mismatch");
  }
  return { head, revision };
}

export function probeRealTwinBasis(workspaceRoot: string): RealTwinBasisProbeResult {
  const { head, revision } = readCurrentTwin(workspaceRoot);
  if (revision.schemaVersion !== "3") throw new Error("real Forme Twin must contain R1–R3 state");
  const corrected = revision.cognition.reflections.find((reflection) => (
    reflection.status === "corrected" && reflection.authoredBy === "owner"
  ));
  if (!corrected) throw new Error("real Forme Twin has no eligible Owner-corrected Reflection");
  const rolledBack = revision.agency.proposals.find((proposal) => (
    proposal.status === "rolled-back"
    && proposal.effectReceiptIds.length >= 2
    && proposal.effectReceiptIds.every((receiptId) => revision.agency.effectReceipts.some((receipt) => (
      receipt.receiptId === receiptId && receipt.status === "succeeded"
    )))
  ));
  if (!rolledBack) throw new Error("real Forme Twin has no truthful executed-and-rolled-back R3 history");
  const projectionPolicyHash = canonicalSha256({
    schemaVersion: "r4.projection-policy.synthetic-probe.v1",
    packetHash: "sha256:e417836bd67bdef73f401919e83de3d58f68960499bd5c356951b48408adfff5",
    audience: "synthetic_probe_only",
  });
  const draft = compileProjectionDraft({
    revision,
    twinRevisionHash: head.contentHash as `sha256:${string}`,
    draft: {
      roomId: "room_syntheticprobe00000001",
      projectionId: "proj_syntheticprobe00000001",
      entityId: "entity_syntheticprobe000001",
      basisId: "basis_syntheticprobe0000001",
      publicationAttestationId: "att_syntheticprobe000000001",
      ownerDecisionId: "decision_syntheticprobe00001",
      title: "Synthetic Forme basis probe",
      thirdPlaceSummary: "A body-free verification artifact; it is not published.",
      selections: [
        { slot: "now", source: "owner_frame", field: "activeIntent" },
        { slot: "becoming", source: "reflection", reflectionId: corrected.reflectionId },
        { slot: "tensions", source: "r3_effect", proposalId: rolledBack.proposal.proposalId },
      ],
      supportedInteractions: ["ask"],
      allowedTopics: ["synthetic verification"],
      unavailableTopics: ["private source bodies"],
      expectedResponseLatency: "No response; probe only",
      visualThemeToken: "forme_probe_v1",
      agencyStatement: "This probe grants no Agent authority.",
      nonCommitmentStatement: "This probe is not a publication or Owner commitment.",
      projectionPolicyGeneration: 1,
      projectionPolicyHash,
      publishedAt: "2026-08-03T12:00:00.000Z",
      freshUntil: "2026-08-04T12:00:00.000Z",
      expiresAt: "2026-08-10T12:00:00.000Z",
    },
  });
  return {
    schemaVersion: "r4.real-twin-basis-probe.v1",
    readOnly: true,
    bodyFree: true,
    twinRevision: revision.revision,
    twinRevisionHash: head.contentHash as `sha256:${string}`,
    workspaceContractHash: revision.workspaceContractHash as `sha256:${string}`,
    ownerFrameFactHash: canonicalSha256({ activeIntent: revision.ownerFrame.activeIntent }),
    correctedReflection: {
      id: corrected.reflectionId,
      contentHash: canonicalSha256(corrected),
    },
    r3History: {
      proposalId: rolledBack.proposal.proposalId,
      receiptIds: [...rolledBack.effectReceiptIds],
      contentHash: canonicalSha256({
        status: rolledBack.status,
        receipts: revision.agency.effectReceipts.filter((receipt) => rolledBack.effectReceiptIds.includes(receipt.receiptId)),
      }),
    },
    projectionBasisHash: canonicalSha256(draft.basis),
    projectionPayloadHash: draft.capsule.payloadHash,
    eligibilityClasses: ["owner_frame", "owner_corrected_reflection", "rolled_back_history"],
    reportedSourceBodyBytes: 0,
  };
}
