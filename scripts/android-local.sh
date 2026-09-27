#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/share/music-android/jdk}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/.local/share/music-android/sdk}"
export PATH="$JAVA_HOME/bin:$PATH"
export API_URL="${API_URL:-http://127.0.0.1:8090/api/}"

if [[ -z "${WINDOWS_ANDROID_SDK:-}" ]]; then
  windows_app_data=$(cd /mnt/c && cmd.exe /c echo %LOCALAPPDATA% 2>/dev/null | tr -d '\r')
  WINDOWS_ANDROID_SDK="$(wslpath -u "$windows_app_data")/Android/Sdk"
fi
adb="$WINDOWS_ANDROID_SDK/platform-tools/adb.exe"
device="${ANDROID_SERIAL:-emulator-5554}"

if [[ ! -x "$JAVA_HOME/bin/java" || ! -x "$adb" ]]; then
  echo 'Set JAVA_HOME, ANDROID_HOME and WINDOWS_ANDROID_SDK to the installed toolchains.' >&2
  exit 1
fi
if [[ "$("$adb" -s "$device" get-state 2>/dev/null | tr -d '\r')" != device ]]; then
  echo 'Start Groovio_API_35 in Android Studio Device Manager first.' >&2
  exit 1
fi

pnpm --dir ../capacitor-plugins/capacitor-mediastore build
pnpm --dir ../capacitor-plugins/capacitor-music-controls-plugin-fork build
# Refresh the installed file dependencies after rebuilding their output.
pnpm install --no-frozen-lockfile
pnpm --dir src-capacitor install --no-frozen-lockfile
pnpm exec quasar build -m capacitor -T android --skip-pkg

printf 'sdk.dir=%s\n' "$ANDROID_HOME" > src-capacitor/android/local.properties
(cd src-capacitor/android && bash gradlew assembleDebug --console=plain)

apk="$(wslpath -w "$PWD/src-capacitor/android/app/build/outputs/apk/debug/app-debug.apk")"
"$adb" -s "$device" install -r "$apk"
"$adb" -s "$device" reverse tcp:8090 tcp:8090
"$adb" -s "$device" shell am start -n org.capacitor.quasar.app/.MainActivity

echo 'Groovio is running. The backend should be listening on localhost:8090.'
