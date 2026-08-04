import { HostedRoomApplication } from "./application.ts";
import { SyntheticPresenceStore } from "./store.ts";

export class HostedRuntimeUnavailable extends Error {
  constructor() {
    super("R4 hosted runtime is disabled until an approved non-synthetic adapter is installed");
  }
}

interface GlobalSyntheticRuntime {
  __formeR4SyntheticApplication?: HostedRoomApplication;
}

export function syntheticModeEnabled(): boolean {
  return process.env.FORME_R4_SYNTHETIC === "1";
}

export function hostedApplication(): HostedRoomApplication {
  if (!syntheticModeEnabled()) throw new HostedRuntimeUnavailable();
  const globalRuntime = globalThis as typeof globalThis & GlobalSyntheticRuntime;
  if (!globalRuntime.__formeR4SyntheticApplication) {
    globalRuntime.__formeR4SyntheticApplication = new HostedRoomApplication(new SyntheticPresenceStore());
  }
  return globalRuntime.__formeR4SyntheticApplication;
}
