import { HostedRoomApplication } from "./application.ts";
import { SyntheticPresenceStore } from "./store.ts";
import type { PublicCoreRoomRuntimeV1 } from "./public-core-room-runtime.ts";

export class HostedRuntimeUnavailable extends Error {
  constructor() {
    super("R4 hosted runtime is disabled until an approved non-synthetic adapter is installed");
  }
}

interface GlobalSyntheticRuntime {
  __formeR4SyntheticApplication?: HostedRoomApplication;
  __formeR4LocalPublicCoreApplication?: Promise<{
    readonly runtime: PublicCoreRoomRuntimeV1;
    readonly roomId: string;
    close(): Promise<void>;
  }>;
}

export function syntheticModeEnabled(): boolean {
  return process.env.FORME_R4_SYNTHETIC === "1";
}

export function localPublicCoreModeEnabled(): boolean {
  return typeof process.env.FORME_R4_PUBLIC_CORE_LOCAL_ROOT === "string"
    && process.env.FORME_R4_PUBLIC_CORE_LOCAL_ROOT !== "";
}

export function roomRuntimeMode(): "synthetic" | "local_public_core" | "unavailable" {
  if (syntheticModeEnabled() && localPublicCoreModeEnabled()) throw new HostedRuntimeUnavailable();
  if (localPublicCoreModeEnabled()) return "local_public_core";
  if (syntheticModeEnabled()) return "synthetic";
  return "unavailable";
}

export function hostedApplication(): HostedRoomApplication {
  if (!syntheticModeEnabled()) throw new HostedRuntimeUnavailable();
  const globalRuntime = globalThis as typeof globalThis & GlobalSyntheticRuntime;
  if (!globalRuntime.__formeR4SyntheticApplication) {
    globalRuntime.__formeR4SyntheticApplication = new HostedRoomApplication(new SyntheticPresenceStore());
  }
  return globalRuntime.__formeR4SyntheticApplication;
}

export async function roomApplication(): Promise<Pick<HostedRoomApplication, "runCore">> {
  const mode = roomRuntimeMode();
  if (mode === "synthetic") return hostedApplication();
  if (mode !== "local_public_core") throw new HostedRuntimeUnavailable();
  const root = process.env.FORME_R4_PUBLIC_CORE_LOCAL_ROOT as string;
  const globalRuntime = globalThis as typeof globalThis & GlobalSyntheticRuntime;
  if (!globalRuntime.__formeR4LocalPublicCoreApplication) {
    globalRuntime.__formeR4LocalPublicCoreApplication = import("./public-core-local-runtime.ts")
      .then(({ loadPublicCoreLocalRuntimeV1 }) => loadPublicCoreLocalRuntimeV1(root));
  }
  return (await globalRuntime.__formeR4LocalPublicCoreApplication).runtime;
}
