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

1. `https://www.youtube.com/watch?v=NCxbzbwBHzI`: native GET returned HTTP 200 and readable HTML. The subsequent player API returned HTTP 200 with `LOGIN_REQUIRED` and “Sign in to confirm you’re not a bot”. This is a YouTube response, not a CORS failure. The app surfaces it and stops the playlist rather than retrying every entry.
2. Supplied Music playlist `RDCLAK5uy_k1VVBVsS6pu1pVkYZK2B0EWic3i4j_TY4`: returned HTTP 302 redirecting to `consent.youtube.com`. This host is not declared; the native bridge correctly returned `NET_NOT_ALLOWED`. This result depends on region/source behavior. No consent was accepted and no unapproved redirect was followed.
3. Full URL → media → stored file → playback → share was **not completed** because of those upstream restrictions. Do not infer production readiness from SDK or unit test counts.

## Validation

- Official SDK/simulator suite: 39 tests passed, including private-address protection, forbidden headers, response limits, redirects, cancellation, capability declarations and approval checks.
- App suite: 16 tests passed, including native adapter response conversion, cancellation, denial propagation and native-file persistence/removal/restore using a mocked SDK.
- Native private-address predicate spot checks rejected loopback, RFC1918, IPv4-mapped IPv6 loopback (both forms) and NAT64 loopback; accepted a public address.

## Review observations

The implementation covers the intended narrow bridge design: HTTPS approved-host checks on each redirect, DNS resolution checks and pinning the connected address to the checked resolution, fixed host User-Agent, forbidden credential/transport headers, no cookies, size limits, per-app approval and cancellation. This evaluation is not a complete security audit or a review of the production mobile native code.

Simulator progress is not upstream streaming: `fetchOnce` accumulates the remote response in memory before `simNet` forwards it to the browser. Its progress events describe that later transfer. Test actual phone progress/memory separately. The app currently uses blob mode; a future optimized progressive-MP4 path could use `response:'file'` to avoid extra transfers/copies.

## Next platform/source decisions

- Do not weaken the bridge or spoof its fixed identity to work around YouTube bot verification.
- The consent redirect needs a deliberate approved-host/consent design if it is to be supported. The existing two-host manifest cannot fetch that host. Merely adding it would not automatically complete consent because the bridge intentionally has no cookie jar.
- Private playlists and authenticated source access remain phase 2. The new bridge does not grant those permissions.
