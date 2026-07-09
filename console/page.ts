/**
 * Console 单页(issue #15)。零框架、零构建、零外部资源:一段 HTML +
 * 内联 CSS/JS,数据全部来自 /api/state(vault 的投影),页面自身不存
 * 任何东西(硬约束 #4)。三个原语视图:catch-up 卡(屏 1)→ 落子
 * session(屏 2,一次一卡,presented 在卡实际上屏时上报)→ State Diff
 * (屏 3,只读)。语气:平静同事腔、零催促;「今天不看」永远在且零愧疚。
 */
export function renderPage(): string {
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Forme</title>
<style>
  :root {
    --bg: #f5f5f2; --card: #ffffff; --ink: #1c1c1a; --muted: #71716c;
    --line: #e4e4de; --accent: #2e6e4e; --park: #8a6d1f; --reject: #984444;
    --chip: #efefe9; --code: #f0f0ea;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #17181a; --card: #1f2124; --ink: #e9e9e5; --muted: #9b9b95;
      --line: #33353a; --accent: #6fbf94; --park: #d0b060; --reject: #d08080;
      --chip: #2a2c30; --code: #26282c;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.7 -apple-system, "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif;
  }
  main { max-width: 660px; margin: 0 auto; padding: 40px 20px 80px; }
  .brand { color: var(--muted); font-size: 13px; letter-spacing: .08em; margin-bottom: 28px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 26px 30px; }
  h1 { font-size: 21px; line-height: 1.5; margin: 0 0 10px; }
  h2 { font-size: 13px; color: var(--muted); font-weight: 600; letter-spacing: .05em; margin: 22px 0 4px; }
  p { margin: 6px 0; }
  .muted { color: var(--muted); }
  .meta { display: flex; gap: 10px; align-items: center; font-size: 13px; color: var(--muted); margin-bottom: 14px; }
  .chip { background: var(--chip); border-radius: 5px; padding: 1px 8px; }
  .facts td { padding: 3px 0; vertical-align: top; }
  .facts td:first-child { color: var(--muted); white-space: nowrap; padding-right: 16px; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 26px; }
  button {
    font: inherit; font-size: 15px; padding: 8px 18px; border-radius: 8px;
    border: 1px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer;
  }
  button:hover { border-color: var(--muted); }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button.ghost { border-color: transparent; color: var(--muted); }
  button:disabled { opacity: .45; cursor: default; }
  kbd {
    font: 12px/1 ui-monospace, monospace; background: var(--chip); border: 1px solid var(--line);
    border-bottom-width: 2px; border-radius: 4px; padding: 2px 6px; margin-right: 7px;
  }
  details { border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px; margin-top: 12px; }
  details summary { cursor: pointer; color: var(--muted); font-size: 14px; }
  details[open] summary { margin-bottom: 8px; }
  .ev { font-size: 14px; margin: 8px 0; }
  .ev .path { font-family: ui-monospace, monospace; font-size: 12.5px; }
  .quote { border-left: 3px solid var(--line); margin: 4px 0 4px 2px; padding: 2px 10px; color: var(--muted); white-space: pre-wrap; }
  pre.diff { background: var(--code); border-radius: 6px; padding: 10px 14px; overflow-x: auto; font-size: 12.5px; line-height: 1.6; }
  pre.diff .del { color: var(--reject); }
  pre.diff .add { color: var(--accent); }
  pre.diff .loc { color: var(--muted); }
  .rec-accept { color: var(--accent); font-weight: 600; }
  .rec-park { color: var(--park); font-weight: 600; }
  .rec-reject { color: var(--reject); font-weight: 600; }
  .banner { border: 1px solid var(--reject); color: var(--reject); border-radius: 8px; padding: 8px 14px; margin-top: 14px; font-size: 14px; }
  .toast { color: var(--accent); margin-top: 14px; font-size: 14px; }
  .correction { border-top: 1px dashed var(--line); margin-top: 20px; padding-top: 14px; }
  .correction textarea, .correction input {
    width: 100%; font: 13px/1.6 ui-monospace, monospace; color: var(--ink);
    background: var(--code); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; margin: 4px 0 10px;
  }
  .correction .before { white-space: pre-wrap; background: var(--code); border-radius: 6px; padding: 8px 10px; color: var(--muted); font: 13px/1.6 ui-monospace, monospace; margin: 4px 0 6px; }
  .notebox {
    width: 100%; font: 14px/1.6 inherit; color: var(--ink); background: var(--code);
    border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px; margin-top: 14px;
  }
  .notebox::placeholder { color: var(--muted); }
  .toast button { font-size: 13px; padding: 2px 10px; margin-left: 10px; }
  .sd h1 { margin-bottom: 18px; }
  .sd p strong { display: block; color: var(--muted); font-size: 13px; letter-spacing: .05em; margin-bottom: 2px; }
  .sd p { margin: 14px 0; }
  .mrow { display: flex; align-items: center; gap: 10px; margin: 6px 0; font-size: 12.5px; color: var(--muted); }
  .mdate { width: 42px; white-space: nowrap; }
  .mtrack { flex: 1; display: flex; gap: 2px; align-items: center; }
  .mbar, .seg { height: 9px; border-radius: 4px; display: block; min-width: 2px; }
  .mbar-accept, .segp { background: var(--accent); }
  .mbar-park { background: var(--park); }
  .mbar-reject { background: var(--reject); }
  .segs { background: var(--line); }
  .mval { min-width: 64px; text-align: right; white-space: nowrap; }
  .big { font-size: 24px; font-weight: 600; color: var(--ink); }
  code { background: var(--code); border-radius: 4px; padding: 1px 5px; font-size: .88em; font-family: ui-monospace, monospace; }
  a { color: inherit; }
</style>
</head>
<body>
<main>
  <div class="brand">forme</div>
  <div id="view"></div>
</main>
<script>
"use strict";
var st = null;           // /api/state 的投影
var queue = [];          // 待决卡(本 session)
var idx = 0;
var decided = 0;
var sessionStart = 0;
var presentedOnce = {};  // cardId → true(本页加载内只上报一次)
var view = document.getElementById("view");
var currentView = "";    // catchup / session / statediff / done / skip
var lastBoot = 0;
var polling = false;

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function inline(s) { // 极小 markdown 行内:先转义,再 **粗体** 与 \`code\`
  s = esc(s);
  s = s.replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
  s = s.replace(/\`([^\`]+)\`/g, "<code>$1</code>");
  return s;
}
function post(path, body) {
  return fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); });
}
function fmtSecs(ms) { // #19:本次用时的人读形
  var s = Math.round(ms / 1000);
  if (s < 60) return s + " 秒";
  return Math.floor(s / 60) + " 分 " + (s % 60) + " 秒";
}
function mmdd(ts) { // #25:时间戳的用户面渲染一律本地时区
  var d = new Date(ts);
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return p(d.getMonth() + 1) + "-" + p(d.getDate());
}
var STAKES_LABEL = { "reversible-ledger": "账本", "real-world-action": "行动", "thought": "思想" };

/* ---------- 屏 1 · catch-up ---------- */
function awayLabel(cu) {
  if (!cu.sinceTs) return "第一次开盖";
  var h = cu.awayHours;
  if (h < 1) return "你刚还在";
  if (h < 48) return "你不在的 " + Math.round(h) + " 小时";
  return "你不在的 " + Math.round(h / 24) + " 天";
}
function freshLabel() {
  var fr = st.freshness || {};
  if (!fr.asOf) return fr.refreshing ? "还没跑过扫描 · 正在补第一轮…" : "还没跑过扫描";
  var d = new Date(fr.asOf);
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var sameDay = new Date().toDateString() === d.toDateString();
  var label = "队列截至 " + (sameDay ? "" : pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " ") +
    pad(d.getHours()) + ":" + pad(d.getMinutes());
  return fr.refreshing ? label + " · 后台补扫中…" : label;
}
function renderCatchup() {
  currentView = "catchup";
  var cu = st.catchUp;
  var into = cu.commits === 0 ? "vault 没有新 commit" :
    cu.commits + " 个 commit,动了 " + cu.mdTouched + " 个文档";
  var did = cu.runs.runs === 0 ? "没跑扫描;没动任何内容文件" :
    cu.runs.runs + " 轮扫描,提出 " + cu.runs.proposed + " 张、抑制 " + cu.runs.suppressed + " 张;没动任何内容文件";
  var wait = cu.pending.count === 0 ? "没有卡在等你" :
    "<strong>" + cu.pending.count + " 张卡,约 " + Math.max(1, Math.round(cu.pending.estSeconds / 60)) + " 分钟</strong>";
  if (cu.awaitingContext > 0) wait += '<span class="muted">(另 ' + cu.awaitingContext + " 张在补 context)</span>";
  var html = '<div class="card">' +
    "<h1>" + esc(awayLabel(cu)) + "</h1>" +
    '<table class="facts"><tr><td>进来</td><td>' + into + "</td></tr>" +
    "<tr><td>我做的</td><td>" + did + "</td></tr>" +
    "<tr><td>等你</td><td>" + wait + "</td></tr></table>" +
    '<p class="muted" style="font-size:13px;margin:14px 0 0">' + esc(freshLabel()) + "</p>" +
    '<div class="actions">';
  if (cu.pending.count > 0) html += '<button class="primary" id="go">进入落子</button>';
  if (st.stateDiff) html += '<button id="sd">先看 State Diff</button>';
  if (st.metrics && (st.metrics.decided.total > 0 || st.metrics.runs.length > 0)) html += '<button id="mx">Metrics</button>';
  html += '<button class="ghost" id="skip">今天不看</button></div></div>';
  view.innerHTML = html;
  var go = document.getElementById("go");
  if (go) go.onclick = startSession;
  var sd = document.getElementById("sd");
  if (sd) sd.onclick = function () { renderStateDiff("catchup"); };
  var mx = document.getElementById("mx");
  if (mx) mx.onclick = function () { renderMetrics("catchup"); };
  document.getElementById("skip").onclick = renderSkip;
}
function renderSkip() {
  currentView = "skip";
  view.innerHTML = '<div class="card"><p>好,今天不看。卡都在,不催。</p>' +
    '<div class="actions"><button class="ghost" id="back">回到开头</button></div></div>';
  document.getElementById("back").onclick = boot;
}

/* ---------- 屏 2 · 落子 session(一次一卡) ---------- */
function startSession() {
  queue = st.pending.slice();
  idx = 0; decided = 0; sessionStart = Date.now();
  showCard();
}
function showCard() {
  if (idx >= queue.length) return renderDone();
  currentView = "session";
  var c = queue[idx];
  if (!presentedOnce[c.id]) {
    presentedOnce[c.id] = true;
    post("/api/presented", { cardId: c.id }); // 卡实际上屏 → 静默计时起点
  }
  var html = '<div class="card">' +
    '<div class="meta"><span class="chip">' + esc(c.category) + "</span>" +
    (c.stakes && STAKES_LABEL[c.stakes] ? '<span class="chip">' + STAKES_LABEL[c.stakes] + "</span>" : "") +
    (c.estSeconds ? "<span>约 " + c.estSeconds + " 秒</span>" : "") +
    '<span style="margin-left:auto">第 ' + (idx + 1) + " / " + queue.length + " 张</span></div>" +
    "<h1>" + esc(c.title) + "</h1>" +
    (c.summary ? "<p>" + esc(c.summary) + "</p>" : "");
  if (c.whyNow) html += "<h2>为什么现在</h2><p>" + esc(c.whyNow) + "</p>";
  if (c.context) { // #21 question 通道的往返:你问过 → 它带着解释回来了
    html += "<h2>你问过</h2>" +
      '<div class="quote">' + esc(c.context.question) + "</div>" +
      "<p>" + esc(c.context.answer) + "</p>";
  }
  if (c.recommendation) {
    var lbl = { accept: "接受", park: "搁置", reject: "拒绝" }[c.recommendation.choice];
    html += '<h2>建议</h2><p><span class="rec-' + c.recommendation.choice + '">' + lbl +
      "</span> —— " + esc(c.recommendation.reason) + "</p>";
  }
  html += "<h2>拍板后会发生什么</h2>";
  if (c.onAccept) html += "<p>" + esc(c.onAccept) + "</p>";
  html += '<p class="muted">改 <code>' + esc(c.diff.file) + "</code>（" + c.diff.hunks.length +
    " 处最小改动）;git 提交,可回滚。</p>";
  html += '<div class="actions">' +
    '<button class="primary" data-choice="accept"><kbd>a</kbd>接受</button>' +
    '<button data-choice="park"><kbd>p</kbd>搁置</button>' +
    '<button data-choice="reject"><kbd>r</kbd>拒绝</button>' +
    '<button class="ghost" id="fix">输入修正…</button>' +
    '<button class="ghost" id="ask"><kbd>q</kbd>问一句…</button></div>' +
    '<input id="note" class="notebox" placeholder="为什么?(可选——park/reject 的理由是最珍贵的 taste 数据)">' +
    '<div id="msg"></div><div id="corr"></div>';
  html += '<details><summary>证据（展开核查）</summary>';
  for (var i = 0; i < c.evidence.length; i++) {
    var e = c.evidence[i];
    html += '<div class="ev"><span class="path">' + esc(e.path) + (e.locator ? " · " + esc(e.locator) : "") +
      "</span>" + (e.note ? " — " + esc(e.note) : "");
    if (e.quote) html += '<div class="quote">' + esc(e.quote) + "</div>";
    html += "</div>";
  }
  html += "</details>";
  html += '<details><summary>最小 diff · <code>' + esc(c.diff.file) + "</code></summary><pre class=\\"diff\\">";
  for (var j = 0; j < c.diff.hunks.length; j++) {
    var h = c.diff.hunks[j];
    if (h.locator) html += '<span class="loc">@@ ' + esc(h.locator) + " @@</span>\\n";
    if (h.before) html += '<span class="del">- ' + esc(h.before).replace(/\\n/g, "\\n- ") + "</span>\\n";
    if (h.after) html += '<span class="add">+ ' + esc(h.after).replace(/\\n/g, "\\n+ ") + "</span>\\n";
  }
  html += "</pre></details></div>";
  view.innerHTML = html;
  var btns = view.querySelectorAll("button[data-choice]");
  for (var k = 0; k < btns.length; k++) {
    btns[k].onclick = (function (ch) { return function () { decide(ch, null); }; })(btns[k].getAttribute("data-choice"));
  }
  document.getElementById("fix").onclick = function () { renderCorrection(c); };
  document.getElementById("ask").onclick = function () { renderAsk(c); };
}
/* #21 question 通道:correction 的双胞胎——correction 改 diff,question 改 context。
   发问不落子:卡退回待补态,下一轮 run 带着世界层解释重新出现(同指纹,不算重复)。 */
function renderAsk(c) {
  var box = document.getElementById("corr");
  box.innerHTML = '<div class="correction">' +
    '<p class="muted">哪里没说清?问一句。这张卡先退回去,下一轮扫描会带着解释重新出现——不落子,不催你。</p>' +
    '<textarea id="ask-q" rows="2" placeholder="例:这件事在我的世界里对应什么?"></textarea>' +
    '<div class="actions"><button class="primary" id="ask-send">发问,先不落子</button>' +
    '<button class="ghost" id="ask-cancel">收起</button></div></div>';
  document.getElementById("ask-q").focus();
  document.getElementById("ask-cancel").onclick = function () { box.innerHTML = ""; };
  document.getElementById("ask-send").onclick = function () {
    var q = document.getElementById("ask-q").value.trim();
    if (!q) return;
    post("/api/question", { cardId: c.id, question: q }).then(function (r) {
      var msg = document.getElementById("msg");
      if (!r.ok) {
        msg.innerHTML = '<div class="banner">' + esc(r.data.error || "发问失败") + "</div>";
        return;
      }
      box.innerHTML = "";
      msg.innerHTML = '<div class="toast">记下了。这张卡退回队列,下一轮会带着解释回来。</div>';
      setTimeout(function () { idx++; showCard(); }, 900);
    });
  };
}
function renderCorrection(c) {
  var box = document.getElementById("corr");
  var html = '<div class="correction"><p class="muted">修正 diff(编辑替换后的内容;before 必须原样匹配文件):</p>';
  for (var i = 0; i < c.diff.hunks.length; i++) {
    var h = c.diff.hunks[i];
    html += (h.locator ? '<p class="muted">@@ ' + esc(h.locator) + " @@</p>" : "") +
      '<div class="before">- ' + esc(h.before) + "</div>" +
      '<textarea data-hunk="' + i + '" rows="2">' + esc(h.after) + "</textarea>";
  }
  html += '<input id="corr-note" placeholder="一句话说明为什么改(可空;这是 taste 的原料)">' +
    '<div class="actions"><button class="primary" id="corr-accept">以修正后内容接受</button>' +
    '<button class="ghost" id="corr-cancel">收起</button></div></div>';
  box.innerHTML = html;
  document.getElementById("corr-cancel").onclick = function () { box.innerHTML = ""; };
  document.getElementById("corr-accept").onclick = function () {
    var hunks = [];
    var tas = box.querySelectorAll("textarea[data-hunk]");
    for (var j = 0; j < tas.length; j++) {
      var orig = c.diff.hunks[Number(tas[j].getAttribute("data-hunk"))];
      var edited = { before: orig.before, after: tas[j].value };
      if (orig.locator) edited.locator = orig.locator;
      hunks.push(edited);
    }
    var note = document.getElementById("corr-note").value.trim();
    decide("accept", { hunks: hunks, note: note || undefined });
  };
}
var advanceTimer = null; // #24 撤销窗口:toast 停 4s,期间可撤,之后自动进下一张
function decide(choice, correction) {
  var c = queue[idx];
  var body = { cardId: c.id, choice: choice };
  var noteEl = document.getElementById("note");
  if (noteEl && noteEl.value.trim()) body.note = noteEl.value.trim(); // #24:理由随任意手势
  if (correction) body.correction = correction;
  post("/api/decide", body).then(function (r) {
    var msg = document.getElementById("msg");
    if (!r.ok) {
      msg.innerHTML = '<div class="banner">' + esc(r.data.error || "落子失败") + "</div>";
      return;
    }
    decided++;
    // 落子已生效:封住手势,防止撤销窗口期的二次按键
    var btns = view.querySelectorAll("button[data-choice], #fix, #ask");
    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
    var took = r.data.latencyMs != null ? " · " + fmtSecs(r.data.latencyMs) : ""; // #19:本次用时上屏
    var text = choice === "accept"
      ? "已接受 · commit " + esc(r.data.executed || "?") + took + " · 可回滚"
      : (choice === "park" ? "已搁置" : "已拒绝") + took;
    msg.innerHTML = '<div class="toast">' + text + '<button id="undo"><kbd>u</kbd>撤销</button></div>';
    advanceTimer = setTimeout(function () { advanceTimer = null; idx++; showCard(); }, 4000);
    document.getElementById("undo").onclick = function () {
      if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
      post("/api/undo", { cardId: c.id }).then(function (u) {
        if (!u.ok) {
          msg.innerHTML = '<div class="banner">' + esc(u.data.error || "撤销失败") + "</div>";
          setTimeout(function () { idx++; showCard(); }, 1200);
          return;
        }
        decided--;
        presentedOnce[c.id] = false; // 重新上屏 = presented 重报,计时重新起点(诚实延迟)
        showCard();
      });
    };
  });
}
function renderDone() {
  currentView = "done";
  var secs = Math.round((Date.now() - sessionStart) / 1000);
  var mm = Math.floor(secs / 60), ss = secs % 60;
  var html = '<div class="card"><h1>落完了</h1><p>' + decided + " 张 · 用时 " +
    (mm ? mm + " 分 " : "") + ss + ' 秒。今天到此为止。</p><div class="actions">';
  if (st.stateDiff) html += '<button id="sd">看 State Diff</button>';
  html += '<button id="mx">看 Metrics</button>';
  html += '<button class="ghost" id="back">回到开头</button></div></div>';
  view.innerHTML = html;
  var sd = document.getElementById("sd");
  if (sd) sd.onclick = function () { renderStateDiff("done"); };
  document.getElementById("mx").onclick = function () { renderMetrics("done"); };
  document.getElementById("back").onclick = boot;
}

/* ---------- 屏 3 · State Diff(只读) ---------- */
function renderStateDiff(backTo) {
  currentView = "statediff";
  var md = st.stateDiff.markdown;
  var body = md.replace(/^---[\\s\\S]*?---\\n/, "");
  var out = "";
  var paras = body.split(/\\n\\n+/);
  for (var i = 0; i < paras.length; i++) {
    var p = paras[i].trim();
    if (!p) continue;
    if (p.indexOf("# ") === 0) out += "<h1>" + inline(p.slice(2)) + "</h1>";
    else out += "<p>" + inline(p).replace(/^<strong>([^<]+)<\\/strong>[::]/, "<strong>$1</strong>") + "</p>";
  }
  view.innerHTML = '<div class="card sd">' + out +
    '<div class="actions"><button class="ghost" id="back">回去</button></div></div>';
  document.getElementById("back").onclick = backTo === "done" ? renderDone : renderCatchup;
}

/* ---------- 屏 Metrics(#19):时延中位数 + 分布、重复率曲线——数据早已在盘 ---------- */
function renderMetrics(backTo) {
  // 现取现算(落完子来看,数字必须含刚落的这批)
  fetch("/api/state").then(function (r) { return r.json(); }).then(function (s) {
    st = s;
    currentView = "metrics";
    var m = st.metrics;
    var html = '<div class="card"><h1>Metrics</h1>';
    html += "<p>" + m.decided.total + " 次落子:接受 " + m.decided.accept + " · 搁置 " + m.decided.park +
      " · 拒绝 " + m.decided.reject + (m.questions ? " · 发问 " + m.questions : "") + "</p>";
    if (m.cognition) { // #18:认知含量——方向审计的常驻仪表
      var cg = m.cognition;
      var cgTotal = cg.thought + cg.action + cg.ledger;
      if (cgTotal > 0) {
        html += '<p class="muted" style="font-size:13px">认知含量:思想 ' + cg.thought + " · 行动 " + cg.action +
          " · 账本 " + cg.ledger + "(思想卡占比 " + Math.round((cg.thought / cgTotal) * 100) + "%)</p>";
      }
    }

    html += "<h2>time-to-decision</h2>";
    if (m.latency.count === 0) {
      html += '<p class="muted">还没有现场计时的落子。</p>';
    } else {
      html += '<p><span class="big">中位 ' + fmtSecs(m.latency.medianMs) + "</span>" +
        '<span class="muted"> · ' + m.latency.count + " 次现场计时</span></p>";
      var recent = m.latency.recent;
      var maxMs = 1;
      for (var i = 0; i < recent.length; i++) if (recent[i].latencyMs > maxMs) maxMs = recent[i].latencyMs;
      for (var j = 0; j < recent.length; j++) {
        var d = recent[j];
        var pct = Math.max(2, Math.round((d.latencyMs / maxMs) * 100));
        html += '<div class="mrow"><span class="mdate">' + esc(mmdd(d.ts)) + "</span>" + // #25:本地时区
          '<span class="mtrack"><span class="mbar mbar-' + esc(d.choice) + '" style="width:' + pct + '%"></span></span>' +
          '<span class="mval">' + fmtSecs(d.latencyMs) + "</span></div>";
      }
    }

    html += "<h2>重复率</h2>";
    if (m.runs.length === 0) {
      html += '<p class="muted">还没跑过扫描。</p>';
    } else {
      var t = m.totals;
      var ratePct = t.proposed ? Math.round((t.suppressedPlusDup / t.proposed) * 100) : 0;
      html += "<p>累计 " + m.runs.length + " 轮:提出 " + t.proposed + ",抑制+重复 " + t.suppressedPlusDup +
        (t.proposed ? "(" + ratePct + "%)" : "") + "</p>";
      var runs = m.runs.slice(-15);
      var maxP = 1;
      for (var a = 0; a < runs.length; a++) if (runs[a].proposed > maxP) maxP = runs[a].proposed;
      for (var b = 0; b < runs.length; b++) {
        var run = runs[b];
        var sup = run.suppressed + run.dup;
        var wp = Math.round((run.presented / maxP) * 100);
        var ws = Math.round((sup / maxP) * 100);
        html += '<div class="mrow"><span class="mdate">' + esc(String(run.date).slice(5)) + "</span>" +
          '<span class="mtrack">' +
          (run.presented ? '<span class="seg segp" style="width:' + wp + '%"></span>' : "") +
          (sup ? '<span class="seg segs" style="width:' + ws + '%"></span>' : "") +
          "</span>" +
          '<span class="mval">' + run.presented + " 入列 · " + sup + " 抑</span></div>";
      }
      html += '<p class="muted" style="font-size:12px">绿 = 入列呈现;灰 = 指纹抑制 + 重复丢弃;每行一轮。</p>';
      var ill = 0, ref = 0;
      for (var e2 = 0; e2 < m.runs.length; e2++) { ill += m.runs[e2].illegible || 0; ref += m.runs[e2].refaced || 0; }
      if (ill || ref) html += '<p class="muted" style="font-size:12px">世界层闸命中 ' + ill + " · 问答往返 " + ref + "。</p>";
    }

    html += '<div class="actions"><button class="ghost" id="back">回去</button></div></div>';
    view.innerHTML = html;
    document.getElementById("back").onclick = backTo === "done" ? renderDone : renderCatchup;
  });
}

/* ---------- 键盘:a / p / r(输入框里不劫持) ---------- */
document.addEventListener("keydown", function (ev) {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  var t = ev.target;
  if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
  if (ev.key === "u") { // #24:撤销窗口期内单键撤
    var undo = document.getElementById("undo");
    if (undo) { ev.preventDefault(); undo.click(); }
    return;
  }
  var gesture = view.querySelector("button[data-choice]");
  if (!gesture || gesture.disabled) return;
  var map = { a: "accept", p: "park", r: "reject" };
  if (map[ev.key]) { ev.preventDefault(); decide(map[ev.key], null); }
  if (ev.key === "q") { // #21:问一句
    var ask = document.getElementById("ask");
    if (ask) { ev.preventDefault(); ask.click(); }
  }
});

/* ---------- wake-catchup(#16):先渲染旧状态,后台增量刷新 ---------- */
function triggerRefresh() {
  post("/api/refresh", {}).then(function (r) {
    if (r.ok) pollFreshness();
  });
}
function pollFreshness() {
  if (polling) return;
  polling = true;
  var tick = function () {
    fetch("/api/state").then(function (r) { return r.json(); }).then(function (s) {
      st = s;
      if (currentView === "catchup") renderCatchup(); // 落子中不打扰,session 快照不动
      if (s.freshness && s.freshness.refreshing) setTimeout(tick, 4000);
      else polling = false;
    });
  };
  setTimeout(tick, 4000);
}

function boot() {
  lastBoot = Date.now();
  fetch("/api/state").then(function (r) { return r.json(); }).then(function (s) {
    st = s;
    renderCatchup();
    triggerRefresh(); // console 打开 = 用户来了 = 合法拉取时刻
  });
}
// 常开 tab 的开盖路径:回到可见且离上次投影超过 1 分钟 → 重新投影 + 补扫
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState !== "visible") return;
  if (Date.now() - lastBoot < 60000) return;
  if (currentView === "session" || currentView === "statediff") return; // 不打断阅读与落子
  boot();
});
boot();
</script>
</body>
</html>
`;
}
