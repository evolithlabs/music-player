# Groovio Music (groovio-music)

Music Player

## Android development (WSL + Windows emulator)

Keep the workspace folders together:

```text
music-player/
music-service/
capacitor-plugins/
  capacitor-mediastore/
  capacitor-music-controls-plugin-fork/
```

Both custom plugins are local file dependencies. They are built into the
Android app and do not need separate servers.

On this machine, Android Studio and the `Groovio_API_35` emulator run on Windows.
Java 21 and Android SDK 35 for builds are installed in WSL under
`~/.local/share/music-android/{jdk,sdk}`. Override `JAVA_HOME` and `ANDROID_HOME`
if installed elsewhere. Windows SDK discovery is automatic, or set
`WINDOWS_ANDROID_SDK` to its WSL path.

Start the emulator in Android Studio's Device Manager. Start the backend in
another WSL terminal:

```bash
cd ../music-service
bash scripts/dev.sh
```

Then build and launch the Android app from this folder:

```bash
pnpm android:local
```

The script rebuilds both plugins, builds and installs a debug APK, and forwards
port 8090 to the local backend. It preserves the app's data when reinstalling.
If needed, set `ANDROID_SERIAL` to the device reported by `adb devices`.
Allow music/audio access on the first launch so the library scanner can run.

For a fresh checkout, run `pnpm install` in each plugin folder first, then in
this folder and `src-capacitor`. This project uses pnpm 10. The debug APK is at
`src-capacitor/android/app/build/outputs/apk/debug/app-debug.apk`.

The Android debug configuration permits local HTTP API access. Release builds
retain the normal secure transport configuration. `API_URL` defaults to
`http://127.0.0.1:8090/api/` in the local Android script; it can be overridden.
The browser preview does not provide native SQLite and phone media scanning.

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
