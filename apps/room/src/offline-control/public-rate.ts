import type { HostedPresenceStore } from "../store.ts";

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

interface RateEvent {
  readonly schemaVersion: "synthetic_public_rate_event.v1";
  readonly roomId: string;
  readonly bucketDigest: `sha256:${string}`;
  readonly eventId: string;
  readonly committedAt: string;
}

export class SyntheticPublicRateError extends Error {
  readonly code: "public_encounter_hourly_limited" | "public_encounter_daily_limited" | "public_accept_daily_limited";

  constructor(code: SyntheticPublicRateError["code"]) {
    super(code);
    this.code = code;
  }
}

function records(store: HostedPresenceStore, prefix: string): RateEvent[] {
  return store.auxiliaryEntries(prefix).map(([, value]) => value as unknown as RateEvent);
}

/**
 * Gate A persistence analogue for the Packet's coarse edge-client buckets.
 * Only a keyed digest of the synthetic bucket is retained; no IP, User-Agent,
 * account, or cross-Room identity is created.
 */
export class SyntheticPublicRateControl {
  readonly #store: HostedPresenceStore;

  constructor(store: HostedPresenceStore) {
    this.#store = store;
  }

  bucketDigest(roomId: string, clientBucket: string): `sha256:${string}` {
    if (!/^room_[A-Za-z0-9_-]{16,128}$/u.test(roomId)) throw new TypeError("invalid Room rate scope");
    if (!/^[A-Za-z0-9._:-]{1,128}$/u.test(clientBucket)) throw new TypeError("invalid synthetic client bucket");
    return this.#store.digestSecret(`public-rate-bucket:${roomId}:${clientBucket}`);
  }

  assertEncounterIssue(roomId: string, clientBucket: string, now: string): void {
    const bucketDigest = this.bucketDigest(roomId, clientBucket);
    const all = records(this.#store, `public_rate:encounter:${roomId}:`)
      .filter((event) => event.bucketDigest === bucketDigest);
    const nowMs = Date.parse(now);
    if (all.filter((event) => Date.parse(event.committedAt) > nowMs - HOUR_MS).length >= 10) {
      throw new SyntheticPublicRateError("public_encounter_hourly_limited");
    }
    if (all.filter((event) => Date.parse(event.committedAt) > nowMs - DAY_MS).length >= 50) {
      throw new SyntheticPublicRateError("public_encounter_daily_limited");
    }
  }

  recordEncounterIssue(roomId: string, encounterId: string, clientBucket: string, now: string): void {
    const bucketDigest = this.bucketDigest(roomId, clientBucket);
    this.#store.saveAuxiliary(`public_rate:encounter:${roomId}:${encounterId}`, {
      schemaVersion: "synthetic_public_rate_event.v1",
      roomId,
      bucketDigest,
      eventId: encounterId,
      committedAt: now,
    });
    this.#store.saveAuxiliary(`public_rate:encounter_bucket:${encounterId}`, {
      schemaVersion: "synthetic_public_encounter_bucket.v1",
      roomId,
      bucketDigest,
    });
  }

  assertPublicAccept(roomId: string, encounterId: string, now: string): void {
    const source = this.#store.auxiliary(`public_rate:encounter_bucket:${encounterId}`);
    const bucketDigest = source?.bucketDigest;
    if (source?.roomId !== roomId || typeof bucketDigest !== "string") {
      throw new TypeError("public encounter rate bucket is unavailable");
    }
    const nowMs = Date.parse(now);
    const count = records(this.#store, `public_rate:accepted:${roomId}:`)
      .filter((event) => event.bucketDigest === bucketDigest && Date.parse(event.committedAt) > nowMs - DAY_MS)
      .length;
    if (count >= 3) throw new SyntheticPublicRateError("public_accept_daily_limited");
  }

  recordPublicAccept(roomId: string, encounterId: string, interactionId: string, now: string): void {
    const source = this.#store.auxiliary(`public_rate:encounter_bucket:${encounterId}`);
    const bucketDigest = source?.bucketDigest;
    if (source?.roomId !== roomId || typeof bucketDigest !== "string") {
      throw new TypeError("public encounter rate bucket is unavailable");
    }
    this.#store.saveAuxiliary(`public_rate:accepted:${roomId}:${interactionId}`, {
      schemaVersion: "synthetic_public_rate_event.v1",
      roomId,
      bucketDigest,
      eventId: interactionId,
      committedAt: now,
    });
  }
}
