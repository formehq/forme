import { canonicalSha256 } from "../../../packages/r4-protocol/src/index.ts";

export const SYNTHETIC_PROVIDER_POLICY_URL = "https://example.invalid/no-provider-call";

export const SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE =
  "Gate A has no provider session, account regime, or provider retention grant. A real OpenAI policy URL, version, account/data-control regime, and retention hash must be approved in Gate B before this lane can send one byte.";

export const SYNTHETIC_BACKUP_RETENTION_DISCLOSURE =
  "The synthetic in-memory Room has no production backup. A real hosted backup horizon must be disclosed and approved before any real Guest submission.";

export const SYNTHETIC_CONSENT_COPY_V1 = [
  "If you choose local AI, the Owner may actively hand this exact request and any included Guest Capsule to one new, non-resumed, bounded Codex Fresh Session on the Owner device.",
  "The hosted Forme server runs no AI. The Fresh Session may dynamically read or search only a current sanitized Forme source snapshot plus body/path-free Twin orientation; any admitted snapshot content it judges relevant may be included in OpenAI processing.",
  "This is not a promise of an exact outbound byte list or a complete file-read list, and OpenAI may receive runtime instructions, schema, and transport bytes in addition to broker-returned source text.",
  "The maximum session is 60 minutes, three provider dispatches, 128,000 aggregate input tokens, 8,000 output tokens, and US$1 incremental spend when applicable, with no provider/model fallback. The Owner can read and copy the request and candidate during the protected review ceremonies.",
  "A delete, revoke, expiry, or Room retirement committed before a dispatch permit prevents that provider call. If the permit commits first, those exact provider bytes are already disclosed or in flight and cannot be recalled by a later destructive action.",
  "You may instead choose manual Owner response only. In this Gate A synthetic build, no OpenAI call, provider spend, external email, production database, or production backup occurs; the real provider policy/account/retention and backup terms remain unapproved and the AI lane stays disabled.",
].join(" ");

export const SYNTHETIC_CONSENT_COPY_HASH = canonicalSha256(SYNTHETIC_CONSENT_COPY_V1);
export const SYNTHETIC_PROVIDER_POLICY_HASH = canonicalSha256({
  schemaVersion: "synthetic_provider_policy.v1",
  url: SYNTHETIC_PROVIDER_POLICY_URL,
  status: "no_provider_call_gate_a",
});
export const SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE_HASH = canonicalSha256(SYNTHETIC_PROVIDER_RETENTION_DISCLOSURE);
export const SYNTHETIC_BACKUP_RETENTION_DISCLOSURE_HASH = canonicalSha256(SYNTHETIC_BACKUP_RETENTION_DISCLOSURE);
