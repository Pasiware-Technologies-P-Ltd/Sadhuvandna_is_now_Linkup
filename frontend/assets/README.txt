LinkUp — No-Text App Icon Asset Pack
=====================================

The launcher icon uses the LinkUp community symbol only; no wordmark is included.

Files:
- icon.png                      1024x1024 primary app icon
- adaptive-icon.png             1024x1024 full-tile Android fallback
- adaptive-icon-foreground.png  1024x1024 transparent foreground artwork
- splash.png                    1080x1920 splash screen
- monochrome-icon.png           1024x1024 transparent white icon
- icon-512.png, icon-192.png, icon-180.png, icon-167.png, icon-152.png,
  icon-128.png, icon-120.png, icon-96.png, icon-72.png, icon-64.png
- favicon.png                   48x48 website favicon

Palette:
- Royal Blue: #2563EB
- Deep Navy: #172554
- Light Blue: #DBEAFE

Expo config example (merge into your existing app.json; do not duplicate keys):
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#172554"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon-foreground.png",
        "backgroundColor": "#2563EB",
        "monochromeImage": "./assets/monochrome-icon.png"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}

Setup:
1. Extract this ZIP.
2. Copy the PNG files into frontend/assets/ (create assets if needed).
3. Merge the Expo config properties into frontend/app.json or app.config.js.
4. Rebuild the native app after changing launcher icons; JS reload alone may not update it.

Test the adaptive icon on an Android device/emulator because launchers apply different masks.
