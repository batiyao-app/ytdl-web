# YTDL Web

Self-contained HTML5/JavaScript media miniapp for Batiyao. App ID: `ma_twjnmip7gn`; version `0.3.0`; bundled SDK `1.8.0`. No downloader backend, Python process, external executable, OAuth, CDN or public proxy is used by the miniapp.

**Status:** complete MP4 and MP3 downloads, native Library storage, reload persistence and playback are verified in the official SDK 1.8 simulator. The supplied Music playlist loads and downloads; Stop and duplicate skipping are verified. The corrected anonymous player context fixes the previously observed sign-in response for the tested public videos. See [COMPARISON.md](COMPARISON.md) and [SDK-EVALUATION.md](SDK-EVALUATION.md). This remains a limited independent extractor, not a full JavaScript port of yt-dlp. Real-phone testing is still required.

## Features

- One Video (MP4) / Audio (MP3) choice, queue, progress and Stop.
- Video URLs, public Music playlists, Radio/Mix queues and bounded continuations (500 unique items / 100 pages).
- Duplicate detection by video ID and output format against actual stored files.
- Progressive MP4 or local assembly of separate AVC/AAC tracks into one MP4 with picture and sound. MP3 uses browser audio decoding and a bundled JavaScript encoder. No remote conversion service.
- Anonymous public-player requests carry fresh watch-page visitor context and allowed client headers. The host keeps its fixed User-Agent and sends no cookies. Bounded 4 MiB range requests avoid the observed whole-file stall and detect incomplete transfers.
- Public playlists use YouTube's browse API on the approved `www.youtube.com` host, without following cookie-consent redirects.
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

App: 22 tests pass, including anonymous request context, complete range validation, playlist continuation/deduplication and real MP4 container assembly. Official SDK/simulator: 39 tests passed in the SDK evaluation. On 16 October 2026, the simulator downloaded a complete 217-second video as a 720p MP4 (21.5 MB) and an MP3 (5.0 MB), retained both across reload and played both with advancing playback time. The supplied Music playlist returned 100 entries and downloaded media before Stop was pressed. Library removal/Undo and duplicate skipping were exercised. An independently decoded complete assembled MP4 had both H.264 and AAC tracks without decode errors. Packaging is separately validated. Actual phone testing and native Share handoff remain unverified.

## Extraction limits

Only public, unencrypted media with directly usable stream URLs is supported. No player-script interpreter, signature deciphering, HLS segment downloader, DRM, account session or private-playlist support is included. Client compatibility can change upstream; failures are shown rather than bypassed. MP4 assembly selects AVC/AAC, prefers up to 720p and requires both tracks plus container overhead to fit the device file limit. A two-hour source such as `sCIiVN0zIGE` can yield valid stream metadata yet still exceed these local size/duration limits. Do not present that as an authentication failure.

## Licensing and source policy

Only use content you own and have permission to download and convert. Source ownership and host approval do not waive platform terms. Do not commit credentials, source cookies, access tokens or media.

Application: MIT. Official SDK: MIT (`app/BATIYAO-LICENSE.txt`). MP4 container library: `mp4box` 2.4.1, BSD-3-Clause (`app/MP4BOX-LICENSE.txt`), https://github.com/gpac/mp4box.js . MP3 encoder: `@breezystack/lamejs` 1.2.7, LGPL-3.0 (`app/LAME-LICENSE.txt`, full LGPL/GPL texts). Corresponding source and build configuration are in `third_party/lamejs`; it can be rebuilt/replaced. Upstream: https://github.com/shijinyu/lamejs . Platform reference: https://developer.batiyao.com/miniapps .
