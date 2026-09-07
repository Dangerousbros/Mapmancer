# Changelog

## 1.0.1 — Desktop launcher repair

- Prefer a current browser when an obsolete Chrome installation is also present.
- Keep separate profiles for each browser installation, fixing the profile-version error when switching between Chrome and Edge.
- Let a second app window start without colliding with the first local server.

Existing maps and projects are unchanged. Replace the extracted application folder with this release, or update `desktop.py` in an existing installation.

## 1.0.0 — First public release

Bring still battlemaps to life with 16 effect families, 23 styles, painted masks and shared wind.

- Brush, ellipse, rectangle and point-by-point polygon drawing, with erasing and undo.
- Editable layers, drag-to-reorder, saved masks and self-contained `.mapfx` projects.
- Light, dark and system themes.
- A dedicated desktop app window on Windows, plus ordinary browser mode.
- Seamless high-quality VP9 WebM exports at the original image dimensions; 12 seconds at 20 fps by default.
- Three ready-to-edit examples: Little World, Kraken Depths and Cut the Grapples.

This is a portable source release. Install Python 3.10+ and FFmpeg separately; see the README for setup. Application code is MIT-licensed. Bundled artwork has separate credits and terms.
