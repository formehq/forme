import { readFileSync, existsSync } from "node:fs";

/**
 * Fingerprint suppression list (issue #9;硬约束 #6:重复率→0 靠确定性工程)。
 * decisions.jsonl 里任何出现过 decision 事件的指纹(accept / park / reject)
 * 都进名单:该漂移已被裁决,再次提出即重复。parked 同样抑制,直到日后
 * console 侧有显式 un-park 机制(post-W2)。
 *
 * undo(#24):撤销该卡最近一次 decision——按文件序重放(append-only 日志,
 * 文件序 = 时间序),undo 把该指纹移出名单;其后再落子则重新进名单。
 *
 * 解析故意宽容:抑制是安全网。一行事件哪怕过不了完整 schema 校验
 * (如缺 latencyMs),只要能读出 type + fingerprint 就必须生效——
 * 不能因为校验挑剔而放过一张重复卡。读不动的行只计数,绝不致命。
 */
export interface SuppressionList {
  fingerprints: Set<string>;
  events: number; // 可解析的事件行数
  unreadable: number; // 非 JSON 的行数(计数供告警,不中断)
}

export function loadSuppressionList(jsonlPath: string): SuppressionList {
  const fingerprints = new Set<string>();
  let events = 0;
  let unreadable = 0;
  if (!existsSync(jsonlPath)) return { fingerprints, events, unreadable };
  for (const line of readFileSync(jsonlPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as { type?: unknown; fingerprint?: unknown };
      events++;
      if (e.type === "decision" && typeof e.fingerprint === "string") {
        fingerprints.add(e.fingerprint);
      } else if (e.type === "undo" && typeof e.fingerprint === "string") {
        fingerprints.delete(e.fingerprint); // #24:撤销后该漂移回到未决,不抑制
      }
    } catch {
      unreadable++;
    }
  }
  return { fingerprints, events, unreadable };
}
