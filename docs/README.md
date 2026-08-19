# Documentation map

Forme documentation has three layers. Keep them separate so that chronology
does not become operating context.

## 1. Default working set

Start with [CONTEXT.md](./CONTEXT.md). For ordinary re-entry it routes to:

- [PRODUCT.md](./PRODUCT.md) for durable product meaning;
- [CONTROL.md](./CONTROL.md) for the current gate and next acceptance point;
- [ROADMAP.md](./ROADMAP.md) for stable dependency order;
- the active GitHub issue and pull request for live execution state.

## 2. Conditional contracts

Open only the contract relevant to the work:

- [ARCHITECTURE.md](./ARCHITECTURE.md) — durable system boundaries;
- [AGENCY-TRUST.md](./AGENCY-TRUST.md) — privacy-first human boundary;
- [NATIVE-HARNESS-ARCHITECTURE.md](./NATIVE-HARNESS-ARCHITECTURE.md) —
  Harness/Forme carrier and native session boundaries;
- [R4-SOCIAL-PRESENCE.md](./R4-SOCIAL-PRESENCE.md) — Room, Projection, Guest
  and Response semantics;
- [R4-HERO-ENCOUNTER-DECISION-BRIEF.md](./R4-HERO-ENCOUNTER-DECISION-BRIEF.md)
  — Owner-approved Hybrid encounter and Demo-critical cut;
- [STEWARDSHIP.md](./STEWARDSHIP.md) — proposal, not current authority.

[DECISIONS.md](./DECISIONS.md) is the compact register of active durable
decisions. [VALIDATION.md](./VALIDATION.md) is the compact product truth and
falsification register.

## 3. Historical and byte-frozen material

Gate packets, reviews, reports, manifests and machine-readable evidence
preserve lineage and may also be implementation fixtures. They are not entry
points and should not be read or edited merely because they are present.

[HISTORY.md](./HISTORY.md) explains the archive tags, frozen-fixture boundary
and how to investigate chronology without loading it into ordinary work.

## Maintenance rule

One fact gets one canonical home:

- live status: active issue/PR and the short cockpit;
- durable meaning: Product or a named architecture/trust contract;
- durable decision: Decisions;
- present product evidence and falsification: Validation;
- chronology and exact historical bytes: Git history, archive tags, issue/PR
  comments and frozen evidence.

All relative links in the default and conditional sets must resolve.
