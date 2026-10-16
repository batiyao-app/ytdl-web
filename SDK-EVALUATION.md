# SDK 1.8.0 evaluation

Official sample repository commit: `b1ca5be` (pulled 16 October 2026).

## Result

The requested networking capability now exists. After integrating `Batiyao.net.fetch`, the simulator returned readable HTTP 200 text/JSON for a YouTube watch page and its player API. The prior CORS limitation is resolved through this bridge in the simulator. Production phone apps were not tested; the SDK explicitly documents native net access as phone-only, unavailable on batiyao.com.

The app now uses:

- `supports('net')` and a fetch-compatible adapter around `net.fetch`, preserving progress, error codes and cancellation via the returned promise's `requestId`.
- `Batiyao.files` for persistent private media, with video-ID/format filenames and small title/duration records in `Batiyao.storage`.
- `supports('shareMedia')` and documented video/audio sharing only within the SDK's size and duration limits.

Manifest `capabilities.net.fetch` and both network hosts are declared. No ports or second runtime are introduced by the miniapp; only the official simulator runs a local service to emulate the phone.

## Live results

Version 0.3.0, tested 16 October 2026:

1. `NCxbzbwBHzI`: complete native download → local JavaScript MP4 assembly or MP3 conversion → native file storage → reload → Library playback succeeded. MP4: 720p, 21.5 MB; MP3: 5.0 MB; duration about 217 seconds. Playback time advanced without errors for both.
2. Supplied Music playlist `RDCLAK5uy_k1VVBVsS6pu1pVkYZK2B0EWic3i4j_TY4`: public browse API returned 100 items. The first two downloaded as MP4 (32.9 MB and 23.8 MB). Stop ended the run and kept completed media. Duplicate skipping and Library Remove/Undo were verified.
3. The original bot/sign-in response was resolved by correct anonymous player context, including fresh visitor context and allowed client headers. No cookie, forbidden header override or host-policy change was needed. See [COMPARISON.md](COMPARISON.md).
4. The original playlist-page consent redirect remains forbidden by the manifest. The app now reads public playlist metadata directly through the approved YouTube API instead of navigating that page. It neither accepts consent nor shares an account session.
5. Phone-native behavior and completion of an external Share sheet remain untested. Simulator success is not a guarantee for every public YouTube source or device.

## Validation

- Official SDK/simulator suite: 39 tests passed, including private-address protection, forbidden headers, response limits, redirects, cancellation, capability declarations and approval checks.
- App suite: 22 tests passed, including native transport/persistence, anonymous request context, range completeness, playlist API continuation/deduplication and MP4 assembly with both tracks.
- Native private-address predicate spot checks rejected loopback, RFC1918, IPv4-mapped IPv6 loopback (both forms) and NAT64 loopback; accepted a public address.

## Review observations

The implementation covers the intended narrow bridge design: HTTPS approved-host checks on each redirect, DNS resolution checks and pinning the connected address to the checked resolution, fixed host User-Agent, forbidden credential/transport headers, no cookies, size limits, per-app approval and cancellation. This evaluation is not a complete security audit or a review of the production mobile native code.

Simulator progress is not upstream streaming: `fetchOnce` accumulates the remote response in memory before `simNet` forwards it to the browser. Its progress events describe that later transfer. Test actual phone progress/memory separately. The app currently uses blob mode; a future optimized progressive-MP4 path could use `response:'file'` to avoid extra transfers/copies.

## Remaining platform/source decisions

- Do not weaken the bridge or spoof its fixed identity to work around YouTube bot verification.
- Future workflows that need consent/account pages require a deliberate platform design. The two-host manifest cannot fetch those hosts and this build does not attempt to do so.
- Private playlists and authenticated source access remain phase 2. The new bridge does not grant those permissions.
