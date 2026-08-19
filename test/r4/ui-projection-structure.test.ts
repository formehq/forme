import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderProjectionArticle } from "../../apps/room/src/projection-page.ts";
import {
  GOLDEN_PROJECTION,
  GOLDEN_PROJECTION_LIFECYCLE,
  type ProjectionCapsuleV1,
  type ProjectionLifecycleV1,
} from "../../packages/r4-protocol/src/index.ts";

const GuestAsk = () => createElement("div", { "data-testid": "guest-ask" }, "Guest ask");

function richProjection(): ProjectionCapsuleV1 {
  return {
    ...GOLDEN_PROJECTION,
    claims: [
      { slot: "becoming", text: "Becoming first.", attribution: "owner_confirmed", uncertainty: null },
      { slot: "now", text: "Now first.", attribution: "owner_confirmed", uncertainty: null },
      { slot: "becoming", text: "Becoming second.", attribution: "owner_confirmed", uncertainty: null },
      { slot: "nextMove", text: "Next move first.", attribution: "inferred_allowed", uncertainty: "Owner review is still required." },
      { slot: "tensions", text: "Tension first.", attribution: "unresolved_allowed", uncertainty: null },
      { slot: "openTo", text: "Open to first.", attribution: "owner_confirmed", uncertainty: null },
      { slot: "now", text: "Now second.", attribution: "owner_confirmed", uncertainty: null },
    ],
    supportedInteractions: ["ask", "resonance"],
    expectedResponseLatency: "Asynchronous and Owner-reviewed.",
    allowedTopics: ["Forme vision", "controlled project presence"],
    unavailableTopics: ["private Twin sources", "Owner commitments"],
    agencyStatement: "This Projection can describe the project, but it cannot act for the Owner.",
    nonCommitmentStatement: "A question creates no promise, publication authority, or private access.",
  };
}

function render(
  projection: ProjectionCapsuleV1 = richProjection(),
  lifecycle: ProjectionLifecycleV1 = GOLDEN_PROJECTION_LIFECYCLE,
  warning: "stale_projection" | null = null,
): string {
  return renderToStaticMarkup(renderProjectionArticle({ projection, lifecycle, warning }, GuestAsk));
}

function assertOrdered(haystack: string, needles: readonly string[]): void {
  let cursor = -1;
  for (const needle of needles) {
    const next = haystack.indexOf(needle, cursor + 1);
    assert.notEqual(next, -1, `missing rendered text: ${needle}`);
    assert.equal(next > cursor, true, `rendered text is out of order: ${needle}`);
    cursor = next;
  }
}

test("#67 public Projection groups rich multi-claim copy in the approved visitor order", () => {
  const html = render();

  assertOrdered(html, [
    "Vision &amp; Becoming",
    "Becoming first.",
    "Becoming second.",
    ">Now<",
    "Now first.",
    "Now second.",
    "Next Move",
    "Next move first.",
    "Tensions",
    "Tension first.",
    "Open To",
    "Open to first.",
    ">Boundary<",
  ]);
  assert.match(html, /What remains uncertain: Owner review is still required\./u);

  for (const label of [
    "Supported interactions",
    "Expected response latency",
    "Allowed topics",
    "Unavailable topics",
    "What this Projection can do",
    "What this does not commit",
    "Freshness and expiry",
    "Fresh until",
    "Expires at",
  ]) assert.match(html, new RegExp(label, "u"));

  for (const value of [
    "ask",
    "resonance",
    "Asynchronous and Owner-reviewed.",
    "Forme vision",
    "controlled project presence",
    "private Twin sources",
    "Owner commitments",
    "This Projection can describe the project, but it cannot act for the Owner.",
    "A question creates no promise, publication authority, or private access.",
    GOLDEN_PROJECTION.freshUntil,
    GOLDEN_PROJECTION.expiresAt,
  ]) assert.equal(html.includes(value), true, `missing boundary value: ${value}`);

  assert.match(html, /data-testid="guest-ask"/u);
});

test("#67 stale direct reads retain the public Projection and warning but never render GuestAsk", () => {
  const html = render(richProjection(), {
    ...GOLDEN_PROJECTION_LIFECYCLE,
    ownerState: "stale",
    curationState: "admitted",
  }, "stale_projection");

  assert.match(html, /stale_projection/u);
  assert.match(html, /Becoming first\./u);
  assert.match(html, />Boundary</u);
  assert.doesNotMatch(html, /data-testid="guest-ask"/u);
});

test("#67 a fresh but not-admitted direct read remains visible without GuestAsk", () => {
  const html = render(richProjection(), {
    ...GOLDEN_PROJECTION_LIFECYCLE,
    ownerState: "published_fresh",
    curationState: "not_admitted",
  });

  assert.match(html, /Becoming first\./u);
  assert.doesNotMatch(html, /data-testid="guest-ask"/u);
});

test("#67 public rendering leaves unsafe text escaped and never exposes private basis fields", () => {
  const privateBasisCanary = "PRIVATE_SOURCE_REFERENCE_MUST_NOT_RENDER";
  const unsafeText = '<script data-private="yes">alert("escaped")</script>';
  const projection = {
    ...richProjection(),
    title: unsafeText,
    claims: [
      { slot: "becoming", text: unsafeText, attribution: "owner_confirmed", uncertainty: null },
    ],
    privateBasis: {
      sourceReference: privateBasisCanary,
      sourceContentHash: "sha256:private",
      twinRevisionHash: "sha256:private-twin",
    },
  } as ProjectionCapsuleV1 & { privateBasis: Record<string, string> };

  const html = render(projection);
  assert.doesNotMatch(html, /<script/u);
  assert.match(html, /&lt;script data-private=&quot;yes&quot;&gt;alert\(&quot;escaped&quot;\)&lt;\/script&gt;/u);
  assert.doesNotMatch(html, new RegExp(privateBasisCanary, "u"));
  assert.doesNotMatch(html, /sourceReference|sourceContentHash|twinRevisionHash/u);
  assert.equal(html.includes(projection.disclosureBasisId), false);
  assert.equal(html.includes(projection.publicationAttestationId), false);
  assert.equal(html.includes(projection.payloadHash), false);
});
