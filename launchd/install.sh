#!/bin/sh
# Forme white-glove installer (#28). Safe to rerun: render, bootout, bootstrap.
set -eu

usage() {
  cat <<'EOF'
Usage:
  FORME_VAULT=/path/to/vault launchd/install.sh [options]
  launchd/install.sh /path/to/vault [runner-hour] [state-diff-hour]

Options:
  --vault PATH               Vault path (or FORME_VAULT)
  --auth auto|chatgpt|api-key|skip
                             Authentication path (default: auto)
  --runner-hour HOUR         Daily runner hour, 0-23 (default: 9)
  --statediff-hour HOUR      Sunday State Diff hour, 0-23 (default: 18)
  --port PORT                Local console port (default: 6180)
  --slow-root PATH           Relative slow-layer root; auto-detected by default
  --preflight                Check prerequisites/auth only; write nothing
  --dry-run                  Alias for --preflight
  --no-launch                Render plists but do not load launchd jobs
  --skip-smoke               Skip the tiny real Codex auth call
  --skip-first-run           Do not run the conservative first scan
  --skip-npm                 Do not install missing npm dependencies
  --no-open                  Do not open the console after install
  -h, --help                 Show this help

API-key path (the key is never written to a plist):
  export OPENAI_API_KEY='...'
  FORME_AUTH=api-key FORME_VAULT=/path/to/vault launchd/install.sh
EOF
}

REPO="$(cd "$(dirname "$0")/.." && pwd -P)"
VAULT="${FORME_VAULT:-}"
AUTH="${FORME_AUTH:-auto}"
HOUR="${FORME_RUNNER_HOUR:-9}"
SD_HOUR="${FORME_STATEDIFF_HOUR:-18}"
PORT="${FORME_PORT:-6180}"
SLOW_ROOT="${FORME_SLOW_ROOT:-}"
PRECHECK=0
NO_LAUNCH="${FORME_NO_LAUNCH:-0}"
SKIP_SMOKE="${FORME_SKIP_CODEX_SMOKE:-0}"
SKIP_FIRST_RUN="${FORME_SKIP_FIRST_RUN:-0}"
SKIP_NPM="${FORME_SKIP_NPM:-0}"
NO_OPEN="${FORME_NO_OPEN:-0}"
POSITIONAL=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --vault) [ "$#" -ge 2 ] || { usage >&2; exit 2; }; VAULT="$2"; shift 2 ;;
    --auth) [ "$#" -ge 2 ] || { usage >&2; exit 2; }; AUTH="$2"; shift 2 ;;
    --runner-hour) [ "$#" -ge 2 ] || { usage >&2; exit 2; }; HOUR="$2"; shift 2 ;;
    --statediff-hour) [ "$#" -ge 2 ] || { usage >&2; exit 2; }; SD_HOUR="$2"; shift 2 ;;
    --port) [ "$#" -ge 2 ] || { usage >&2; exit 2; }; PORT="$2"; shift 2 ;;
    --slow-root) [ "$#" -ge 2 ] || { usage >&2; exit 2; }; SLOW_ROOT="$2"; shift 2 ;;
    --preflight|--dry-run) PRECHECK=1; NO_LAUNCH=1; SKIP_SMOKE=1; SKIP_FIRST_RUN=1; SKIP_NPM=1; NO_OPEN=1; shift ;;
    --no-launch) NO_LAUNCH=1; NO_OPEN=1; shift ;;
    --skip-smoke) SKIP_SMOKE=1; shift ;;
    --skip-first-run) SKIP_FIRST_RUN=1; shift ;;
    --skip-npm) SKIP_NPM=1; shift ;;
    --no-open) NO_OPEN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "forme install: unknown option: $1" >&2; usage >&2; exit 2 ;;
    *)
      case "$POSITIONAL" in
        0) VAULT="$1" ;;
        1) HOUR="$1" ;;
        2) SD_HOUR="$1" ;;
        *) echo "forme install: too many positional arguments" >&2; usage >&2; exit 2 ;;
      esac
      POSITIONAL=$((POSITIONAL + 1))
      shift
      ;;
  esac
done

fail() { echo "forme install: $*" >&2; exit 1; }
say() { echo "[forme] $*"; }
valid_hour() {
  case "$1" in *[!0-9]*|'') return 1 ;; esac
  [ "$1" -ge 0 ] && [ "$1" -le 23 ]
}
valid_port() {
  case "$1" in *[!0-9]*|'') return 1 ;; esac
  [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

[ "$(uname -s)" = "Darwin" ] || fail "macOS is required for the launchd installer"
[ -n "$VAULT" ] || { usage >&2; exit 2; }
[ -d "$VAULT" ] || fail "vault does not exist: $VAULT"
VAULT="$(cd "$VAULT" && pwd -P)"
[ -d "$VAULT/.git" ] || fail "vault must be a git repository: $VAULT"
git -C "$VAULT" rev-parse --verify HEAD >/dev/null 2>&1 || fail "vault needs at least one git commit"
valid_hour "$HOUR" || fail "runner hour must be 0-23"
valid_hour "$SD_HOUR" || fail "State Diff hour must be 0-23"
valid_port "$PORT" || fail "console port must be 1-65535"
case "$AUTH" in auto|chatgpt|api-key|skip) ;; *) fail "auth must be auto, chatgpt, api-key, or skip" ;; esac

NODE_BIN="$(command -v node 2>/dev/null || true)"
[ -n "$NODE_BIN" ] || fail "Node.js is missing (need >=22.18)"
"$NODE_BIN" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)' ||
  fail "Node.js $("$NODE_BIN" --version) is too old (need >=22.18)"
# BSD readlink has no -f. Let Node resolve its own binary portably on macOS.
NODE_REAL="$("$NODE_BIN" -e 'console.log(require("node:fs").realpathSync(process.argv[1]))' "$NODE_BIN")"
CODEX_BIN="$(command -v codex 2>/dev/null || true)"
[ -n "$CODEX_BIN" ] || fail "Codex CLI is missing (install it before Forme)"
NPM_BIN="$(command -v npm 2>/dev/null || true)"

MARKDOWN_COUNT="$(git -C "$VAULT" ls-files '*.md' | awk 'NF { n++ } END { print n+0 }')"
[ "$MARKDOWN_COUNT" -gt 0 ] || say "warning: vault has no tracked Markdown yet; install can continue, but no card can be proposed"

AUTH_STATUS=""
case "$AUTH" in
  chatgpt)
    AUTH_STATUS="$(OPENAI_API_KEY= "$CODEX_BIN" login status 2>&1 || true)"
    echo "$AUTH_STATUS" | grep -q "ChatGPT" || fail "ChatGPT auth not ready; run: codex login --device-auth"
    ;;
  api-key)
    [ -n "${OPENAI_API_KEY:-}" ] || fail "OPENAI_API_KEY is required for --auth api-key"
    if [ "$PRECHECK" -eq 0 ]; then
      say "logging Codex in with API key via stdin (the key is not stored in Forme files)"
      printf '%s' "$OPENAI_API_KEY" | OPENAI_API_KEY= "$CODEX_BIN" login --with-api-key >/dev/null
      unset OPENAI_API_KEY 2>/dev/null || true
      AUTH_STATUS="$("$CODEX_BIN" login status 2>&1 || true)"
      echo "$AUTH_STATUS" | grep -qi "API key" || fail "Codex did not confirm API-key login"
    fi
    ;;
  auto)
    AUTH_STATUS="$(OPENAI_API_KEY= "$CODEX_BIN" login status 2>&1 || true)"
    if [ -z "$AUTH_STATUS" ] || ! echo "$AUTH_STATUS" | grep -q "Logged in"; then
      if [ -n "${OPENAI_API_KEY:-}" ] && [ "$PRECHECK" -eq 0 ]; then
        say "no Codex session found; using OPENAI_API_KEY via stdin"
        printf '%s' "$OPENAI_API_KEY" | OPENAI_API_KEY= "$CODEX_BIN" login --with-api-key >/dev/null
        unset OPENAI_API_KEY 2>/dev/null || true
        AUTH_STATUS="$("$CODEX_BIN" login status 2>&1 || true)"
      else
        fail "Codex auth not ready; run 'codex login --device-auth' or choose FORME_AUTH=api-key"
      fi
    fi
    ;;
  skip) say "authentication check skipped (rehearsal/testing only)" ;;
esac

# No later Codex or Forme child process inherits the caller's API key.
unset OPENAI_API_KEY 2>/dev/null || true
CODEX_VERSION="check skipped"
if [ "$AUTH" != "skip" ]; then CODEX_VERSION="$("$CODEX_BIN" --version)"; fi
say "preflight: Node $("$NODE_REAL" --version), Codex $CODEX_VERSION, git vault with $MARKDOWN_COUNT Markdown file(s)"
[ "$AUTH" = "skip" ] || say "auth: ${AUTH_STATUS:-ready}"
if [ "$PRECHECK" -eq 1 ]; then
  say "preflight passed; no files changed"
  exit 0
fi

if [ "$SKIP_NPM" -eq 0 ] && [ ! -d "$REPO/node_modules/ajv" ]; then
  [ -n "$NPM_BIN" ] || fail "npm is missing and dependencies are not installed"
  say "installing pinned npm dependencies"
  (cd "$REPO" && "$NPM_BIN" ci --ignore-scripts)
fi

OUTDIR="$VAULT/98_Forme"
mkdir -p "$OUTDIR/cards"
LOGDIR="${FORME_LOG_DIR:-$HOME/Library/Logs/forme}"
INSTALL_DIR="${FORME_INSTALL_DIR:-$HOME/Library/LaunchAgents}"
mkdir -p "$LOGDIR" "$INSTALL_DIR"

if [ -z "$SLOW_ROOT" ]; then
  if [ -d "$VAULT/02_Wiki" ]; then SLOW_ROOT="02_Wiki/"; else SLOW_ROOT="."; fi
fi
case "$SLOW_ROOT" in /*|*../*|../*|..) fail "slow-root must stay inside the vault" ;; esac

PATH_LINE="$(dirname "$NODE_REAL"):$(dirname "$CODEX_BIN"):/usr/bin:/bin"
export FORME_RENDER_NODE="$NODE_REAL"
export FORME_RENDER_PATH="$PATH_LINE"
export FORME_RENDER_REPO="$REPO"
export FORME_RENDER_VAULT="$VAULT"
export FORME_RENDER_HOUR="$HOUR"
export FORME_RENDER_SD_HOUR="$SD_HOUR"
export FORME_RENDER_LOG="$LOGDIR"
export FORME_RENDER_PORT="$PORT"
export FORME_RENDER_SLOW_ROOT="$SLOW_ROOT"

render_one() {
  LABEL="$1"
  PLIST="$INSTALL_DIR/$LABEL.plist"
  TMP_PLIST="$INSTALL_DIR/.$LABEL.plist.$$"
  "$NODE_REAL" "$REPO/launchd/render-plist.ts" "$REPO/launchd/$LABEL.plist.template" > "$TMP_PLIST"
  /usr/bin/plutil -lint "$TMP_PLIST" >/dev/null || { rm -f "$TMP_PLIST"; fail "invalid plist rendered for $LABEL"; }
  mv "$TMP_PLIST" "$PLIST"
  say "rendered: $PLIST"
}

render_one com.forme.runner
render_one com.forme.statediff
render_one com.forme.console

if [ "$SKIP_SMOKE" -eq 0 ] && [ "$AUTH" != "skip" ]; then
  SMOKE_OUT="$(mktemp "${TMPDIR:-/tmp}/forme-smoke.XXXXXX")"
  SMOKE_LOG="$(mktemp "${TMPDIR:-/tmp}/forme-smoke-log.XXXXXX")"
  trap 'rm -f "${SMOKE_OUT:-}" "${SMOKE_LOG:-}"' EXIT HUP INT TERM
  say "Codex smoke: one tiny real read-only call"
  if ! "$CODEX_BIN" exec --ephemeral --ignore-rules --sandbox read-only -C "$VAULT" --skip-git-repo-check \
    -o "$SMOKE_OUT" "Reply exactly FORME_READY. Do not use tools." >"$SMOKE_LOG" 2>&1; then
    tail -n 20 "$SMOKE_LOG" >&2
    fail "Codex smoke failed"
  fi
  grep -qx "FORME_READY" "$SMOKE_OUT" || fail "Codex smoke returned an unexpected response"
  rm -f "$SMOKE_OUT" "$SMOKE_LOG"
  trap - EXIT HUP INT TERM
fi

if [ "$SKIP_FIRST_RUN" -eq 0 ]; then
  say "first scan: recent 12 commits, at most 2 cards (cold-start throttle)"
  "$NODE_REAL" "$REPO/runner/index.ts" --vault "$VAULT" --commits 12 --max-files 24 --max-cards 2 --slow-layer 0
fi

if [ "$NO_LAUNCH" -eq 0 ]; then
  UID_NOW="$(id -u)"
  for LABEL in com.forme.runner com.forme.statediff com.forme.console; do
    launchctl bootout "gui/$UID_NOW/$LABEL" 2>/dev/null || true
    launchctl bootstrap "gui/$UID_NOW" "$INSTALL_DIR/$LABEL.plist"
    say "loaded: $LABEL"
  done

  if command -v curl >/dev/null 2>&1; then
    ATTEMPT=0
    until curl -fsS "http://127.0.0.1:$PORT/api/state" >/dev/null 2>&1; do
      ATTEMPT=$((ATTEMPT + 1))
      [ "$ATTEMPT" -lt 20 ] || fail "console did not become healthy within 10 seconds; check $LOGDIR/console.log"
      sleep 0.5
    done
    say "console healthy: http://127.0.0.1:$PORT"
  fi
  if [ "$NO_OPEN" -eq 0 ] && command -v open >/dev/null 2>&1; then open "http://127.0.0.1:$PORT"; fi
else
  say "launchd load skipped; rendered plists are ready for inspection"
fi

CARD_COUNT="$(find "$OUTDIR/cards" -type f -name '*.json' 2>/dev/null | awk 'END { print NR+0 }')"
say "ready: $CARD_COUNT card(s) on disk; runtime data stays in $OUTDIR"
say "schedule: runner ${HOUR}:00 daily; State Diff Sunday ${SD_HOUR}:00; slow layer '$SLOW_ROOT'"
say "logs: $LOGDIR"
say "uninstall: $REPO/launchd/uninstall.sh"
