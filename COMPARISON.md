# Unauthenticated yt-dlp vs JavaScript comparison

Tested 16 October 2026 from the same computer/network, close together, against the same public video: `https://www.youtube.com/watch?v=sCIiVN0zIGE`. No login, browser cookies, OAuth, authentication plugin or account credentials were configured.

## Results

| Test | Observed result |
|---|---|
| yt-dlp 2026.08.19, ignore config, no cache, no playlist | Metadata extraction succeeded using the VISIONOS client and an HLS manifest. |
| yt-dlp `--test -f ba` | A small media test sample downloaded successfully without login. This was not a full-file download. |
| Current JS extractor via the actual SDK native transport implementation | Watch page HTTP 200, playability OK, but zero directly usable format URLs. ANDROID_VR fallback HTTP 200, LOGIN_REQUIRED, “Sign in to confirm you’re not a bot”. |
| VISIONOS request body through unchanged Batiyao transport | Also HTTP 200 / LOGIN_REQUIRED. Merely changing the client name is insufficient. |

## What this proves

The video can be extracted and a media sample transferred without account authentication by yt-dlp in this environment. A LOGIN_REQUIRED result from our particular request does **not** establish that user sign-in is inherently required for this public content. Earlier advice treating sign-in as the necessary next step was too strong.

The native bridge already solves browser CORS. The remaining gap is extraction/client compatibility, not proof of a missing user account.

## Differences identified, not fully isolated

- yt-dlp selects VISIONOS in this installed no-JS-runtime configuration; our JS extractor currently tries only watch-page direct formats then ANDROID_VR.
- yt-dlp's requests use client-specific headers including User-Agent, Origin, X-YouTube-Client-Name, X-YouTube-Client-Version and anonymous visitor context. Batiyao intentionally fixes User-Agent, refuses Origin and all cookies, and our minimal JS request lacks yt-dlp's full context construction. We did not change or bypass those host restrictions.
- yt-dlp parses HLS manifests and can process segmented formats. Our JS implementation currently accepts only direct audio URLs and progressive MP4, with no adaptive audio/video muxing or player challenge interpreter.

These are documented request/feature differences, **not a controlled proof that a specific single header caused the challenge**. It would be inaccurate to claim that changing User-Agent alone fixes it.

## Next engineering step

Port and test the required public-client context and media-format handling within the approved platform rules, using captured nonsecret fixtures and same-source tests. HLS parsing/segment handling and MP4 muxing are substantial missing features. If the necessary request semantics conflict with the host's intentional restrictions, discuss that exact compatibility requirement with the Batiyao team; do not silently spoof or circumvent the host controls. Do not add a sign-in UI as a presumed solution to this unauthenticated extraction mismatch.
