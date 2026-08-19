# Owner technical cockpit

## Product delta

0 Product Progress from the context-distillation and clean-restart work. They
change how the project is understood, integrated and managed; they do not add
a Guest or Owner capability.

R1 Continuity, R2 Cognition and R3 Bounded Agency are accepted. R4 Controlled
Presence remains open in
[Issue #67](https://github.com/formehq/forme/issues/67).

## Next user-visible acceptance point

One bounded synthetic Guest journey must work through the real local product
path, followed by one Owner-experienced encounter:

1. the Owner publishes a bounded Projection;
2. a Guest can discover it and knock;
3. Forme admits or declines under the approved policy;
4. the Guest submits a response without server-side AI;
5. the Owner sees the result through the Native Harness boundary;
6. the Owner judges whether the encounter feels like Forme.

Repository integration and infrastructure proof are prerequisites, not this
acceptance point.

## Current blocker and next action

The Durable Public Core and PostgreSQL path have repository and disposable
local proof, but their 72-commit integration remains outside `main` in Draft
PR #78. The immediate engineering action is a focused review of the
authorization, no-server-AI, runtime-mode, PostgreSQL migration/rollback and
cleanup boundaries on the exact Green tip. If that baseline is accepted, it
may be integrated without closing #67 or claiming product acceptance.

After integration, resume #67 under one outcome envelope for the complete
synthetic Room/knock flow. Do not return to cache-chasing, server inventory or
standalone Enabler work unless that flow exposes a concrete blocker.

## Current evidence

- the local Room and product runner are reviewable;
- the Durable Public Core and PostgreSQL adapter have static and synthetic
  contract coverage;
- one disposable PostgreSQL lifecycle proved schema, persistence across
  restart, rollback and owned-resource cleanup;
- consolidated integration is represented by Draft PR
  [#78](https://github.com/formehq/forme/pull/78);
- the preceding PR tip passed remote CI; the clean-restart tip has full local
  proof and requires a fresh exact-tip remote run before integration;
- no live server inventory, isolated staging run or Owner-experienced Guest
  encounter has been completed.

Local Green does not imply remote CI, merge, production readiness or Owner
acceptance.

## Current engineering envelope

The clean restart may include repository edits, tests, refactors, local
synthetic development, loopback-only disposable infrastructure with exact
owned cleanup, local commits and updates to the existing integration pull
request. These actions proceed without per-file, per-hash or per-attempt
approval.

It does not authorize production or private server access, public traffic,
real/private Guest data, provider/model calls, credentials, spend, deployment,
publication, external messaging, merge or Gate C.

The fixed-marker R3 action block in the root README remains separately
controlled.

## Live truth and return conditions

Use the active issue and pull request for live execution state. This cockpit
holds only the current product position and must be replaced in place when it
changes.

Return control to the Owner when work would change product meaning, authorship
or a trust boundary; use a real external effect; require a destructive or
meaning-changing migration; proceed after ambiguous effects or unproved
cleanup; materially change the promised outcome; merge; or request Owner
Experience Acceptance. Ordinary reversible engineering inside the current
envelope does not require another stop.

For the default read set and history boundary, see
[CONTEXT.md](./CONTEXT.md).
