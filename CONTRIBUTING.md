# Contributing

Small, focused improvements are welcome. Open an issue for bugs or feature ideas, or send a pull request with a clear explanation and validation.

Preserve exact original export dimensions, editable .mapfx compatibility, seamless loops and local-only map handling. Do not add telemetry or remote asset uploads. Never commit personal paths, credentials, runtime exports or third-party asset packs.

Run the syntax checks in the README. Browser tests require Node.js and Playwright (`npm install`), an installed Chrome browser, and the server running at port 8766. Run `npm test`; override `MAPMANCER_URL`, `BROWSER_CHANNEL` or `PLAYWRIGHT_MODULE` when needed. Tests write screenshots under docs/images; review any screenshot changes before committing.

When reporting bugs, include your operating system, browser, map dimensions and reproduction steps. Share only maps you have permission to share. For export problems include the FFmpeg version and error text, with personal paths removed.
