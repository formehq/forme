// Shape of a full decision card (matches schema/card.schema.json) and of the
// looser payload the agent returns (matches runner/agent-schema.ts).

export interface Hunk {
  locator?: string;
  before: string;
  after: string;
}

export interface Diff {
  file: string;
  hunks: Hunk[];
}

export interface Evidence {
  path: string;
  locator?: string;
  quote?: string;
  note?: string;
}

export interface Option {
  id: "accept" | "park" | "reject";
  label: string;
  hotkey: string;
}

export interface Origin {
  agent: string;
  model?: string;
  runId: string;
  at: string;
  host?: string;
}

export interface Card {
  schemaVersion: "0";
  id: string;
  origin: Origin;
  from: string;
  role: "proposal";
  category: string;
  title: string;
  summary?: string;
  evidence: Evidence[];
  diff: Diff;
  options: Option[];
  fingerprint: string;
  estSeconds?: number;
  createdAt: string;
}

// What codex returns under runner/agent-schema.ts (strict structured outputs:
// every field present, optionals as null). Forme code owns everything else.
export interface AgentCard {
  category: string;
  title: string;
  summary: string | null;
  evidence: Array<{
    path: string;
    locator: string | null;
    quote: string | null;
    note: string | null;
  }>;
  diff: {
    file: string;
    hunks: Array<{ locator: string | null; before: string; after: string }>;
  };
  estSeconds: number | null;
}
