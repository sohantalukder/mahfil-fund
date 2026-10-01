# Mahfil mobile

## Env

Copy `.env.example` to `.env` in `mobile`:

- `API_URL` — API origin used by the native client (no trailing slash required).

Authentication is API-owned. Access and rotating refresh tokens are stored in the native Keychain/Keystore.

Android release builds require `MAHFIL_UPLOAD_STORE_FILE`, `MAHFIL_UPLOAD_STORE_PASSWORD`, `MAHFIL_UPLOAD_KEY_ALIAS`, and `MAHFIL_UPLOAD_KEY_PASSWORD`. Release builds never fall back to the debug keystore.

## Native

After install: `cd mobile && npx pod-install` (iOS) for `react-native-fs` and other native deps.
