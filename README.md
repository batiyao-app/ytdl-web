# YTDL Web

Experimental self-contained HTML5/JavaScript media miniapp for Batiyao. App ID: `ma_twjnmip7gn`; version `0.2.0`; bundled SDK `1.8.0`. No downloader backend, Python process, external executable, OAuth, CDN or public proxy is used by the miniapp.

**Status:** the new `Batiyao.net.fetch` bridge resolves the previous browser CORS blocker in the official simulator. Full YouTube downloading is still **not verified**: a live video returned YouTube bot/sign-in verification, and the supplied Music playlist redirected to the undeclared `consent.youtube.com` host. See [SDK-EVALUATION.md](SDK-EVALUATION.md) for exact results and remaining limitations. This is a limited independent extractor, not a full JavaScript port of yt-dlp.

## Features

- One Video (MP4) / Audio (MP3) choice, queue, progress and Stop.
- Video URLs, public Music playlists, Radio/Mix queues and bounded continuations (500 unique items / 100 pages).
- Duplicate detection by video ID and output format against actual stored files.
- Direct progressive MP4 with picture and sound; audio decoding and local JavaScript MP3 encoding. Ciphered streams, adaptive MP4 muxing, bot-check bypass and DRM are not implemented.
- Separate Library screen with Play all, automatic advancement, Remove and one-step Undo.
- Native `Batiyao.files` persistence when supported, browser IndexedDB outside the sandbox, clearly labeled session-memory fallback otherwise. Native filenames retain media identity across reloads; small title/duration records use text storage.
- Native media Share where supported and within SDK limits: video up to 20 MB / 60 s; audio up to 10 MB / 5 min. Oversized/long entries have disabled share controls. Browser save/share remain available outside the sandbox.
- `net.fetch` native transport on supported phones and in the simulator. Ordinary browser fetch is used only when native networking is unavailable. A denied native request is never silently rerouted.

## Build, tests and preview

Node 20+ is needed only for development:

```sh
npm ci
npm test
npm run build
npm run preview
```

Preview: http://127.0.0.1:8081. This is an asset server with no download API or proxy. Ordinary browser preview remains subject to CORS. The built `app/` assets are committed.

With the latest official https://github.com/batiyao-app/developer-sample checkout, run these commands **in that checkout**:

```sh
npm run miniapp -- /absolute/path/to/ytdl-web/app
npm run pack:miniapp -- /absolute/path/to/ytdl-web/app --app-id ma_twjnmip7gn --out dist
```

The simulator stands in for phone-native networking and runs at http://localhost:3100. Both network origins and the `net.fetch` capability start approved in its Admin review panel; decline them to test error handling. Production needs separate Batiyao admin approval and evidence of permission for each source. Native networking is phone-only, not available on batiyao.com.

The manifest declares `https://www.youtube.com`, `https://*.googlevideo.com`, and `capabilities.net.fetch`. It does not declare consent/account hosts, enable OAuth or provide source cookies. `list=LM` / `list=LL` explicitly require phase-2 authorization rather than silently becoming single-video downloads.

## Limits

Native bridge limits include four concurrent requests, 120 requests/minute, 500 MB/run, 10 MB text/JSON and 50 MB blob/file. This app downloads sequentially, caps each media file at 50 MiB, and limits MP3 conversion to ten minutes to protect phone memory. Batiyao files have 200 MB/500-file quotas; fallback session memory is capped at 128 MiB. Decoding audio still requires memory and cannot itself be interrupted mid-call. Existing completed files remain when Stop is pressed. Removed files can be downloaded again. Undo holds the last removed Blob in memory.

## Verification

App: 16 tests pass. Official SDK/simulator: 39 tests pass. Public playlist/Radio metadata parsing was verified previously in network-enabled JavaScript tests. New live simulator tests prove native response readability, but encountered YouTube authentication/redirect restrictions before media storage. Packaging is not end-to-end download verification. Actual phone testing remains required.

## Licensing and source policy

Only use content you own and have permission to download and convert. Source ownership and host approval do not waive platform terms. Do not commit credentials, source cookies, access tokens or media.

Application: MIT. Official SDK: MIT (`app/BATIYAO-LICENSE.txt`). MP3 encoder: `@breezystack/lamejs` 1.2.7, LGPL-3.0 (`app/LAME-LICENSE.txt`, full LGPL/GPL texts). Corresponding source and build configuration are in `third_party/lamejs`; it can be rebuilt/replaced. Upstream: https://github.com/shijinyu/lamejs . Platform reference: https://developer.batiyao.com/miniapps .
