import { Fragment, createElement, type ComponentType, type ReactNode } from "react";
import { notFound } from "next/navigation.js";
import type {
  ProjectionCapsuleV1,
  ProjectionClaimV1,
  ProjectionLifecycleV1,
  ProjectionReadViewV1,
} from "../../../packages/r4-protocol/src/index.ts";
import { HostedRuntimeUnavailable, roomApplication, roomRuntimeMode } from "./runtime.ts";
import { coreOperationDefinition } from "./core-policy.ts";

interface ProjectionPageProps {
  params: Promise<{ projectionId: string }>;
}

interface GuestAskProps {
  projection: {
    projectionId: string;
    version: number;
    supportedInteractions: Array<"ask" | "seed" | "resonance">;
  };
  runtimeMode?: "synthetic" | "local_public_core";
}

const CLAIM_SECTIONS = [
  { slot: "becoming", label: "Vision & Becoming" },
  { slot: "now", label: "Now" },
  { slot: "nextMove", label: "Next Move" },
  { slot: "tensions", label: "Tensions" },
  { slot: "openTo", label: "Open To" },
] as const satisfies ReadonlyArray<{ slot: ProjectionClaimV1["slot"]; label: string }>;

function renderStringList(label: string, values: readonly string[], key: string): ReactNode {
  return createElement(Fragment, { key },
    createElement("h3", null, label),
    createElement("ul", null, ...values.map((value, index) => createElement("li", { key: `${key}-${index}` }, value))),
  );
}

function renderClaimSections(claims: readonly ProjectionClaimV1[]): ReactNode[] {
  return CLAIM_SECTIONS.flatMap(({ slot, label }) => {
    const sectionClaims = claims.filter((claim) => claim.slot === slot);
    if (sectionClaims.length === 0) return [];
    return [createElement("section", { key: slot, "aria-labelledby": `projection-${slot}` },
      createElement("p", { className: "eyebrow" }, label),
      createElement("h2", { id: `projection-${slot}` }, label),
      ...sectionClaims.map((claim, index) => createElement(Fragment, { key: `${slot}-${index}` },
        createElement("p", { className: "projectionBody" }, claim.text),
        claim.uncertainty === null
          ? null
          : createElement("div", { className: "notice" },
            createElement("p", null, `What remains uncertain: ${claim.uncertainty}`),
          ),
      )),
    )];
  });
}

function renderBoundary(projection: ProjectionCapsuleV1): ReactNode {
  return createElement("aside", { className: "card cardWide", "aria-labelledby": "projection-boundary", key: "boundary" },
    createElement("p", { className: "eyebrow" }, "Interaction boundary"),
    createElement("h2", { id: "projection-boundary" }, "Boundary"),
    createElement("h3", null, "What this Projection can do"),
    createElement("p", null, projection.agencyStatement),
    createElement("h3", null, "What this does not commit"),
    createElement("p", null, projection.nonCommitmentStatement),
    renderStringList("Supported interactions", projection.supportedInteractions, "supported-interactions"),
    createElement("h3", null, "Expected response latency"),
    createElement("p", null, projection.expectedResponseLatency),
    renderStringList("Allowed topics", projection.allowedTopics, "allowed-topics"),
    renderStringList("Unavailable topics", projection.unavailableTopics, "unavailable-topics"),
    createElement("h3", null, "Freshness and expiry"),
    createElement("dl", { className: "consentFacts" },
      createElement("dt", null, "Fresh until"),
      createElement("dd", null, createElement("time", { dateTime: projection.freshUntil }, projection.freshUntil)),
      createElement("dt", null, "Expires at"),
      createElement("dd", null, createElement("time", { dateTime: projection.expiresAt }, projection.expiresAt)),
    ),
  );
}

export function renderProjectionArticle(
  view: Pick<ProjectionReadViewV1, "projection" | "lifecycle" | "warning">,
  GuestAsk: ComponentType<GuestAskProps>,
  runtimeMode: "synthetic" | "local_public_core" = "synthetic",
): ReactNode {
  const { projection, lifecycle, warning } = view;
  const children: ReactNode[] = [
    createElement("p", { className: "eyebrow", key: "eyebrow" }, "Public Projection · shallow snapshot"),
    createElement("h1", { key: "title" }, projection.title),
    createElement("p", { key: "summary" }, projection.thirdPlaceSummary),
    createElement("div", { className: "meta", key: "meta" },
      createElement("span", { className: `pill ${lifecycle.ownerState === "published_fresh" ? "pillLive" : "pillWarn"}` }, lifecycle.ownerState),
      createElement("span", { className: "pill" }, lifecycle.curationState),
    ),
    warning ? createElement("div", { className: "notice", key: "warning" }, createElement("p", null, warning)) : null,
    ...renderClaimSections(projection.claims),
    renderBoundary(projection),
  ];
  if (lifecycle.ownerState === "published_fresh" && lifecycle.curationState === "admitted" && warning === null) {
    children.push(createElement(Fragment, { key: "ask" },
      createElement("hr", { className: "divider" }),
      createElement("p", { className: "eyebrow" }, "Go deeper by asking, not by exposing the Twin"),
      createElement("h2", null, "Send one private signal"),
      createElement(GuestAsk, {
        runtimeMode,
        projection: {
          projectionId: projection.projectionId,
          version: lifecycle.version,
          supportedInteractions: [...projection.supportedInteractions],
        },
      }),
    ));
  }
  return createElement("article", { className: "projection" }, ...children);
}

export function createProjectionPage(GuestAsk: ComponentType<GuestAskProps>) {
  return async function ProjectionPage({ params }: ProjectionPageProps) {
    const { projectionId } = await params;
    let view: Pick<ProjectionReadViewV1, "projection" | "lifecycle" | "warning">;
    try {
      const result = await (await roomApplication()).runCore({
        definition: coreOperationDefinition("projection.read"),
        params: { projectionId },
        body: {},
        authorization: null,
        syntheticActor: null,
        idempotencyKey: null,
        expectedVersion: null,
        syntheticClientBucket: null,
      });
      if (result.body.view !== undefined) {
        view = result.body.view as unknown as ProjectionReadViewV1;
      } else {
        view = {
          projection: result.body.projection as ProjectionCapsuleV1,
          lifecycle: result.body.lifecycle as ProjectionLifecycleV1,
          warning: result.body.staleWarning === true
            ? "stale_projection"
            : null,
        };
      }
    } catch (error) {
      if (error instanceof HostedRuntimeUnavailable) {
        return createElement("p", { className: "error" }, "Hosted Room is not provisioned; this build fails closed outside explicit synthetic mode.");
      }
      notFound();
    }

    const mode = roomRuntimeMode();
    return renderProjectionArticle(view, GuestAsk, mode === "local_public_core" ? mode : "synthetic");
  };
}
