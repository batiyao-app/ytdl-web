# Unauthenticated yt-dlp vs JavaScript comparison

## Fix verified in 0.3.0

The full anonymous VISIONOS request succeeds through the **unchanged official Batiyao transport**. A controlled comparison found that removing `X-Goog-Visitor-Id` from that otherwise identical request produced the bot/sign-in response; retaining the fresh anonymous watch-page visitor value worked. Removing the client User-Agent from the JSON body and the signature timestamp still worked. The app now sends the anonymous visitor header, numeric client-name/version headers and playback context. It does not override HTTP User-Agent/Origin, use cookies, sign in or change the bridge.

Further fixes:

- Direct adaptive streams are available. Explicit bounded `range` URL parameters complete promptly where an unbounded whole-file request stalled; responses must contain exactly the requested byte count.
- A bundled MP4Box.js assembles complete clear AVC and AAC tracks locally, preserving samples and timestamps. This addresses sources with no progressive MP4.
- Public playlist metadata is requested with `browseId: VL…` on `www.youtube.com`; it no longer needs the playlist page that redirected to the cookie-consent host.

Live simulator verification on 16 October 2026:

- `NCxbzbwBHzI`: complete 720p MP4, 21.5 MB; complete MP3, 5.0 MB. Both persisted after reload and played with advancing playback time; durations approximately 217 seconds.
- The supplied `RDCLAK5uy_k1VVBVsS6pu1pVkYZK2B0EWic3i4j_TY4` playlist exposed 100 items. Its first two items downloaded as complete MP4s (32.9 MB and 23.8 MB); Stop ended the run and retained them.
- A repeat download skipped the existing media. Library Remove/Undo restored the entry.
- A complete separately assembled MP4 was inspected and decoded with FFmpeg: H.264 video plus AAC audio, matching track durations, no decode errors. FFmpeg is a development verification tool only; the app performs assembly in JavaScript.

No phone-native or share-sheet completion is claimed. Size, duration, public-source and direct-format limits remain. The two-hour `sCIiVN0zIGE` video is too large for this build's MP4 limit and exceeds its MP3 duration limit; successful anonymous metadata extraction does not remove those device constraints.

## Original 0.2.0 comparison (before the fix)

Tested 16 October 2026 from the same computer/network, close together, against the same public video: `https://www.youtube.com/watch?v=sCIiVN0zIGE`. No login, browser cookies, OAuth, authentication plugin or account credentials were configured.

## Results

| Test | Observed result |
|---|---|
| yt-dlp 2026.08.19, ignore config, no cache, no playlist | Metadata extraction succeeded using the VISIONOS client and an HLS manifest. |
| yt-dlp `--test -f ba` | A small media test sample downloaded successfully without login. This was not a full-file download. |
| Original JS extractor via the actual SDK native transport implementation | Watch page HTTP 200, playability OK, but zero directly usable format URLs. ANDROID_VR fallback HTTP 200, LOGIN_REQUIRED, “Sign in to confirm you’re not a bot”. |
| VISIONOS request body through unchanged Batiyao transport | Also HTTP 200 / LOGIN_REQUIRED. Merely changing the client name is insufficient. |

## What this proves

The video can be extracted and a media sample transferred without account authentication by yt-dlp in this environment. A LOGIN_REQUIRED result from our particular request does **not** establish that user sign-in is inherently required for this public content. Earlier advice treating sign-in as the necessary next step was too strong.

The native bridge already solves browser CORS. The remaining gap is extraction/client compatibility, not proof of a missing user account.

## Differences identified, not fully isolated

- yt-dlp selects VISIONOS in this installed no-JS-runtime configuration; our JS extractor currently tries only watch-page direct formats then ANDROID_VR.
- yt-dlp's requests use client-specific headers including User-Agent, Origin, X-YouTube-Client-Name, X-YouTube-Client-Version and anonymous visitor context. Batiyao intentionally fixes User-Agent, refuses Origin and all cookies, and our minimal JS request lacks yt-dlp's full context construction. We did not change or bypass those host restrictions.
- yt-dlp parses HLS manifests and can process segmented formats. Our JS implementation currently accepts only direct audio URLs and progressive MP4, with no adaptive audio/video muxing or player challenge interpreter.

These are documented request/feature differences, **not a controlled proof that a specific single header caused the challenge**. It would be inaccurate to claim that changing User-Agent alone fixes it.

## Engineering conclusion

The implemented fix stays within the approved platform rules. It needs neither a sign-in UI nor broader authentication permissions. HLS parsing and signature deciphering remain outside this build; locally muxing the direct adaptive MP4 tracks was sufficient for the tested videos.
