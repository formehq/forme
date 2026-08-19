#!/bin/sh
set -eu

if [ "${1-}" != "check" ] || [ "$#" -ne 1 ]; then
  exit 64
fi
if [ -z "${FORME_CONSTRUCTION_TEMP_ROOT-}" ] || [ ! -d "$FORME_CONSTRUCTION_TEMP_ROOT" ]; then
  exit 65
fi
if [ -z "${HOME-}" ] || [ -z "${TMPDIR-}" ] || [ -z "${SDKROOT-}" ]; then
  exit 66
fi

scratch="$FORME_CONSTRUCTION_TEMP_ROOT/macos-swift"
if [ -e "$scratch" ]; then
  exit 67
fi

/bin/mkdir -m 0700 "$scratch"
cleanup() {
  /bin/rm -rf "$scratch"
}
trap cleanup EXIT HUP INT TERM

/usr/bin/swift build \
  --package-path native/macos \
  --configuration release \
  --scratch-path "$scratch"

/usr/bin/swift test \
  --package-path native/macos \
  --scratch-path "$scratch"

/usr/bin/printf '%s\n' '{"schemaVersion":"r4_gate_b_macos_construction.v1","status":"GREEN_COMPILE_AND_UNIT_ONLY","signedAppCreated":false,"certificateCreated":false,"keychainOperations":0,"secureEnclaveOperations":0,"userPresencePrompts":0,"seatbeltChildren":0,"providerCalls":0,"cleanupPassed":true}'
