# Store assets

Google Play Store graphics, generated from the existing app branding
(`apps/mobile/assets/`). This folder is **not** referenced by any build —
nothing under `apps/mobile` imports from here, so nothing here can affect
the app bundle.

| File | Spec | Source |
|---|---|---|
| `icon-512.png` | 512x512, 32-bit PNG (RGBA, 8-bit/channel), fully opaque, no rounding | Resized from `apps/mobile/assets/icon.png` (already edge-to-edge opaque — no transparent padding to strip) |
| `feature-graphic-1024x500.png` | 1024x500, 24-bit PNG (RGB, no alpha) | Composed from `apps/mobile/assets/android-icon-foreground.png` (the chevron mark) + "LEVEL UP" / "Turn your life into a quest" set in Space Grotesk |

## Regenerating

Both were built with **sharp** (already a hoisted dependency in the repo's
root `node_modules` — no install needed) via small Node scripts, not
committed here since they're one-off generation tools rather than part of
the app. To redo either:

### `icon-512.png`

```js
const sharp = require("sharp");
sharp("apps/mobile/assets/icon.png")
  .resize(512, 512, { fit: "cover", kernel: "lanczos3" })
  .png({ compressionLevel: 9 })
  .toFile("store-assets/icon-512.png");
```

### `feature-graphic-1024x500.png`

This one also needs **opentype.js**, to render the "LEVEL UP" wordmark and
tagline in Space Grotesk as real vector paths (`@expo-google-fonts/space-grotesk`
ships the `.ttf` files already, but this sharp/libvips build doesn't
resolve custom font families for SVG `<text>` — neither `FONTCONFIG_FILE`
nor `FONTCONFIG_PATH` changed what it picked). Install it somewhere
*outside* the repo (a scratch directory), not as a project dependency —
e.g. `cd` to a throwaway folder and `npm install opentype.js`.

Two gotchas worth knowing before redoing this, both encountered building
the current file:

1. **Inter won't shape** in this opentype.js version — it throws on one of
   Inter's GSUB lookup types (`substFormat: 2` under `lookupType: 6`).
   Space Grotesk (Regular, for the tagline) shapes fine; that's why both
   lines of text end up in the same font family.
2. **`font.getPath(text, x, y, size)` can silently corrupt the tail of a
   string.** Space Grotesk Bold's "V" glyph, generated at specific
   cumulative-advance-width x positions (e.g. `105.21600000000001`, a
   plain floating-point rounding artifact — the clean value `105.216` is
   fine), serializes a literal `NaN` into the path's `d` attribute.
   librsvg stops parsing a path the instant it hits `NaN`, so everything
   *after* that glyph in the same `<path>` silently disappears — it looked
   like text getting truncated mid-word, not an error. The fix: build the
   path glyph-by-glyph with `font.charToGlyph(ch).getPath(...)`, rounding
   the cursor x to 2 decimals before each glyph, instead of calling
   `getPath()` on the whole string. This loses inter-glyph kerning, which
   isn't visible at this size for a short display wordmark/tagline.

Layout approach: render the background+glow (plain `<rect>`/`<ellipse>`
SVG, no text) and each text run as its own small, locally-positioned PNG,
then composite them onto the canvas with sharp's `.composite()` — i.e.
position text via raster placement, not far-from-origin SVG coordinates.
Colors: background `#0B0B14`, glow `#7C3AED` → `#3B82F6`, wordmark text
`#F8FAFC` with "UP" in the violet→blue gradient, tagline `#94A3B8`.

## Verifying

```js
const sharp = require("sharp");
sharp("store-assets/icon-512.png").metadata().then(console.log);
sharp("store-assets/feature-graphic-1024x500.png").metadata().then(console.log);
```

Confirm `width`/`height` match the filename, `hasAlpha` is `true` for the
icon and `false` for the feature graphic, and check the file size against
the limits in Play's own graphic asset requirements (1 MB for the icon,
15 MB for the feature graphic).
