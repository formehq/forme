#!/bin/sh
# Stops Forme jobs and removes their plists. Vault data in 98_Forme/ is retained.
set -eu

PURGE_LOGS=0
case "${1:-}" in
  "") ;;
  --purge-logs) PURGE_LOGS=1 ;;
  -h|--help)
    echo "usage: launchd/uninstall.sh [--purge-logs]"
    echo "Stops jobs and removes plists; never deletes vault/98_Forme."
    exit 0
    ;;
  *) echo "forme uninstall: unknown option: $1" >&2; exit 2 ;;
esac

UID_NOW="$(id -u)"
INSTALL_DIR="${FORME_INSTALL_DIR:-$HOME/Library/LaunchAgents}"
for LABEL in com.forme.runner com.forme.statediff com.forme.console; do
  if [ "${FORME_NO_LAUNCH:-0}" -eq 0 ]; then launchctl bootout "gui/$UID_NOW/$LABEL" 2>/dev/null || true; fi
  rm -f "$INSTALL_DIR/$LABEL.plist"
  echo "removed: $LABEL"
done

if [ "$PURGE_LOGS" -eq 1 ]; then
  rm -rf "${FORME_LOG_DIR:-$HOME/Library/Logs/forme}"
  echo "removed logs"
fi
echo "Forme stopped. Vault runtime data under 98_Forme/ was kept."
