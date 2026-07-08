import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPage } from "./page.ts";
import { applyCardDiff, ApplyError } from "./apply.ts";
import {
  appendEvent,
  catchUpData,
  lastPresentedTs,
  latestStateDiff,
  pendingCards,
  readEvents,
  type DecisionEvent,
} from "./store.ts";
import type { Card, Hunk } from "../runner/types.ts";

/**
 * Forme console(issue #15,W3):localhost 单页,渲染三种原语(Decision 卡
 * 五段 v0.1 / State Diff 四段 / catch-up 卡)+ a/p/r 单键落子 + correction。
 * 技术栈按 2026-07-04 裁定:原生 TS + node:http,零重框架——UI 只是
 * vault 的确定性投影(硬约束 #4),每个请求现读现算,服务器不持有任何状态。
 *
 * presented 语义在此定案(#9 遗留):**卡在浏览器实际上屏那一刻**,客户端
 * 上报 POST /api/presented,事件才落 jsonl——静默计时从这里起点;落子时
 * latencyMs = 最近一次 presented → decision 的真实间隔。没有 presented
 * 记录的落子(如 curl 直打)按 backfilled 记,不编造延迟。
 *
 * 只绑 127.0.0.1;不推送、不通知、无 badge(沉默纪律)——等用户来。
 */

export interface ConsoleOpts {
  vault: string;
  outDir?: string;
}

interface DecideBody {
  cardId?: unknown;
  choice?: unknown;
  correction?: { hunks?: unknown; note?: unknown };
}

const CHOICES = new Set(["accept", "park", "reject"]);

function json(res: ServerResponse, status: number, body: unknown): void {
  const buf = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(buf);
}

function readBody(req: IncomingMessage, limit = 1_048_576): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) reject(new Error("body too large"));
      else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** correction 消毒:结构不对就整体拒绝(这条写路径归我们所有,不宽容)。 */
function sanitizeCorrectionHunks(raw: unknown): Hunk[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const hunks: Hunk[] = [];
  for (const h of raw) {
    if (!h || typeof h !== "object") return null;
    const { locator, before, after } = h as Record<string, unknown>;
    if (typeof before !== "string" || typeof after !== "string") return null;
    if (before === "" && after === "") return null;
    if (locator !== undefined && typeof locator !== "string") return null;
    hunks.push(locator !== undefined ? { locator, before, after } : { before, after });
  }
  return hunks;
}

const sameHunks = (a: Hunk[], b: Hunk[]) => JSON.stringify(a) === JSON.stringify(b);

export function createConsoleServer(opts: ConsoleOpts): Server {
  const vault = opts.vault;
  const outDir = opts.outDir ?? join(vault, "98_Forme");
  const jsonlPath = join(outDir, "decisions.jsonl");

  return createServer(async (req, res) => {
    try {
      // localhost CSRF/DNS-rebinding 挡板:console 会写 vault,来路必须是本机
      const host = (req.headers.host ?? "").split(":")[0];
      if (host !== "127.0.0.1" && host !== "localhost") {
        return json(res, 403, { error: "console 只服务本机" });
      }
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(renderPage());
      }

      if (req.method === "GET" && url.pathname === "/api/state") {
        const now = new Date();
        const events = readEvents(jsonlPath);
        return json(res, 200, {
          now: now.toISOString(),
          catchUp: catchUpData(vault, outDir, now),
          pending: pendingCards(outDir, events),
          stateDiff: latestStateDiff(outDir),
        });
      }

      if (req.method === "POST") {
        // 跨站简单请求发不出 application/json——这是本机写路径的最后一道闸
        if (!(req.headers["content-type"] ?? "").includes("application/json")) {
          return json(res, 415, { error: "需要 application/json" });
        }
        let body: DecideBody;
        try {
          body = JSON.parse(await readBody(req)) as DecideBody;
        } catch {
          return json(res, 400, { error: "body 不是 JSON" });
        }
        const cardId = typeof body.cardId === "string" ? body.cardId : null;
        if (!cardId) return json(res, 400, { error: "缺 cardId" });

        const events = readEvents(jsonlPath);
        const pending = pendingCards(outDir, events);
        const card = pending.find((c) => c.id === cardId);

        if (url.pathname === "/api/presented") {
          if (!card) return json(res, 409, { error: "卡不存在或已落子" });
          appendEvent(jsonlPath, {
            v: "0",
            ts: new Date().toISOString(),
            type: "presented",
            cardId: card.id,
            fingerprint: card.fingerprint,
          });
          return json(res, 200, { ok: true });
        }

        if (url.pathname === "/api/decide") {
          if (!card) return json(res, 409, { error: "卡不存在或已落子" });
          const choice = typeof body.choice === "string" ? body.choice : "";
          if (!CHOICES.has(choice)) return json(res, 400, { error: "choice 须为 accept/park/reject" });

          // correction = accept 前对 diff 的就地修订(read-only 的唯一例外)
          let hunks = card.diff.hunks;
          let correctionEvent: DecisionEvent | null = null;
          if (body.correction) {
            if (choice !== "accept") return json(res, 400, { error: "correction 只随 accept" });
            const edited = sanitizeCorrectionHunks(body.correction.hunks);
            if (!edited) return json(res, 400, { error: "correction.hunks 结构不合法" });
            const note = typeof body.correction.note === "string" && body.correction.note.trim()
              ? body.correction.note.trim()
              : undefined;
            if (!sameHunks(edited, card.diff.hunks) || note) {
              hunks = edited;
              correctionEvent = {
                v: "0",
                ts: new Date().toISOString(),
                type: "correction",
                cardId: card.id,
                fingerprint: card.fingerprint,
                correction: note ? { hunks: edited, note } : { hunks: edited },
              };
            }
          }

          let executed: string | undefined;
          if (choice === "accept") {
            try {
              executed = applyCardDiff(vault, card, hunks).executed;
            } catch (e) {
              const msg = e instanceof ApplyError ? e.message : `应用失败:${String(e)}`;
              return json(res, 422, { error: msg });
            }
          }

          const now = new Date();
          const presentedTs = lastPresentedTs(events, card.id);
          const latencyMs = presentedTs
            ? Math.max(0, now.getTime() - Date.parse(presentedTs))
            : null;
          const decision: DecisionEvent = {
            v: "0",
            ts: now.toISOString(),
            type: "decision",
            cardId: card.id,
            fingerprint: card.fingerprint,
            choice: choice as DecisionEvent["choice"],
            actor: "owner",
            ...(latencyMs !== null ? { latencyMs } : { backfilled: true }),
            ...(executed ? { executed } : {}),
          };
          if (correctionEvent) appendEvent(jsonlPath, correctionEvent);
          appendEvent(jsonlPath, decision);
          return json(res, 200, { ok: true, choice, executed, latencyMs });
        }
      }

      json(res, 404, { error: "not found" });
    } catch (e) {
      json(res, 500, { error: String(e instanceof Error ? e.message : e) });
    }
  });
}

function main(): void {
  const arg = (name: string, def?: string): string | undefined => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
  };
  const vault = arg("vault") ?? process.env.FORME_VAULT;
  if (!vault) {
    console.error("forme console: need --vault <path> or FORME_VAULT env");
    process.exit(2);
  }
  const port = Number(arg("port", "6180"));
  const server = createConsoleServer({ vault, outDir: arg("out") });
  server.listen(port, "127.0.0.1", () => {
    console.log(`forme console → http://127.0.0.1:${port}  (vault: ${vault})`);
    console.log("不推送、不通知;开着就行,等你来。Ctrl-C 退出。");
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
