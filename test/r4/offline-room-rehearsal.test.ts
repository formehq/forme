import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import {
  SemanticError,
  type OperationResponse,
} from "../../apps/room/src/application.ts";
import {
  SYNTHETIC_PUBLIC_ROOM_ID,
  SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
} from "../../apps/room/src/synthetic-fixtures.ts";
import {
  OfflineRoomRehearsal,
  OfflineRoomRehearsalInjectedCrash,
  OFFLINE_ROOM_REHEARSAL_JOURNAL_FILENAME,
  createOfflineProjectionLogicalRehearsalPermit,
  inspectOfflineRoomRehearsalWriterRecovery,
  type OfflineProjectionLogicalRehearsalPermitV1,
  type OfflineRoomRehearsalFault,
} from "../../packages/r4-local/src/offline-room-rehearsal.ts";
import type { CoreRoomApiSecureInputV1 } from "../../packages/r4-local/src/hosted-room-api.ts";
import { ProtectedRoomLock } from "../../packages/r4-local/src/lock.ts";
import type {
  LocalRoomHandoffApprovalBundle,
  LocalRoomHandoffCandidateV1,
} from "../../packages/r4-local/src/projection-room-handoff.ts";
import {
  canonicalJson,
  canonicalSha256,
  type ArtifactApprovalV1,
  type ProjectionBasisV1,
  type ProjectionCapsuleV1,
} from "../../packages/r4-protocol/src/index.ts";
import { signedProjectionDeliveryBody } from "./hosted-publication-helpers.ts";
import { removeRoot, temporaryRoot } from "./helpers.ts";

const T0 = "2026-08-10T12:00:00.000Z";
const T1H = "2026-08-10T13:00:00.000Z";
const T1D = "2026-08-11T12:00:00.000Z";
const T7D = "2026-08-17T12:00:00.000Z";
const ENTITY_ID = "entity_offlinerehearsal00000000000000001";
const GUEST_CANARY = "GUEST_PRIVATE_KNOCK_CANARY_MUST_STAY_ENCRYPTED_67";
const WALKING_SLICE_ID = "slice_offline_room_rehearsal_00000067";

function secret(byte: number): string {
  return Buffer.alloc(32, byte).toString("base64url");
}

function secureInput(options: {
  readonly params?: Record<string, string>;
  readonly request?: Record<string, unknown>;
  readonly bearer?: string | null;
  readonly actor?: "controller" | "curator" | "room_operator" | null;
  readonly idempotencyKey?: string | null;
  readonly expectedVersion?: number | null;
  readonly clientBucket?: string | null;
} = {}): CoreRoomApiSecureInputV1 {
  return {
    schemaVersion: "forme.room.core-api-input.v1",
    pathParams: options.params ?? {},
    request: options.request ?? {},
    capability: {
      bearer: options.bearer ?? null,
      syntheticActor: options.actor ?? null,
      idempotencyKey: options.idempotencyKey ?? null,
      expectedVersion: options.expectedVersion ?? null,
      syntheticClientBucket: options.clientBucket ?? null,
    },
  };
}

function projectionFixture(label: string): {
  projection: ProjectionCapsuleV1;
  basis: ProjectionBasisV1;
  approval: ArtifactApprovalV1;
} {
  const seed = canonicalSha256(label).slice(7, 39);
  const preimage: Omit<ProjectionCapsuleV1, "payloadHash"> = {
    schemaVersion: "projection_capsule.v1",
    projectionId: `proj_${seed}`,
    roomId: SYNTHETIC_PUBLIC_ROOM_ID,
    entityId: ENTITY_ID,
    title: "Forme — offline public rehearsal",
    thirdPlaceSummary: "A bounded public view can receive one Owner-controlled knock.",
    claims: [{
      slot: "becoming",
      text: "The project carries continuity into a controlled public presence.",
      attribution: "owner_confirmed",
      uncertainty: null,
    }],
    supportedInteractions: ["ask"],
    allowedTopics: ["Forme vision"],
    unavailableTopics: ["private Twin evidence"],
    expectedResponseLatency: "Owner-reviewed and asynchronous",
    visualThemeToken: "forme_clean_v1",
    agencyStatement: "The local rehearsal cannot act for the Owner.",
    nonCommitmentStatement: "A public knock creates no Owner commitment.",
    disclosureBasisId: `basis_${seed}`,
    publicationAttestationId: `att_${seed}`,
    publishedAt: T0,
    freshUntil: T1D,
    expiresAt: T7D,
  };
  const projection: ProjectionCapsuleV1 = {
    ...preimage,
    payloadHash: canonicalSha256(preimage),
  };
  const basis: ProjectionBasisV1 = {
    schemaVersion: "projection_basis.v1",
    basisId: projection.disclosureBasisId,
    projectionId: projection.projectionId,
    roomId: projection.roomId,
    twinRevision: 67,
    twinRevisionHash: canonicalSha256("offline-rehearsal-twin"),
    workspaceContractHash: canonicalSha256("offline-rehearsal-workspace"),
    projectionPolicyGeneration: 1,
    projectionPolicyHash: canonicalSha256("offline-rehearsal-policy"),
    claims: [{
      slot: "becoming",
      claimText: projection.claims[0]?.text ?? "",
      attribution: "owner_confirmed",
      disclosureClass: "current_owner_frame",
      transformationClass: "exact",
      sourceKind: "owner_frame",
      sourceReference: "src_ownerprojectionwording00000067",
      sourceContentHash: canonicalSha256("offline-rehearsal-owner-wording"),
      semanticStatus: "active",
    }],
    payloadHash: projection.payloadHash,
    ownerDecisionId: `decision_${seed}`,
    ownerDecisionHash: canonicalSha256("offline-rehearsal-owner-decision"),
    localReceiptId: `receipt_${seed}`,
    hostedReceiptId: null,
  };
  const approval: ArtifactApprovalV1 = {
    schemaVersion: "artifact_approval.v1",
    approvalId: `approval_${seed}`,
    artifactClass: "projection",
    artifactHash: projection.payloadHash,
    roomId: projection.roomId,
    projectionId: projection.projectionId,
    interactionId: null,
    basisHash: canonicalSha256(basis),
    policyHash: basis.projectionPolicyHash,
    approvedAt: T0,
    expiresAt: T1H,
    operationId: `op_${seed}`,
  };
  return { projection, basis, approval };
}

function deliveryInput(bundle: ReturnType<typeof projectionFixture>, key: string): CoreRoomApiSecureInputV1 {
  return secureInput({
    request: signedProjectionDeliveryBody({ ...bundle, now: T0 }),
    bearer: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
    actor: "room_operator",
    idempotencyKey: key,
    expectedVersion: 1,
  });
}

function approvedHandoffFixture(bundle: ReturnType<typeof projectionFixture>): {
  candidate: LocalRoomHandoffCandidateV1;
  approval: LocalRoomHandoffApprovalBundle;
} {
  const seed = bundle.projection.projectionId.slice("proj_".length);
  const handoffId = `handoff_${seed}`;
  const reviewHash = canonicalSha256({ handoffId, payloadHash: bundle.projection.payloadHash });
  const draftInput = {
    roomId: bundle.projection.roomId,
    projectionId: bundle.projection.projectionId,
    entityId: bundle.projection.entityId,
    basisId: bundle.basis.basisId,
    publicationAttestationId: bundle.projection.publicationAttestationId,
    ownerDecisionId: bundle.basis.ownerDecisionId,
    title: bundle.projection.title,
    thirdPlaceSummary: bundle.projection.thirdPlaceSummary,
    selections: [{
      slot: "becoming" as const,
      source: "projection_owner_wording" as const,
      text: bundle.projection.claims[0]?.text ?? "",
    }],
    supportedInteractions: [...bundle.projection.supportedInteractions],
    allowedTopics: [...bundle.projection.allowedTopics],
    unavailableTopics: [...bundle.projection.unavailableTopics],
    expectedResponseLatency: bundle.projection.expectedResponseLatency,
    visualThemeToken: bundle.projection.visualThemeToken,
    agencyStatement: bundle.projection.agencyStatement,
    nonCommitmentStatement: bundle.projection.nonCommitmentStatement,
    projectionPolicyGeneration: bundle.basis.projectionPolicyGeneration,
    projectionPolicyHash: bundle.basis.projectionPolicyHash,
    publishedAt: bundle.projection.publishedAt,
    freshUntil: bundle.projection.freshUntil,
    expiresAt: bundle.projection.expiresAt,
  };
  const draft = {
    schemaVersion: "local_room_handoff_compiled_draft.v1" as const,
    input: draftInput,
    inputHash: canonicalSha256(draftInput),
    capsule: bundle.projection,
    basis: bundle.basis,
  };
  const candidate: LocalRoomHandoffCandidateV1 = {
    schemaVersion: "local_room_handoff_candidate.v1",
    handoffId,
    source: {
      schemaVersion: "local_room_handoff_source.v1",
      candidateId: `candidate_${seed}`,
      reviewHash: canonicalSha256(`source-review:${seed}`),
      localOnlyRoomId: `room_localonly${seed}`,
      projectionId: `proj_source${seed}`,
      payloadHash: canonicalSha256(`source-payload:${seed}`),
      basisHash: canonicalSha256(`source-basis:${seed}`),
      profileInputSha256: canonicalSha256(`source-profile:${seed}`),
      localContentApprovalId: `approval_source${seed}`,
      localContentApprovalSha256: canonicalSha256(`source-approval:${seed}`),
      localContentApprovalReceiptId: `receipt_source${seed}`,
      localContentApprovalReceiptSha256: canonicalSha256(`source-receipt:${seed}`),
      twinRevisionHash: bundle.basis.twinRevisionHash,
      publicContentHash: canonicalSha256(`source-public:${seed}`),
      localContentApprovalReusable: false,
    },
    targetRoomId: bundle.projection.roomId,
    projectionId: bundle.projection.projectionId,
    basisId: bundle.basis.basisId,
    publicationAttestationId: bundle.projection.publicationAttestationId,
    ownerDecisionId: bundle.basis.ownerDecisionId,
    preparedAt: T0,
    scheduledPublishedAt: T0,
    freshUntil: bundle.projection.freshUntil,
    expiresAt: bundle.projection.expiresAt,
    twinRevision: bundle.basis.twinRevision,
    twinRevisionHash: bundle.basis.twinRevisionHash,
    workspaceContractHash: bundle.basis.workspaceContractHash,
    draftSha256: canonicalSha256(draft),
    capsuleSha256: canonicalSha256(bundle.projection),
    basisSha256: canonicalSha256(bundle.basis),
    payloadHash: bundle.projection.payloadHash,
    basisHash: canonicalSha256(bundle.basis),
    publicContentHash: canonicalSha256(`public-content:${seed}`),
    reviewHash,
    draft,
    sourceLocalApprovalReused: false,
    contentPublicationApproved: false,
    deliveryAuthorized: false,
    roomMutationAuthorized: false,
    localOnly: true,
  };
  const publicationApproval = {
    schemaVersion: "local_room_handoff_publication_approval.v1" as const,
    handoffId,
    reviewHash,
    sourceLocalApprovalId: candidate.source.localContentApprovalId,
    artifactApproval: bundle.approval,
    confirmationMethod: "exact_hash_terminal_input" as const,
    sourceLocalApprovalReused: false as const,
    contentPublicationApproved: true as const,
    deliveryAuthorized: false as const,
    roomMutationAuthorized: false as const,
    localOnly: true as const,
  };
  const receipt = {
    schemaVersion: "local_room_handoff_approval_receipt.v1" as const,
    receiptId: `receipt_${seed}`,
    approvalId: bundle.approval.approvalId,
    handoffId,
    reviewHash,
    candidateSha256: canonicalSha256(candidate),
    draftSha256: candidate.draftSha256,
    artifactApprovalSha256: canonicalSha256(bundle.approval),
    approvalSha256: canonicalSha256(publicationApproval),
    twinRevisionHash: candidate.twinRevisionHash,
    approvedAt: bundle.approval.approvedAt,
    expiresAt: bundle.approval.expiresAt,
    roomMutationCalls: 0 as const,
    networkCalls: 0 as const,
    providerCalls: 0 as const,
    hostBindingCalls: 0 as const,
    publicationCalls: 0 as const,
    sourceLocalApprovalReused: false as const,
    contentPublicationApproved: true as const,
    deliveryAuthorized: false as const,
    roomMutationAuthorized: false as const,
    localOnly: true as const,
  };
  return { candidate, approval: { approval: publicationApproval, receipt } };
}

function projectionLogicalPermit(
  bundle: ReturnType<typeof projectionFixture>,
  input: CoreRoomApiSecureInputV1,
): OfflineProjectionLogicalRehearsalPermitV1 {
  return createOfflineProjectionLogicalRehearsalPermit({
    walkingSliceId: WALKING_SLICE_ID,
    deliveryInput: input,
    approvedHandoff: approvedHandoffFixture(bundle),
  });
}

function openOptions(root: string, encryptionKey?: Uint8Array) {
  return {
    root,
    encryptionKey,
    now: new Date(T0),
    rehearsalEnabled: true as const,
    walkingSliceId: WALKING_SLICE_ID,
    seedEntityId: ENTITY_ID,
  };
}

async function semanticError(
  work: Promise<unknown>,
  code: string,
  status: number,
): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof SemanticError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

async function injectedCrash(work: Promise<unknown>, fault: OfflineRoomRehearsalFault): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof OfflineRoomRehearsalInjectedCrash);
    assert.equal(error.fault, fault);
    return true;
  });
}

function responseInteraction(result: OperationResponse): Record<string, unknown> {
  const interaction = result.body.interaction;
  assert.ok(interaction !== null && typeof interaction === "object" && !Array.isArray(interaction));
  return interaction as Record<string, unknown>;
}

test("offline Room rehearsal walks one admitted public knock, survives lost responses, and stores no plaintext Guest material", async () => {
  const temporary = temporaryRoot("offline-room-story");
  const root = join(temporary, "journal");
  const key = Buffer.alloc(32, 67);
  const bundle = projectionFixture("offline-room-walking-story");
  const preAdmissionSecret = secret(11);
  const encounterSecret = secret(12);
  const replySecret = secret(13);
  const deleteSecret = secret(14);
  try {
    let rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
    const projectionDeliveryInput = deliveryInput(bundle, "10101010101010101010101010101010");
    const projectionPermit = projectionLogicalPermit(bundle, projectionDeliveryInput);
    const callsBeforeMissingPermit = rehearsal.effectCounters().inProcessCoreCalls;
    await assert.rejects(
      rehearsal.mutate("room_operator.projection.deliver", projectionDeliveryInput),
      /OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_REQUIRED/u,
    );
    assert.equal(rehearsal.effectCounters().inProcessCoreCalls, callsBeforeMissingPermit);
    await rehearsal.mutate(
      "room_operator.projection.deliver",
      projectionDeliveryInput,
      { projectionLogicalRehearsalPermit: projectionPermit },
    );
    assert.equal(projectionPermit.authorityMeaning, "logical_rehearsal_only_not_owner_or_delivery_authority");
    assert.equal(projectionPermit.maximumDistinctLogicalExecutions, 1);
    assert.equal(rehearsal.journalSummary().distinctProjectionLogicalExecutions, 1);
    assert.equal(
      rehearsal.journalSummary().entries[0]?.projectionLogicalRehearsalPermitId,
      projectionPermit.permitId,
    );
    const secondBundle = projectionFixture("offline-room-second-delivery-must-not-run");
    const secondDeliveryBase = deliveryInput(secondBundle, "11111111111111111111111111111111");
    const secondDeliveryInput: CoreRoomApiSecureInputV1 = {
      ...secondDeliveryBase,
      capability: { ...secondDeliveryBase.capability, expectedVersion: 2 },
    };
    const callsBeforeSecondDelivery = rehearsal.effectCounters().inProcessCoreCalls;
    await assert.rejects(rehearsal.mutate(
      "room_operator.projection.deliver",
      secondDeliveryInput,
      { projectionLogicalRehearsalPermit: projectionLogicalPermit(secondBundle, secondDeliveryInput) },
    ), /OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_CONSUMED/u);
    assert.equal(rehearsal.effectCounters().inProcessCoreCalls, callsBeforeSecondDelivery);

    const direct = await rehearsal.read("projection.read", secureInput({
      params: { projectionId: bundle.projection.projectionId },
    }));
    const directView = direct.body.view as { lifecycle: { curationState: string } };
    assert.equal(directView.lifecycle.curationState, "not_admitted", "exact URL remains readable before curation");
    const hiddenList = await rehearsal.read("third_place.list", secureInput());
    assert.deepEqual(hiddenList.body.residents, [], "not_admitted successor is absent from discovery");

    await semanticError(rehearsal.mutate("public_encounter.issue", secureInput({
      params: { projectionId: bundle.projection.projectionId },
      request: { encounterSecret: preAdmissionSecret },
      idempotencyKey: "20202020202020202020202020202020",
      expectedVersion: 1,
      clientBucket: "offline-room-pre-admission",
    })), "projection_not_publicly_eligible", 410);

    await rehearsal.mutate("curation.admit", secureInput({
      params: { projectionId: bundle.projection.projectionId },
      actor: "curator",
      idempotencyKey: "30303030303030303030303030303030",
      expectedVersion: 1,
    }));
    const admittedList = await rehearsal.read("third_place.list", secureInput());
    const residents = admittedList.body.residents as Array<{ view: { projection: { projectionId: string } } }>;
    assert.equal(residents.length, 1);
    assert.equal(residents[0]?.view.projection.projectionId, bundle.projection.projectionId);

    const encounterInput = secureInput({
      params: { projectionId: bundle.projection.projectionId },
      request: { encounterSecret },
      idempotencyKey: "40404040404040404040404040404040",
      expectedVersion: 2,
      clientBucket: "offline-room-admitted",
    });
    const issued = await rehearsal.mutate("public_encounter.issue", encounterInput);
    const encounter = issued.body.encounter as { issuedAt: string; expiresAt: string };
    assert.equal(Date.parse(encounter.expiresAt) - Date.parse(encounter.issuedAt), 24 * 60 * 60 * 1_000);

    const interactionInput = secureInput({
      request: {
        projectionId: bundle.projection.projectionId,
        interactionType: "ask",
        consent: "manual_owner_only",
        requestBody: GUEST_CANARY,
        replySecret,
        deleteSecret,
        guestCapsule: null,
      },
      bearer: encounterSecret,
      idempotencyKey: "50505050505050505050505050505050",
    });
    await injectedCrash(
      rehearsal.mutate("interaction.create", interactionInput, { faultAt: "after-call-before-commit" }),
      "after-call-before-commit",
    );

    rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
    const recovered = await rehearsal.mutate("interaction.create", interactionInput);
    assert.deepEqual(await rehearsal.mutate("interaction.create", interactionInput), recovered);
    const interactionId = recovered.body.interactionId as string;
    assert.equal(typeof interactionId, "string");
    assert.equal(
      rehearsal.journalSummary().entries.filter((entry) =>
        entry.action === "interaction.create" && entry.state === "committed").length,
      1,
      "lost-response recovery accepts exactly one Interaction",
    );

    await semanticError(rehearsal.mutate("interaction.create", secureInput({
      request: { ...interactionInput.request, requestBody: "changed same-key request" },
      bearer: encounterSecret,
      idempotencyKey: "50505050505050505050505050505050",
    })), "idempotency_conflict", 409);
    await semanticError(rehearsal.mutate("interaction.create", secureInput({
      request: {
        ...interactionInput.request,
        requestBody: "A second use must not create another Interaction.",
        replySecret: secret(15),
        deleteSecret: secret(16),
      },
      bearer: encounterSecret,
      idempotencyKey: "60606060606060606060606060606060",
    })), "encounter_consumed", 409);

    await assert.rejects(
      rehearsal.mutate("projection.revoke", secureInput()),
      /OFFLINE_ROOM_REHEARSAL_MUTATION_NOT_ALLOWED/u,
      "revocation/stale state mutation remains outside this walking-slice adapter",
    );

    rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
    const pullInput = secureInput({
      params: { interactionId },
      bearer: SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
      actor: "room_operator",
      idempotencyKey: "70707070707070707070707070707070",
      expectedVersion: 1,
    });
    await injectedCrash(
      rehearsal.mutate("room_operator.pull", pullInput, { faultAt: "after-commit" }),
      "after-commit",
    );
    rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
    const pulled = await rehearsal.mutate("room_operator.pull", pullInput);
    const exactInteraction = responseInteraction(pulled);
    assert.equal(exactInteraction.requestText, GUEST_CANARY);
    assert.equal(exactInteraction.consent, "manual_owner_only");
    assert.equal(exactInteraction.consentEnvelope, null, "manual-only knock creates no model consent envelope");
    assert.equal(exactInteraction.state, "seen_locally");

    const rawJournal = readFileSync(join(root, OFFLINE_ROOM_REHEARSAL_JOURNAL_FILENAME), "utf8");
    for (const forbidden of [
      GUEST_CANARY,
      SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET,
      preAdmissionSecret,
      encounterSecret,
      replySecret,
      deleteSecret,
    ]) assert.equal(rawJournal.includes(forbidden), false);
    assert.equal(rawJournal.includes('"storageClass":"aes_256_gcm"'), true);
    assert.equal(rawJournal.includes('"storageClass":"canonical_public"'), true);
    assert.equal(rehearsal.journalSummary().seedEntityId, ENTITY_ID);
    assert.equal(rehearsal.journalSummary().walkingSliceId, WALKING_SLICE_ID);

    const effects = rehearsal.effectCounters();
    assert.deepEqual({
      networkCalls: effects.networkCalls,
      modelCalls: effects.modelCalls,
      providerCalls: effects.providerCalls,
      externalPublicationCalls: effects.externalPublicationCalls,
    }, {
      networkCalls: 0,
      modelCalls: 0,
      providerCalls: 0,
      externalPublicationCalls: 0,
    });
    assert.equal(effects.inProcessCoreCalls > 0, true);
  } finally {
    removeRoot(temporary);
  }
});

test("pending-before-call, after-call-before-commit, and after-commit each reconcile to one ordered mutation", async (t) => {
  for (const [index, fault] of ([
    "pending-before-call",
    "after-call-before-commit",
    "after-commit",
  ] as const).entries()) {
    await t.test(fault, async () => {
      const temporary = temporaryRoot(`offline-room-${fault}`);
      const root = join(temporary, "journal");
      const key = Buffer.alloc(32, 80 + index);
      const bundle = projectionFixture(`offline-room-crash-${fault}`);
      const input = deliveryInput(bundle, `${index + 8}`.repeat(32));
      try {
        let rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
        await injectedCrash(rehearsal.mutate(
          "room_operator.projection.deliver",
          input,
          { faultAt: fault, projectionLogicalRehearsalPermit: projectionLogicalPermit(bundle, input) },
        ), fault);
        rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
        const recovered = await rehearsal.mutate("room_operator.projection.deliver", input, {
          projectionLogicalRehearsalPermit: projectionLogicalPermit(bundle, input),
        });
        assert.equal((recovered.body.projection as { projectionId: string }).projectionId, bundle.projection.projectionId);
        assert.deepEqual(rehearsal.journalSummary().entries.map((entry) => [
          entry.ordinal,
          entry.action,
          entry.state,
        ]), [[1, "room_operator.projection.deliver", "committed"]]);
        assert.equal(rehearsal.journalSummary().distinctProjectionLogicalExecutions, 1);
        const direct = await rehearsal.read("projection.read", secureInput({
          params: { projectionId: bundle.projection.projectionId },
        }));
        assert.equal((direct.body.view as { projection: { projectionId: string } }).projection.projectionId, bundle.projection.projectionId);
      } finally {
        removeRoot(temporary);
      }
    });
  }
});

test("two instances cannot both mutate one journal and the stale instance fails before another Core call", async () => {
  const temporary = temporaryRoot("offline-room-two-instances");
  const root = join(temporary, "journal");
  const key = Buffer.alloc(32, 88);
  const bundle = projectionFixture("offline-room-two-instances");
  try {
    const setup = await OfflineRoomRehearsal.open(openOptions(root, key));
    const delivery = deliveryInput(bundle, "81818181818181818181818181818181");
    await setup.mutate("room_operator.projection.deliver", delivery, {
      projectionLogicalRehearsalPermit: projectionLogicalPermit(bundle, delivery),
    });
    await setup.mutate("curation.admit", secureInput({
      params: { projectionId: bundle.projection.projectionId },
      actor: "curator",
      idempotencyKey: "82828282828282828282828282828282",
      expectedVersion: 1,
    }));

    const first = await OfflineRoomRehearsal.open(openOptions(root, key));
    const second = await OfflineRoomRehearsal.open(openOptions(root, key));
    const firstInput = secureInput({
      params: { projectionId: bundle.projection.projectionId },
      request: { encounterSecret: secret(31) },
      idempotencyKey: "83838383838383838383838383838383",
      expectedVersion: 2,
      clientBucket: "offline-room-concurrent-first",
    });
    const secondInput = secureInput({
      params: { projectionId: bundle.projection.projectionId },
      request: { encounterSecret: secret(32) },
      idempotencyKey: "84848484848484848484848484848484",
      expectedVersion: 2,
      clientBucket: "offline-room-concurrent-second",
    });
    const outcomes = await Promise.allSettled([
      first.mutate("public_encounter.issue", firstInput),
      second.mutate("public_encounter.issue", secondInput),
    ]);
    assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter((outcome) => outcome.status === "rejected").length, 1);

    const stale = outcomes[0]?.status === "rejected" ? first : second;
    const staleInput = stale === first ? firstInput : secondInput;
    const callsBeforeStaleRetry = stale.effectCounters().inProcessCoreCalls;
    await assert.rejects(
      stale.mutate("public_encounter.issue", staleInput),
      /OFFLINE_ROOM_REHEARSAL_STALE_INSTANCE/u,
    );
    assert.equal(stale.effectCounters().inProcessCoreCalls, callsBeforeStaleRetry);

    const recovered = await OfflineRoomRehearsal.open(openOptions(root, key));
    const summary = recovered.journalSummary();
    assert.deepEqual(summary.entries.map((entry) => entry.ordinal), [1, 2, 3]);
    assert.equal(summary.entries.filter((entry) =>
      entry.action === "public_encounter.issue" && entry.state === "committed").length, 1);
  } finally {
    removeRoot(temporary);
  }
});

test("an exact dead-writer identity recovers after real SIGKILL, while a live reused PID is never taken over", async () => {
  const temporary = temporaryRoot("offline-room-hard-exit-writer");
  const root = join(temporary, "journal");
  mkdirSync(root, { mode: 0o700 });
  const lockModule = pathToFileURL(resolve("packages/r4-local/src/lock.ts")).href;
  const childSource = `
    import { ProtectedRoomLock } from ${JSON.stringify(lockModule)};
    const lock = new ProtectedRoomLock({
      root: ${JSON.stringify(join(root, "writer-lock"))},
      bootId: "offline-room-hard-exit-child-instance",
    });
    const lease = lock.acquire(${JSON.stringify(SYNTHETIC_PUBLIC_ROOM_ID)}, "room_reconcile", new Date(${JSON.stringify(T0)}));
    process.stdout.write(JSON.stringify(lease.record) + "\\n");
    await new Promise(() => {});
  `;
  const child = spawn(process.execPath, ["--input-type=module", "--eval", childSource], {
    cwd: resolve("."),
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    assert.ok(child.stdout);
    const [chunk] = await once(child.stdout, "data") as [Buffer];
    const childRecord = JSON.parse(chunk.toString("utf8")) as { processId: number; nonce: string };
    const exited = once(child, "exit");
    assert.equal(child.kill("SIGKILL"), true);
    await exited;

    const recovery = inspectOfflineRoomRehearsalWriterRecovery({ root });
    assert.ok(recovery);
    assert.equal(recovery.processId, childRecord.processId);
    assert.equal(recovery.nonce, childRecord.nonce);
    await assert.rejects(
      OfflineRoomRehearsal.open(openOptions(root, Buffer.alloc(32, 93))),
      /protected Room is busy:dead/u,
    );
    const recovered = await OfflineRoomRehearsal.open({
      ...openOptions(root, Buffer.alloc(32, 93)),
      staleWriterRecovery: recovery,
    });
    assert.equal(recovered.journalSummary().entries.length, 0);
    assert.equal(inspectOfflineRoomRehearsalWriterRecovery({ root }), null);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    removeRoot(temporary);
  }

  const reusedPidTemporary = temporaryRoot("offline-room-reused-live-pid");
  const reusedPidRoot = join(reusedPidTemporary, "journal");
  mkdirSync(reusedPidRoot, { mode: 0o700 });
  const liveLock = new ProtectedRoomLock({
    root: join(reusedPidRoot, "writer-lock"),
    bootId: "offline-room-prior-instance-with-reused-live-pid",
  });
  const liveLease = liveLock.acquire(SYNTHETIC_PUBLIC_ROOM_ID, "room_reconcile", new Date(T0));
  try {
    const recovery = inspectOfflineRoomRehearsalWriterRecovery({ root: reusedPidRoot });
    assert.ok(recovery);
    assert.equal(recovery.processId, process.pid);
    await assert.rejects(OfflineRoomRehearsal.open({
      ...openOptions(reusedPidRoot, Buffer.alloc(32, 94)),
      staleWriterRecovery: recovery,
    }), /protected Room lock recovery denied:live/u);
    assert.deepEqual(inspectOfflineRoomRehearsalWriterRecovery({ root: reusedPidRoot }), recovery);
  } finally {
    liveLease.release();
    removeRoot(reusedPidTemporary);
  }
});

test("a pre-rename journal failure poisons the instance and cannot leak its failed entry into later state", async () => {
  const temporary = temporaryRoot("offline-room-journal-write-failure");
  const root = join(temporary, "journal");
  const key = Buffer.alloc(32, 95);
  const failedInput = secureInput({
    params: { projectionId: "proj_missing00000000000000000000001" },
    actor: "curator",
    idempotencyKey: "95959595959595959595959595959595",
    expectedVersion: 1,
  });
  try {
    const rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
    await injectedCrash(
      rehearsal.mutate("curation.admit", failedInput, { faultAt: "journal-write-before-rename" }),
      "journal-write-before-rename",
    );
    assert.equal(rehearsal.effectCounters().inProcessCoreCalls, 0);
    await assert.rejects(
      rehearsal.mutate("curation.admit", failedInput),
      /OFFLINE_ROOM_REHEARSAL_INSTANCE_POISONED/u,
    );
    assert.throws(
      () => rehearsal.journalSummary(),
      /OFFLINE_ROOM_REHEARSAL_INSTANCE_POISONED/u,
    );

    const reopened = await OfflineRoomRehearsal.open(openOptions(root, key));
    assert.equal(reopened.journalSummary().revision, 0);
    assert.deepEqual(reopened.journalSummary().entries, []);
    assert.equal(reopened.effectCounters().inProcessCoreCalls, 0);
  } finally {
    removeRoot(temporary);
  }
});

test("rehearsal enablement, journal identity, and exact handoff-bound logical permits fail closed", async () => {
  const temporary = temporaryRoot("offline-room-explicit-gates");
  const root = join(temporary, "journal");
  const key = Buffer.alloc(32, 89);
  try {
    await assert.rejects(
      OfflineRoomRehearsal.open({ ...openOptions(root, key), rehearsalEnabled: false as true }),
      /OFFLINE_ROOM_REHEARSAL_EXPLICIT_ENABLE_REQUIRED/u,
    );
    const rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
    const bundle = projectionFixture("offline-room-explicit-gates");
    const delivery = deliveryInput(bundle, "85858585858585858585858585858585");
    const permit = projectionLogicalPermit(bundle, delivery);
    const curation = secureInput({
      params: { projectionId: bundle.projection.projectionId },
      actor: "curator",
      idempotencyKey: "86868686868686868686868686868686",
      expectedVersion: 1,
    });
    await assert.rejects(
      rehearsal.mutate("curation.admit", curation, { projectionLogicalRehearsalPermit: permit }),
      /OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_NOT_APPLICABLE/u,
    );
    await assert.rejects(
      rehearsal.mutate("room_operator.projection.deliver", delivery, {
        projectionLogicalRehearsalPermit: { ...permit, exactRequestHash: canonicalSha256("wrong exact request") },
      }),
      /OFFLINE_ROOM_REHEARSAL_PROJECTION_LOGICAL_PERMIT_INVALID/u,
    );
    const exactRequestHash = canonicalSha256({ action: "room_operator.projection.deliver", input: delivery });
    await assert.rejects(
      rehearsal.mutate("room_operator.projection.deliver", delivery, {
        projectionExecutionGrant: {
          schemaVersion: "offline_projection_execution_grant.v1",
          grantId: `grant_${exactRequestHash.slice(7, 39)}`,
          walkingSliceId: WALKING_SLICE_ID,
          exactRequestHash,
          rehearsalOnly: true,
          syntheticInProcessOnly: true,
          externalPublicationAllowed: false,
          maximumExecutions: 1,
        },
      } as unknown as Parameters<OfflineRoomRehearsal["mutate"]>[2]),
      /OFFLINE_ROOM_REHEARSAL_LEGACY_PROJECTION_EXECUTION_GRANT_REJECTED/u,
    );
    const approvedHandoff = approvedHandoffFixture(bundle);
    assert.throws(() => createOfflineProjectionLogicalRehearsalPermit({
      walkingSliceId: WALKING_SLICE_ID,
      deliveryInput: delivery,
      approvedHandoff: {
        ...approvedHandoff,
        approval: {
          ...approvedHandoff.approval,
          receipt: {
            ...approvedHandoff.approval.receipt,
            candidateSha256: canonicalSha256("not the approved handoff candidate"),
          },
        },
      },
    }), /OFFLINE_ROOM_REHEARSAL_APPROVED_HANDOFF_INVALID/u);
    assert.equal(rehearsal.effectCounters().inProcessCoreCalls, 0);

    await assert.rejects(
      OfflineRoomRehearsal.open({
        ...openOptions(root, key),
        seedEntityId: "entity_differentseed000000000000000001",
      }),
      /OFFLINE_ROOM_REHEARSAL_JOURNAL_INVALID/u,
    );
    await assert.rejects(
      OfflineRoomRehearsal.open({
        ...openOptions(root, key),
        walkingSliceId: "slice_different_walking_rehearsal_0001",
      }),
      /OFFLINE_ROOM_REHEARSAL_JOURNAL_INVALID/u,
    );
  } finally {
    removeRoot(temporary);
  }
});

test("encrypted journal fails closed with no key, a wrong key, or tampered ciphertext", async () => {
  const temporary = temporaryRoot("offline-room-integrity");
  const root = join(temporary, "journal");
  const key = Buffer.alloc(32, 91);
  const bundle = projectionFixture("offline-room-integrity");
  try {
    const rehearsal = await OfflineRoomRehearsal.open(openOptions(root, key));
    const input = deliveryInput(bundle, "99999999999999999999999999999999");
    await injectedCrash(rehearsal.mutate(
      "room_operator.projection.deliver",
      input,
      { faultAt: "pending-before-call", projectionLogicalRehearsalPermit: projectionLogicalPermit(bundle, input) },
    ), "pending-before-call");
    const journalPath = join(root, OFFLINE_ROOM_REHEARSAL_JOURNAL_FILENAME);
    const raw = readFileSync(journalPath, "utf8");
    assert.equal(raw.includes(SYNTHETIC_PUBLIC_ROOM_OPERATOR_SECRET), false);

    await assert.rejects(
      OfflineRoomRehearsal.open(openOptions(root)),
      /OFFLINE_ROOM_REHEARSAL_KEY_REQUIRED/u,
    );
    await assert.rejects(
      OfflineRoomRehearsal.open(openOptions(root, Buffer.alloc(32, 92))),
      /OFFLINE_ROOM_REHEARSAL_JOURNAL_INVALID/u,
    );

    const document = JSON.parse(raw) as {
      entries: Array<{ payload: { storageClass: string; ciphertext: string } }>;
    };
    const payload = document.entries[0]?.payload;
    assert.equal(payload?.storageClass, "aes_256_gcm");
    assert.ok(payload);
    payload.ciphertext = `${payload.ciphertext.startsWith("A") ? "B" : "A"}${payload.ciphertext.slice(1)}`;
    writeFileSync(journalPath, `${canonicalJson(document)}\n`, "utf8");
    await assert.rejects(
      OfflineRoomRehearsal.open(openOptions(root, key)),
      /OFFLINE_ROOM_REHEARSAL_JOURNAL_INVALID/u,
    );
  } finally {
    removeRoot(temporary);
  }
});
