// Shape of a full decision card (matches schema/card.schema.json) and of the
// looser payload the agent returns (matches runner/agent-schema.ts).

export interface Hunk {
  locator?: string;
  before: string;
  after: string;
  all?: boolean; // #36:true = 替换 before 的每一处出现(重复引用类漂移)
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

export interface Recommendation {
  choice: "accept" | "park" | "reject";
  reason: string;
}

// v0.2(#21):stakes 驱动卡面丰俭与世界层闸的豁免面。
export type Stakes = "reversible-ledger" | "real-world-action" | "thought";

export interface Card {
  schemaVersion: "0";
  id: string;
  origin: Origin;
  from: string;
  role: "proposal";
  category: string;
  title: string;
  summary?: string;
  whyNow?: string;
  recommendation?: Recommendation;
  onAccept?: string;
  evidence: Evidence[];
  diff: Diff;
  options: Option[];
  fingerprint: string;
  estSeconds?: number;
  createdAt: string;
  stakes?: Stakes; // v0.2(#21):agent 申报 + 代码消毒(非法/缺失 → 按 category 派生)
  revisedAt?: string; // v0.2(#21):卡面最近一次被重写的时刻(id/指纹/diff 不变)
  context?: { question: string; answer: string }; // v0.2(#21):question 通道往返
}

// What codex returns under runner/agent-schema.ts (strict structured outputs:
// every field present, optionals as null; recommendation 拍平成两个 nullable
// string,组装时由 Forme 代码重建并消毒)。Forme code owns everything else.
export interface AgentCard {
  category: string;
  title: string;
  summary: string | null;
  whyNow: string | null;
  recommendationChoice: string | null;
  recommendationReason: string | null;
  onAccept: string | null;
  evidence: Array<{
    path: string;
    locator: string | null;
    quote: string | null;
    note: string | null;
  }>;
  diff: {
    file: string;
    hunks: Array<{ locator: string | null; before: string; after: string; all: boolean | null }>;
  };
  estSeconds: number | null;
  stakes: string | null; // v0.2(#21):agent 申报的 stakes 分级,代码消毒
}
