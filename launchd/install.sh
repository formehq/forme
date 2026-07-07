#!/bin/sh
# 安装/更新 Forme 的 launchd 调度(issue #9 日跑 + #11 周日 State Diff)。
# 重复执行 = 更新(先 bootout 再 bootstrap)。
# 用法:launchd/install.sh <vault 路径> [日跑小时,默认 9] [State Diff 周日小时,默认 18]
# 卸载:for l in com.forme.runner com.forme.statediff; do
#         launchctl bootout gui/$(id -u)/$l; rm ~/Library/LaunchAgents/$l.plist; done
set -eu

REPO="$(cd "$(dirname "$0")/.." && pwd)"
VAULT="${1:?usage: install.sh <vault-path> [runner-hour] [statediff-hour]}"
HOUR="${2:-9}"
SD_HOUR="${3:-18}"
LOGDIR="$HOME/Library/Logs/forme"

NODE_BIN="$(command -v node)" || { echo "node not on PATH" >&2; exit 1; }
NODE_REAL="$(readlink -f "$NODE_BIN")" # plist 里固化真实二进制路径(node 升级后重跑本脚本)
CODEX_BIN="$(command -v codex)" || { echo "codex not on PATH" >&2; exit 1; }
PATH_LINE="$(dirname "$NODE_REAL"):$(dirname "$CODEX_BIN"):/usr/bin:/bin"

mkdir -p "$LOGDIR" "$HOME/Library/LaunchAgents"

install_one() { # $1 = label
  PLIST="$HOME/Library/LaunchAgents/$1.plist"
  sed \
    -e "s|{{NODE}}|$NODE_REAL|g" \
    -e "s|{{PATH}}|$PATH_LINE|g" \
    -e "s|{{REPO}}|$REPO|g" \
    -e "s|{{VAULT}}|$VAULT|g" \
    -e "s|{{HOUR}}|$HOUR|g" \
    -e "s|{{SD_HOUR}}|$SD_HOUR|g" \
    -e "s|{{LOG}}|$LOGDIR|g" \
    "$REPO/launchd/$1.plist.template" > "$PLIST"
  launchctl bootout "gui/$(id -u)/$1" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  echo "installed: $1"
}

install_one com.forme.runner
install_one com.forme.statediff
echo "runner: daily ${HOUR}:00 + vault-commit wake + login catch-up(guard --min-hours 20)"
echo "statediff: Sunday ${SD_HOUR}:00(睡眠错过唤醒补发;guard --min-days 6)"
echo "日志:$LOGDIR/{runner,statediff}.log"
