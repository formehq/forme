import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  CandidateRoomEventLifecycle,
  coordinatorForRoomLock,
  createCandidateOwnerReviewPort,
  ExplicitRoomSync,
  FakeRoomSyncPort,
  FileBodyFreeLedgerStore,
  FileCandidateStore,
  ProtectedRoomLock,
  SyntheticUserPresenceKeyProtector,
  type RoomEventLifecycle,
  type ProtectedRoomMutationCoordinator,
} from "../../packages/r4-local/src/index.ts";
import {
  candidate,
  INTERACTION_ID,
  ledger,
  NOW,
  PROJECTION_ID,
  removeRoot,
  ROOM_ID,
  roomEvent,
  temporaryRoot,
} from "./helpers.ts";

function terminalHarness(): {
  base: string;
  ledgerStore: FileBodyFreeLedgerStore;
  candidateStore: FileCandidateStore;
  port: FakeRoomSyncPort;
  lock: ProtectedRoomLock;
  coordinator: ProtectedRoomMutationCoordinator;
} {
  const base = temporaryRoot("terminal-event-sync");
  const workspace = join(base, "workspace");
  mkdirSync(workspace, { recursive: true });
  const lock = new ProtectedRoomLock({ root: join(base, "locks"), bootId: "boot-terminal" });
  const coordinator = coordinatorForRoomLock(lock);
  const candidateStore = new FileCandidateStore({
    root: join(base, "protected-candidates"),
    workspaceRoot: workspace,
    protector: new SyntheticUserPresenceKeyProtector({
      presenceProof: "owner-is-present",
      wrappingKey: Buffer.alloc(32, 9),
    }),
    coordinator,
  });
  const ledgerStore = new FileBodyFreeLedgerStore(join(base, "ledger"));
  ledgerStore.create(ledger());
  return {
    base,
    ledgerStore,
    candidateStore,
    port: new FakeRoomSyncPort(ROOM_ID),
    lock,
    coordinator,
  };
}

test("terminal event cleanup is deny-first and pending-ACK restart finishes cleanup before ACK", async () => {
  const fixture = terminalHarness();
  try {
    await fixture.candidateStore.put(candidate());
    fixture.port.append(roomEvent(1, {
      objectId: INTERACTION_ID,
      eventType: "interaction.closed_without_response",
      bodyAvailable: false,
    }));

    const crashingLifecycle: RoomEventLifecycle = {
      async apply(_event, _now, context): Promise<void> {
        await fixture.candidateStore.cleanup(
          "candidate_synthetic00000001",
          "interaction_terminal",
          NOW,
          "after_deny",
          context,
        );
      },
    };
    const first = new ExplicitRoomSync({
      store: fixture.ledgerStore,
      lock: fixture.lock,
      port: fixture.port,
      lifecycle: crashingLifecycle,
      coordinator: fixture.coordinator,
    });
    await assert.rejects(first.sync(ROOM_ID, { now: () => NOW }), /candidate cleanup interruption/u);
    const interrupted = fixture.ledgerStore.read(ROOM_ID);
    assert.equal(interrupted.cursor, 0);
    assert.equal(interrupted.events.length, 1, "event persisted before lifecycle/ACK");
    assert.equal(interrupted.ackOutbox.length, 1);
    assert.equal(fixture.port.ackCount, 0);
    assert.equal(fixture.candidateStore.hasCleanupJournal("candidate_synthetic00000001"), true);
    await assert.rejects(
      createCandidateOwnerReviewPort({ store: fixture.candidateStore, confirmUserPresence: () => "owner-is-present" }).read({
        candidateId: "candidate_synthetic00000001", now: NOW,
      }),
      /candidate_unavailable/u,
    );

    const restarted = new ExplicitRoomSync({
      store: fixture.ledgerStore,
      lock: fixture.lock,
      port: fixture.port,
      lifecycle: new CandidateRoomEventLifecycle(fixture.candidateStore),
      coordinator: fixture.coordinator,
    });
    const recovered = await restarted.sync(ROOM_ID, { now: () => new Date(NOW.getTime() + 1_000) });
    assert.equal(recovered.cursor, 1);
    assert.equal(recovered.ackOutbox.length, 0);
    assert.equal(fixture.port.ackCount, 1);
    assert.equal(fixture.candidateStore.hasCleanupJournal("candidate_synthetic00000001"), false);
    assert.equal(fixture.candidateStore.hasCiphertext("candidate_synthetic00000001"), false);
    assert.equal(fixture.candidateStore.hasCleanupReceipt("candidate_synthetic00000001"), true);
    await assert.rejects(
      createCandidateOwnerReviewPort({ store: fixture.candidateStore, confirmUserPresence: () => "owner-is-present" }).read({
        candidateId: "candidate_synthetic00000001", now: NOW,
      }),
      /candidate_unavailable/u,
    );
    await assert.rejects(fixture.candidateStore.put(candidate()), /already exists or is denied/u);
    assert.doesNotMatch(
      readFileSync(join(fixture.base, "ledger", `${ROOM_ID}.json`), "utf8"),
      /Synthetic candidate body|responseText|requestText|sourcePath/u,
    );
  } finally {
    removeRoot(fixture.base);
  }
});

test("projection, room, and exact response-candidate events clean only matching encrypted candidates", async () => {
  for (const scenario of [
    {
      name: "projection revoked",
      event: roomEvent(1, { objectType: "projection", objectId: PROJECTION_ID, eventType: "projection.revoked", bodyAvailable: false }),
    },
    {
      name: "room retired",
      event: roomEvent(1, { objectType: "room", objectId: ROOM_ID, eventType: "room.retired", bodyAvailable: false }),
    },
    {
      name: "response published candidate hash",
      event: roomEvent(1, {
        objectType: "response",
        objectId: "response_synthetic00000001",
        eventType: "response.published",
        payloadHash: candidate().candidateHash,
        bodyAvailable: true,
      }),
    },
  ]) {
    await test(scenario.name, async () => {
      const fixture = terminalHarness();
      try {
        await fixture.candidateStore.put(candidate());
        fixture.port.append(scenario.event);
        const sync = new ExplicitRoomSync({
          store: fixture.ledgerStore,
          lock: fixture.lock,
          port: fixture.port,
          lifecycle: new CandidateRoomEventLifecycle(fixture.candidateStore),
          coordinator: fixture.coordinator,
        });
        await sync.sync(ROOM_ID, { now: () => NOW });
        assert.equal(fixture.candidateStore.hasCiphertext("candidate_synthetic00000001"), false);
        assert.equal(fixture.candidateStore.hasCleanupReceipt("candidate_synthetic00000001"), true);
      } finally {
        removeRoot(fixture.base);
      }
    });
  }
});
