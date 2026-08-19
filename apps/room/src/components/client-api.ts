export type ClientApiJson = Record<string, unknown>;

export class ClientApiError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "ClientApiError";
    this.code = code;
  }
}

const SAFE_CODE_MESSAGES: Readonly<Record<string, string>> = {
  hosted_runtime_unavailable: "The Room service is not available yet. Retry in a moment.",
  service_unavailable: "The Room service could not complete the request. Retry in a moment.",
  version_conflict: "This item changed since the page opened. Refresh its status, then retry.",
  terminal_interaction: "This Interaction has already reached a final state. Refresh its status.",
  invalid_email: "Enter a valid email address and try again.",
  verification_send_rate_limited: "This Interaction has reached its verification-send limit. Try again later.",
  endpoint_handoff_already_began: "The existing notification is already being handed off and cannot be replaced.",
  public_room_pool_exhausted: "This public Room has reached its current Interaction limit. Try again later.",
  public_encounter_hourly_limited: "This browser session has reached the Room's short-term public access limit. Try again later.",
  public_encounter_daily_limited: "This browser session has reached the Room's daily public access limit. Try again tomorrow.",
  public_accept_daily_limited: "This browser session has reached the Room's daily accepted Interaction limit.",
  projection_not_fresh: "This Projection is no longer current enough to accept a new Interaction.",
  parent_capability_unavailable: "This access capability is no longer available.",
  unresolved_interaction_exists: "This access capability already has an unresolved Interaction.",
};

function jsonObject(value: unknown): ClientApiJson | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as ClientApiJson
    : null;
}

/**
 * Parses one hosted response without reflecting arbitrary server text into the
 * browser. Only locally reviewed, code-keyed copy or the caller's fallback can
 * become visible to a Guest or Owner.
 */
export async function readClientApiJson(
  response: Response,
  fallback: string,
  codeMessages: Readonly<Record<string, string>> = {},
): Promise<ClientApiJson> {
  let body: ClientApiJson | null = null;
  try {
    body = jsonObject(await response.json());
  } catch {
    // A proxy or interrupted response may not be JSON. Treat it as an
    // unavailable operation without displaying transport bytes.
  }

  if (!response.ok) {
    const error = jsonObject(body?.error);
    const code = typeof error?.code === "string" ? error.code : null;
    const message = code === null
      ? fallback
      : codeMessages[code] ?? SAFE_CODE_MESSAGES[code] ?? fallback;
    throw new ClientApiError(message, code);
  }
  if (body === null) throw new ClientApiError(fallback);
  return body;
}

export function safeClientFailure(cause: unknown, fallback: string): string {
  return cause instanceof ClientApiError ? cause.message : fallback;
}
