# Mobile dependencies & deprecations

## Install (standalone app, no monorepo)

This app does **not** use `@mahfil/api-sdk` or `@mahfil/types`. Use **yarn**:

```bash
cd apps/mobile
yarn install
```

API types live in `src/types/api.ts`; the API client is in `src/api/createApiClient.ts` and `src/api/client.ts`.

## Removed (were deprecated)

| Package | Reason |
|--------|--------|
| `@testing-library/jest-native` | Unmaintained; RNTL v12.4+ ships [built-in Jest matchers](https://callstack.github.io/react-native-testing-library/docs/migration/jest-matchers) when you import `@testing-library/react-native`. |
| `@types/react-native` | Stub types; React Native ships its own TypeScript types. |

## Still showing as deprecated (transitive / ecosystem)

Yarn may still warn about **transitive** packages (e.g. `glob@7`, `rimraf@2`, `fstream`). Those come from older tools in the tree; upgrading them needs upstream releases.

**ESLint 8** is deprecated, but **`@react-native/eslint-config@0.80`** and **`eslint-plugin-react-native@4`** currently declare peers for ESLint 8 only. Moving to ESLint 9 requires flat config + plugins that support ESLint 9; track React Native releases for that.

## Android / `Cannot find module '.../react-native/cli.js'`

Usually a **broken symlink** after lockfile changes: `apps/mobile/node_modules/react-native` pointed at an old pnpm path.

**Fix:** from `apps/mobile`:

```bash
rm -rf node_modules
yarn install
yarn android
```

`preandroid` runs a small check before `react-native run-android`.

## Husky

`prepare: husky` was removed from this package so installs don’t fail when `apps/mobile` has no `.git` (monorepo git root is the repo root). Enable Husky from the **repo root** if you want git hooks.
