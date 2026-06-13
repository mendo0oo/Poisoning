# Poison Identity

Poison Identity is a Firefox-first privacy extension that combines tracker blocking, popup/redirect hardening, fingerprint controls, WebRTC/header privacy settings, cookie/site-data cleanup, and controlled fake tracker-noise requests.

This is a defensive privacy tool, not an anonymity guarantee. It cannot hide your IP address, bypass Cloudflare/VPN reputation checks, protect logged-in accounts from first-party tracking, defeat every fingerprinting method, or replace a hardened browser profile, VPN/Tor, and account separation.

## Current Builds

- **Poison-only build**: standalone Chrome MV3 + Firefox MV2 extension.
- **Poison Hybrid build**: Poison Hybrid backend with Poison Identity frontend and page-level privacy modules.

The Poison Hybrid build is the recommended build if you want stronger ad/tracker/popup blocking. It is branded as Poison Hybrid in the browser UI and keeps the bundled GPLv3 backend license/attribution file.

## Features

- Built-in tracker/ad hostname blocking.
- Optional remote host filters from AdTidy/Poison Hybrid-compatible sources, uAssets, EasyList, EasyPrivacy, URLHaus, and Poison Hybrid filter CDN mirrors.
- Poison Hybrid backend in the hybrid build for stronger network/cosmetic/scriptlet blocking.
- Popup, fake-dialog, ad-widget, blank-tab, and sketchy redirect blocking.
- Legitimate download-link allowance logic for visible user-clicked links.
- Auto-reject for common cookie/consent banners.
- Optional site-data scrub that clears cookies, cache, localStorage, IndexedDB, and service workers.
- Fingerprint hooks for `navigator`, screen, timezone, plugins, media devices, canvas, WebGL, and WebRTC.
- Configurable session poison profiles for temporary fake tracker-noise personas.
- Antidote Mode for Cloudflare, banking, login pages, and fragile sites.
- Cloudflare compatibility detection for `/cdn-cgi/challenge-platform/` challenge pages.
- Terminal-style popup dashboard inspired by the `mend0.info` frontend.
- Dev debug log in the popup.

## Session Poison Profiles

Poison profiles are temporary runtime profiles. They are reset to `Standard` on browser startup.

Current profiles:

- `Standard`: low-noise Firefox-compatible profile.
- `Noise Gamer`: fake gaming/hardware/streaming interest trail.
- `Finance Ghost`: fake finance/travel/insurance/market interest trail.

Profiles affect:

- poison request parameters such as `persona`, `interest`, and fake campaign/source values
- active fingerprint profile sent to `pageScript.js`

They do not create a complete identity, do not bypass account tracking, and do not make fake traffic indistinguishable from real human activity.

## Antidote Mode

Antidote Mode is for sites that should not be touched aggressively, such as:

- Cloudflare/security challenge pages
- banking
- login/account pages
- checkout/payment pages
- websites broken by privacy hooks

When Antidote is enabled, Poison backs off from page-level hooks and effective spoofing/poisoning for compatibility. In the standalone build it also bypasses Poison request/header blocking. In the hybrid build, Poison Hybrid backend behavior can still apply unless the site is trusted or the backend allows it.

Use `Trust Current Site` for a persistent site-level bypass. In the hybrid build this also writes the hostname to Poison Hybrid's `netWhitelist`.

## Cloudflare Compatibility

Cloudflare and similar services are a major compatibility risk because much of their decision-making is server-side:

- IP/VPN/proxy reputation
- TLS and HTTP fingerprinting
- browser challenge scripts
- JavaScript integrity checks
- datacenter/ASN/geolocation signals

Poison cannot bypass Cloudflare. It can only avoid making the challenge worse. When Cloudflare challenge scripts are detected, Poison disables effective page spoofing, popup guards, poisoning, WebRTC page hooks, and anti-debugger source rewriting on that page.

If DevTools is open, Cloudflare challenge scripts may intentionally pause on debugger traps. Close DevTools when testing normal browsing behavior. (Tested via "Firefox Developer Edition")

## Poison Mode Warning

Poison mode is intentionally aggressive. If you enable Poison with site-data scrubbing, expect site settings, sessions, carts, preferences, cookie banners, and logins to reset. That is the price of reducing persistent identifiers.

Poison Mode is not about becoming invisible. It reduces the amount of trustworthy long-term data available to trackers by blocking requests, clearing identifiers, and adding controlled fake noise where safe.

## TESTING: Auto Reject Cookies 

The extension scans visible cookie/consent dialogs and tries to click privacy-preserving options such as:

- `Reject all`
- `Decline`
- `Necessary only`
- `Continue without accepting`

This is best effort. Shadow DOM, iframes, unusual translations, or site-specific consent flows can prevent safe generic rejection.

## Popup And Redirect Blocking

The standalone build removes common fixed-position ad widgets, popup overlays, interstitials, adblock nags, fake verification dialogs, suspicious notification prompts, unsolicited `window.open` popups, blank popup tabs, and suspicious redirect attempts.

The hybrid build uses Poison Hybrid internally for stronger popup/ad/cosmetic/scriptlet handling, with Poison's extra page-level guards layered on top unless Antidote/trusted-site mode is active.

## Remote Filters

Remote filters are disabled by default in the Poison-only build because public lists can break sites.

Current behavior:

- Parsed host/network rules are used for suspicious redirects, beacons, XHR/fetch, websockets, and similar request types.
- Normal top-level page loads are not blocked only because a remote host list contains that domain.
- Normal page assets such as images, videos, fonts, scripts, and stylesheets are not blocked by Poison-only remote host matching.
- Poison-only no longer injects remote cosmetic selectors because broad CSS rules were breaking sites.
- Poison Hybrid handles full cosmetic/scriptlet/filter behavior.

Custom packaged filters live in `filters/`. Add file names to `filters/index.json`, then put rules in those `.txt` files.

## Fingerprint Spoofing

`pageScript.js` runs in the page context and hooks common fingerprint surfaces:

- `navigator.userAgent`
- `navigator.platform`
- `navigator.language`
- `navigator.languages`
- `navigator.hardwareConcurrency`
- `navigator.deviceMemory`
- `navigator.webdriver`
- `navigator.vendor`
- screen dimensions/depth
- timezone
- plugins/mimeTypes
- media device labels/IDs
- canvas `toDataURL`, `toBlob`, `getImageData`
- WebGL `readPixels` and debug vendor/renderer
- WebRTC candidate filtering

Aggressive or unrealistic spoofing can trigger anti-bot systems. Use Antidote/Cloudflare compatibility for fragile sites.

## Build

### Poison-only

```powershell
.\build.ps1
```

Outputs:

- `dist/poison-identity-firefox.xpi`
- `dist/poison-identity-chrome.zip`

### Poison Hybrid backend

```powershell
.\build-hybrid-ublock.ps1
```

Outputs:

- `dist/poison-hybrid-firefox.xpi`
- `dist/poison-hybrid-chromium.zip`

The hybrid builder is native PowerShell and clones uAssets with `git` when needed.

## Install Locally

### Firefox temporary install

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select one of:
   - `dist/poison-hybrid-firefox.xpi`
   - `dist/poison-identity-firefox.xpi`

### Chrome or Brave unpacked

1. Run `.\build.ps1` or `.\build-hybrid-ublock.ps1`
2. Extract the Chrome/Chromium `.zip` from `dist`
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the extracted folder

## Local Poison Test Lab

Use the local lab to test fake collectors, popup traps, redirects, fingerprint probes, and download links.

```powershell
.\run-test-lab.ps1
```

It starts:

```text
http://127.0.0.1:8787
```

The lab page includes fake tracker fetches, tracker pixels, popup windows, ad iframes, script redirects, fingerprint probes, and a legitimate download link. The collector log shows what still reaches the test server.

## Browser Support

Poison Identity is Firefox-first. I mainly made it for Firefox because I use Zen Firefox most of the time, and Firefox still gives privacy extensions a stronger API surface for request blocking and browser privacy controls.

Chrome and Brave are secondary targets through Manifest V3 and `declarativeNetRequest`, but those builds are more limited than Firefox. I do not plan to support crap Chromium forks like Opera or Opera GX.

## Licensing Note

The Poison-only build is this project.

The Poison Hybrid build vendors a GPLv3 backend. Keep the included GPLv3 license and upstream attribution file if publishing the hybrid package.

## uBlock Origin / GPLv3 Attribution

Poison Hybrid includes modified GPLv3 code from uBlock Origin:

```text
https://github.com/gorhill/uBlock
```

uBlock Origin is copyright Raymond Hill and contributors.

Poison Hybrid changes the visible branding, adds the Poison Identity frontend, and adds page-level privacy modules, but the bundled blocking backend remains a modified GPLv3-derived work. Poison Hybrid is not an official uBlock Origin release.

If you distribute Poison Hybrid builds, keep the GPLv3 license files and this attribution, publish the complete corresponding source code, and clearly mark the package as a modified build.

