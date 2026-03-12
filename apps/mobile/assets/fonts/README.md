Poppins and Hind Siliguri fonts
================================

This directory is configured in `react-native.config.js` as the source of
custom font assets for the React Native app.

Expected font files (to be added manually):

- `Poppins-Regular.ttf`
- `Poppins-Medium.ttf`
- `Poppins-SemiBold.ttf`
- `Poppins-Bold.ttf`
- `HindSiliguri-Regular.ttf`
- `HindSiliguri-Medium.ttf`
- `HindSiliguri-SemiBold.ttf`
- `HindSiliguri-Bold.ttf`

After placing the font files here, run:

```bash
pnpm react-native-asset
```

or the equivalent React Native asset linking command for your setup to ensure
the fonts are available on both iOS and Android.

