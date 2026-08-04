import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createProjectionPage } from "../../apps/room/src/projection-page.ts";
import nextConfig from "../../apps/room/next.config.ts";
import { HostedRoomApplication } from "../../apps/room/src/application.ts";
import { dispatchApi } from "../../apps/room/src/http.ts";
import { SyntheticPresenceStore } from "../../apps/room/src/store.ts";

const T0 = "2026-08-03T12:00:00.000Z";
const PUBLIC_PROJECTION_ID = "proj_formepublic00000000000000000000";
const ProjectionPage = createProjectionPage(() => createElement("div", { "data-testid": "guest-ask" }));

interface SyntheticGlobal {
  __formeR4SyntheticApplication?: HostedRoomApplication;
}

function assertRenderedProjection(html: string, view: Record<string, unknown>): void {
  const projection = view.projection as Record<string, unknown>;
  const lifecycle = view.lifecycle as Record<string, unknown>;
  assert.equal(html.includes(String(projection.title)), true);
  assert.equal(html.includes(String(projection.thirdPlaceSummary)), true);
  for (const claim of projection.claims as Array<Record<string, unknown>>) {
    assert.equal(html.includes(String(claim.text)), true);
  }
  assert.equal(html.includes(String(lifecycle.ownerState)), true);
  assert.equal(html.includes(String(lifecycle.curationState)), true);
  if (view.warning !== null) assert.equal(html.includes(String(view.warning)), true);
}

test("D03 the actual Projection page and Agent JSON share exact public semantics, including stale warning and no-store", async () => {
  const previousMode = process.env.FORME_R4_SYNTHETIC;
  const globalRuntime = globalThis as typeof globalThis & SyntheticGlobal;
  const previousApplication = globalRuntime.__formeR4SyntheticApplication;
  let clock = new Date(T0);
  const app = new HostedRoomApplication(new SyntheticPresenceStore(() => clock));
  process.env.FORME_R4_SYNTHETIC = "1";
  globalRuntime.__formeR4SyntheticApplication = app;
  try {
    const freshResponse = await dispatchApi(
      new Request(`http://forme.invalid/api/v1/projections/${PUBLIC_PROJECTION_ID}`),
      ["projections", PUBLIC_PROJECTION_ID],
    );
    assert.equal(freshResponse.status, 200);
    assert.equal(freshResponse.headers.get("cache-control"), "no-store");
    const freshJson = await freshResponse.json() as { view: Record<string, unknown> };
    const freshHtml = renderToStaticMarkup(await ProjectionPage({ params: Promise.resolve({ projectionId: PUBLIC_PROJECTION_ID }) }));
    assertRenderedProjection(freshHtml, freshJson.view);
    assert.equal(freshJson.view.warning, null);

    clock = new Date(clock.getTime() + 24 * 60 * 60 * 1_000);
    const staleResponse = await dispatchApi(
      new Request(`http://forme.invalid/api/v1/projections/${PUBLIC_PROJECTION_ID}`),
      ["projections", PUBLIC_PROJECTION_ID],
    );
    assert.equal(staleResponse.status, 200);
    assert.equal(staleResponse.headers.get("cache-control"), "no-store");
    const staleJson = await staleResponse.json() as { view: Record<string, unknown> };
    assert.equal(typeof staleJson.view.warning, "string");
    const staleHtml = renderToStaticMarkup(await ProjectionPage({ params: Promise.resolve({ projectionId: PUBLIC_PROJECTION_ID }) }));
    assertRenderedProjection(staleHtml, staleJson.view);

    const rules = await nextConfig.headers?.();
    const pageHeaders = rules?.find((rule) => rule.source === "/:path*")?.headers ?? [];
    assert.equal(pageHeaders.some((header) => header.key.toLowerCase() === "cache-control" && header.value === "no-store"), true);
  } finally {
    if (previousApplication) globalRuntime.__formeR4SyntheticApplication = previousApplication;
    else delete globalRuntime.__formeR4SyntheticApplication;
    if (previousMode === undefined) delete process.env.FORME_R4_SYNTHETIC;
    else process.env.FORME_R4_SYNTHETIC = previousMode;
  }
});
