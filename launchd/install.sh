#!/bin/sh
# 安装/更新 Forme 的 launchd 日跑(issue #9)。重复执行 = 更新(先 bootout 再 bootstrap)。
# 用法:launchd/install.sh <vault 路径> [每日触发小时,默认 9]
# 卸载:launchctl bootout gui/$(id -u)/com.forme.runner && rm ~/Library/LaunchAgents/com.forme.runner.plist
set -eu

REPO="$(cd "$(dirname "$0")/.." && pwd)"
VAULT="${1:?usage: install.sh <vault-path> [hour]}"
HOUR="${2:-9}"
LABEL="com.forme.runner"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOGDIR="$HOME/Library/Logs/forme"

NODE_BIN="$(command -v node)" || { echo "node not on PATH" >&2; exit 1; }
NODE_REAL="$(readlink -f "$NODE_BIN")" # plist 里固化真实二进制路径(node 升级后重跑本脚本)
CODEX_BIN="$(command -v codex)" || { echo "codex not on PATH" >&2; exit 1; }
PATH_LINE="$(dirname "$NODE_REAL"):$(dirname "$CODEX_BIN"):/usr/bin:/bin"

mkdir -p "$LOGDIR" "$HOME/Library/LaunchAgents"
sed \
  -e "s|{{NODE}}|$NODE_REAL|g" \
  -e "s|{{PATH}}|$PATH_LINE|g" \
  -e "s|{{REPO}}|$REPO|g" \
  -e "s|{{VAULT}}|$VAULT|g" \
  -e "s|{{HOUR}}|$HOUR|g" \
  -e "s|{{LOG}}|$LOGDIR|g" \
  "$REPO/launchd/com.forme.runner.plist.template" > "$PLIST"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed: $PLIST (daily ${HOUR}:00 + vault-commit wake + login catch-up; guard --min-hours 20)"
echo "日志:tail -f $LOGDIR/runner.log(RunAtLoad 已拉起一次,守卫决定跑不跑)"
