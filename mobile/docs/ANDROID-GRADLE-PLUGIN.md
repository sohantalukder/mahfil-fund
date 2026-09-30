# Why you need `@react-native/gradle-plugin`

## What it is

The npm package **`@react-native/gradle-plugin`** (same version as `react-native`, e.g. **0.80.1**) is **not** optional for Android. It is a **Gradle composite build** that ships:

| Gradle plugin id | Role |
|------------------|------|
| **`com.facebook.react.settings`** | Loaded in `settings.gradle` — autolinking, RN settings |
| **`com.facebook.react`** | Applied on `:app` — bundling, Hermes, etc. |
| **`com.facebook.react.rootproject`** | Root `build.gradle` |

Without this package on disk, Gradle cannot apply `plugins { id("com.facebook.react.settings") }` → **“Plugin was not found”**.

## What you must have

1. In **`mobile/package.json`** → **devDependencies**:
   ```json
   "@react-native/gradle-plugin": "0.80.1"
   ```
   (Match your `react-native` version.)

2. After install, this folder must exist:
   ```text
   mobile/node_modules/@react-native/gradle-plugin
   ```
   (Often a symlink into pnpm’s store — that’s fine.)

3. From **mobile**:
   ```bash
   pnpm install
   ```

4. **`android/settings.gradle`** must call **`pluginManagement { includeBuild(...) }` first**, pointing at that folder (see repo file). Gradle requires that block before anything else.

## If you still see “plugin not found”

- Run: `ls mobile/node_modules/@react-native/gradle-plugin` — must list `settings.gradle.kts`, subfolders `settings-plugin`, etc.
- Reinstall: `pnpm install --frozen-lockfile` from the repository root.
- Stop Gradle daemons: `cd mobile/android && ./gradlew --stop`
