import { Fragment, createElement, type ComponentType, type ReactNode } from "react";
import { notFound } from "next/navigation.js";
import { HostedRuntimeUnavailable, hostedApplication } from "./runtime.ts";
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
}

export function createProjectionPage(GuestAsk: ComponentType<GuestAskProps>) {
  return async function ProjectionPage({ params }: ProjectionPageProps) {
  const { projectionId } = await params;
  let projection: Record<string, unknown>;
  let lifecycle: Record<string, unknown>;
  let warning: unknown;
  try {
    const result = await hostedApplication().runCore({
      definition: coreOperationDefinition("projection.read"),
      params: { projectionId },
      body: {},
      authorization: null,
      syntheticActor: null,
      idempotencyKey: null,
      expectedVersion: null,
    });
    const view = result.body.view as Record<string, unknown>;
    projection = view.projection as Record<string, unknown>;
    lifecycle = view.lifecycle as Record<string, unknown>;
    warning = view.warning;
  } catch (error) {
    if (error instanceof HostedRuntimeUnavailable) {
      return createElement("p", { className: "error" }, "Hosted Room is not provisioned; this build fails closed outside explicit synthetic mode.");
    }
    notFound();
  }

  const children: ReactNode[] = [
    createElement("p", { className: "eyebrow", key: "eyebrow" }, "Public Projection · shallow snapshot"),
    createElement("h1", { key: "title" }, String(projection.title)),
    createElement("p", { key: "summary" }, String(projection.thirdPlaceSummary)),
    createElement("div", { className: "meta", key: "meta" },
      createElement("span", { className: `pill ${lifecycle.ownerState === "published_fresh" ? "pillLive" : "pillWarn"}` }, String(lifecycle.ownerState)),
      createElement("span", { className: "pill" }, String(lifecycle.curationState)),
    ),
    warning ? createElement("div", { className: "notice", key: "warning" }, createElement("p", null, String(warning))) : null,
    ...(projection.claims as Array<Record<string, unknown>>).map((claim, index) => createElement(
      "p",
      { className: "projectionBody", key: `${String(claim.slot)}-${index}` },
      String(claim.text),
    )),
  ];
  if (lifecycle.ownerState === "published_fresh" && lifecycle.curationState === "admitted" && warning === null) {
    children.push(createElement(Fragment, { key: "ask" },
      createElement("hr", { className: "divider" }),
      createElement("p", { className: "eyebrow" }, "Go deeper by asking, not by exposing the Twin"),
      createElement("h2", null, "Send one private signal"),
      createElement(GuestAsk, {
        projection: {
          projectionId: String(projection.projectionId),
          version: Number(lifecycle.version),
          supportedInteractions: projection.supportedInteractions as Array<"ask" | "seed" | "resonance">,
        },
      }),
    ));
  }
    return createElement("article", { className: "projection" }, ...children);
  };
}
