# YTDL Web

Experimental HTML5 + JavaScript, on-device YouTube downloader. No Python, yt-dlp process, downloader server, public CORS proxy, external executable, OAuth or CDN. **This is an independent limited implementation, not a JavaScript port of the complete yt-dlp project.**

**Current status: not yet a verified working YouTube downloader in Batiyao.** The current official packer accepts the wildcard manifest, but both the ordinary browser preview and official simulator fail the direct YouTube network request. An unrestricted JavaScript runtime successfully parsed the first three entries of both supplied public playlist formats. A real media test encountered YouTube's “Sign in to confirm you're not a bot” response. The app does not bypass sign-in, challenges, DRM or access restrictions.

## Included

- One Video (MP4) / Audio (MP3) choice and one Download button.
- Single videos, ordinary playlists, Music editorial playlists and Radio/Mix watch links.
- Current YouTube lockup cards, older playlist rows, radio-panel entries and continuation parsing.
- Sequential queue with Stop (AbortController), per-item errors and duplicate detection by video ID + output format.
- Direct progressive MP4 download with picture and sound. Video-only adaptive tracks are never mislabeled as complete MP4s.
- Direct audio download followed by Web Audio decoding and local JavaScript MP3 encoding through lamejs.
- Separate Library screen, automatic next item, Play all, removal with one-step Undo, and browser-supported save/share actions.
- A strict network guard allowing only `www.youtube.com` and `googlevideo.com` / its subdomains. No thumbnails or analytics requests.

## What still needs platform support

1. **Networking/CORS:** the wildcard manifest passes the latest packer. CSP allowlisting does not make YouTube return `Access-Control-Allow-Origin` for Batiyao's opaque (`null`) origin. The current SDK exposes no documented native HTTP method. The `Downloader` constructor accepts a standards-compatible injected `fetcher` so a future, documented host transport can be connected; no invented Batiyao method is called.
2. **Persistent media storage:** IndexedDB works in ordinary origin-bearing browsers. Under Batiyao's no-origin sandbox, the app uses a clearly labeled session library. `Batiyao.storage` is text-only and is not abused to store large media. Closing the miniapp loses session files. Duplicates are detected only against files still in the current library.
3. **Audio/video sharing:** the current official `Batiyao.share` accepts images/text, not media files. This app does not send unsupported parameters. Ordinary browsers get `navigator.share` only if file sharing is supported, plus Save to Files. Batiyao needs a documented media-export/share API before those can be exposed inside the sandbox.
4. **Extraction coverage:** signature-ciphered streams and adaptive video/audio muxing are not implemented. The engine reads direct formats from watch-page JSON, with an InnerTube Android VR client fallback when the public watch response is playable but has no suitable direct format. It never executes fetched player code. Unsupported formats fail explicitly.
5. **OAuth:** phase 2. `list=LM` / `list=LL` return an explicit sign-in-required message and never silently degrade into a single-video download. Private playlists and account-bound queues are not supported.

Whitelisting and copyright ownership do not establish permission under YouTube's platform terms. Review applicable rights, platform rules and distribution requirements independently.

## Build and run

Requires Node 20+ for development. The delivered app runs as static files; Node is not a runtime dependency of the miniapp.

```sh
npm ci
npm test
npm run build
npm run preview
```

Open http://127.0.0.1:8081. This development server only serves assets. It has no download API, extraction endpoint or proxy. The built `app/` files are committed so they can also be served by any static host.

## Batiyao simulator and package

Registered App ID: `ma_twjnmip7gn`. Manifest declares:

```json
"network": [
  { "url": "https://www.youtube.com", "purpose": "Reads public video and playlist information requested by the user." },
  { "url": "https://*.googlevideo.com", "purpose": "Downloads the audio and video streams requested by the user." }
]
```

Using the latest official https://github.com/batiyao-app/developer-sample tooling:

```sh
npm run miniapp -- /absolute/path/to/ytdl-web/app
npm run pack:miniapp -- /absolute/path/to/ytdl-web/app --app-id ma_twjnmip7gn --out dist
```

These commands run in the **developer-sample checkout**, not this repository. The simulator is at http://localhost:3100. Bundle paths are relative, SDK and encoder code are bundled, and there are no iframes. ZIP **contents** of `app/`, not the repository, for upload. A packer pass is packaging validation, not proof of successful media downloading or production approval.

## Supported URL interpretation

- `https://www.youtube.com/watch?v=VIDEO_ID`: one video.
- `https://youtu.be/VIDEO_ID`: one video.
- `https://music.youtube.com/playlist?list=RDCLAK…`: normalize to the public www.youtube.com playlist route; keep editorial playlist context.
- `https://www.youtube.com/watch?v=sCIiVN0zIGE&list=RDsCIiVN0zIGE&start_radio=1`: preserve seed video and traverse the Radio queue from the watch response. Radio is dynamic, not a guaranteed finite playlist. Stop is always available; traversal is bounded to 500 unique items / 100 pages.
- `https://music.youtube.com/watch?v=kPnN4IE_a98&list=LM`: explicitly requires phase-2 account authorization.

## Device limits and behavior

Each download is capped at 64 MiB; session library at 128 MiB. MP3 encoding is limited to ten minutes per item and decodes PCM in memory; constrained phones may need lower limits. Encoding yields periodically and checks cancellation, although browser audio decoding cannot itself be cancelled mid-call. Downloading stops on leaving the miniapp through Batiyao's visibility event. Existing completed files survive Stop. Audio and video are deduplicated separately. Removed items can be redownloaded. Undo retains the last removed blob in memory until another removal or app closure. A browser may block autoplay or sharing; explicit user interaction is required.

## Validation on 16 October 2026

- 12 automated tests pass: URL semantics, personal queues, host guard, JSON parsing, current and older playlist structures, radio continuations, MP4 audio requirement, byte streaming/progress, cancellation, real MP3 encoding from PCM and encoder cancellation.
- Build succeeds; the official packer accepts the wildcard network declaration.
- Live, network-enabled JavaScript metadata tests returned entries for both user-supplied public playlists.
- Live media fetch hit YouTube bot verification; no successful end-to-end media download is claimed.
- Ordinary browser and official Batiyao simulator network tests failed with the app's blocked/unavailable-network message.

Sources: https://developer.batiyao.com/miniapps ; https://github.com/batiyao-app/developer-sample . The updated documentation and packer support wildcards. The simulator was updated to commit 0068213 (live manifest network-policy reload) and the public Radio URL was retested: browser fetch still fails. A direct header check with Origin: null returned HTTP 200 but no Access-Control-Allow-Origin header from YouTube, confirming an independent CORS restriction.

## Licensing

Application source: MIT. The official Batiyao SDK is MIT; its notice is in `app/BATIYAO-LICENSE.txt`. The MP3 encoder `@breezystack/lamejs` 1.2.7 is LGPL-3.0; its license is in `app/LAME-LICENSE.txt`. Dependency versions are locked and the JS bundle can be rebuilt with a replacement encoder. Upstream encoder source: https://github.com/shijinyu/lamejs ; package: https://www.npmjs.com/package/@breezystack/lamejs . Corresponding encoder source and build configuration are included in third_party/lamejs (upstream version 1.2.7). Full LGPL/GPL texts are included in app/. Preserve these notices when distributing.

Do not commit access tokens, browser cookies, OAuth credentials or media files. The project contains none of those.
