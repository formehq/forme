import { appendFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
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
  head?: string; // 本轮扫描时的 vault HEAD(#14:下轮增量窗口的锚点)
  illegible?: number; // 世界层闸命中数(#21:legibility 曲线原料;含被重写救回的)
  refaced?: number; // question 通道重写数(#21:问→再出卡的往返完成数)
  backfilled?: boolean;
}

export function appendRunMetric(path: string, m: RunMetric): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(m) + "\n");
}

/**
 * 上次成功 run 记录的 vault HEAD(#14)。取**最后一条带 head 的行**——
 * 早期数据点没有该字段,跳过即可;解析宽容(遥测文件,读不动的行不致命)。
 */
export function lastRunHead(path: string): string | null {
  if (!existsSync(path)) return null;
  let head: string | null = null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const m = JSON.parse(line) as { head?: unknown };
      if (typeof m.head === "string" && m.head) head = m.head;
    } catch {
      /* 宽容 */
    }
  }
  return head;
}
