#!/bin/sh
# Run before the user's white-glove stopwatch. Updates Codex, then proves that
# the selected CLI is current enough to run the user's configured model.
set -eu

usage() {
  cat <<'EOF'
Usage: launchd/prepare-codex.sh [--verify-only]

Default: run the official `codex update`, then verify the installed version
against `codex doctor --json`. Use --verify-only to check without modifying the
Codex installation.
EOF
}

VERIFY_ONLY=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --verify-only) VERIFY_ONLY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "forme prepare: unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

fail() { echo "forme prepare: $*" >&2; exit 1; }
say() { echo "[forme prepare] $*"; }

[ "$(uname -s)" = "Darwin" ] || fail "macOS is required"
REPO="$(cd "$(dirname "$0")/.." && pwd -P)"
NODE_BIN="${FORME_NODE_BIN:-$(command -v node 2>/dev/null || true)}"
CODEX_BIN="${FORME_CODEX_BIN:-$(command -v codex 2>/dev/null || true)}"
[ -n "$NODE_BIN" ] || fail "Node.js is missing (need >=22.18)"
[ -n "$CODEX_BIN" ] || fail "Codex CLI is missing; install @openai/codex before the call"

if [ "$VERIFY_ONLY" -eq 0 ]; then
  "$CODEX_BIN" update --help >/dev/null 2>&1 ||
    fail "this Codex is too old to self-update; run 'npm install -g @openai/codex@latest', then rerun"
  say "updating Codex before the user's stopwatch ($("$CODEX_BIN" --version))"
  "$CODEX_BIN" update || fail "Codex update failed; fix it before starting the user's stopwatch"
  hash -r 2>/dev/null || true
  CODEX_BIN="${FORME_CODEX_BIN:-$(command -v codex 2>/dev/null || true)}"
  [ -n "$CODEX_BIN" ] || fail "Codex disappeared from PATH after update"
fi

DOCTOR_JSON="$(mktemp "${TMPDIR:-/tmp}/forme-codex-doctor.XXXXXX")"
DOCTOR_LOG="$(mktemp "${TMPDIR:-/tmp}/forme-codex-doctor-log.XXXXXX")"
trap 'rm -f "$DOCTOR_JSON" "$DOCTOR_LOG"' EXIT HUP INT TERM
# `doctor` reports unrelated terminal warnings through its exit status. Its
# structured update check remains usable, so the parser below owns pass/fail.
OPENAI_API_KEY= "$CODEX_BIN" doctor --json >"$DOCTOR_JSON" 2>"$DOCTOR_LOG" || true
if ! "$NODE_BIN" "$REPO/launchd/codex-preflight.ts" <"$DOCTOR_JSON"; then
  tail -n 20 "$DOCTOR_LOG" >&2
  fail "Codex is not current; rerun without --verify-only before the user's stopwatch"
fi

AUTH_STATUS="$(OPENAI_API_KEY= "$CODEX_BIN" login status 2>&1 || true)"
if echo "$AUTH_STATUS" | grep -q "ChatGPT"; then
  say "ChatGPT-plan sign-in is already ready"
else
  say "Codex version gate passed; ChatGPT device sign-in remains inside the timed rehearsal"
fi
say "Codex preparation passed"
