import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * 每轮 run 追加一行数据点 → 重复率曲线的原始数据(issue #9)。
 * 住 <vault>/98_Forme/run-metrics.jsonl(运行时产物,边界裁定内)。
 * date/proposed/suppressed/presented 是 issue 指定的最小形;
 * runId/rejected/dup 是诚实的补充维度(数字才对得上账)。
 * dry-run 不落点——曲线只记真实完成的 run。
 */
export interface RunMetric {
  v: "0";
  date: string; // UTC YYYY-MM-DD
  runId: string;
  proposed: number; // agent 返回的候选数
  suppressed: number; // 指纹命中已决名单被静默丢弃数
  presented: number; // 写入 cards/ 队列数(W3 console 之前,呈现 = 入列)
  rejected: number; // 没过自有 AJV 门
  dup: number; // 同指纹卡已在盘上(幂等跳过)
  backfilled?: boolean;
}

export function appendRunMetric(path: string, m: RunMetric): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(m) + "\n");
}
