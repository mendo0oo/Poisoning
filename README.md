# Poison Identity

Firefox-first privacy extension for tracker blocking, popup/redirect hardening, fingerprint spoofing, WebRTC/header protection, cookie cleanup, and controlled tracker-noise poisoning.

Poison improves privacy, but it is not an anonymity guarantee. It does not hide your IP address, bypass Cloudflare/VPN reputation checks, protect logged-in accounts from first-party tracking, or replace a hardened browser profile, VPN/Tor, and account separation.

## Builds

- **Poison Identity**: standalone Firefox MV2 + Chrome MV3 build.
- **Poison Hybrid**: recommended build with stronger ad/tracker/popup blocking and Poison's privacy controls.

## Features

- Tracker/ad hostname blocking.
- Popup, fake-dialog, blank-tab, and sketchy redirect blocking.
- Download-link allowance for visible user-clicked links.
- Auto-reject for common cookie/consent banners. (TESTING)
- Optional whole-browser site-data scrub.
- Fingerprint hooks for navigator, screen, timezone, plugins, media devices, canvas, WebGL, and WebRTC.
- Session poison profiles for temporary fake tracker-noise personas.
- Antidote Mode for Cloudflare, banking, login, checkout, and fragile sites.
- Local test lab for collectors, redirects, popups, downloads, and fingerprint probes.

## Profiles

Profiles reset to `Standard` when the browser starts.

- `Standard`: low-noise Firefox-compatible profile.
- `Noise Gamer`: fake gaming/hardware/streaming interest trail.
- `Finance Ghost`: noisy finance/travel/insurance profile with intentionally weird values.
- `Lockdown Scrub`: aggressive profile that enables protection, spoofing, poisoning, popup blocking, cookie rejection, WebRTC/header protection, Cloudflare compatibility, and whole-browser data scrub.

`Lockdown Scrub` is destructive. It can clear browser-wide cookies, cache, localStorage, IndexedDB, and service workers, which can log you out everywhere and reset site preferences. Be warned.

## Antidote Mode

Use Antidote Mode for sites that should not be touched aggressively:

- Cloudflare/security challenge pages
- banking
- login/account pages
- checkout/payment pages
- broken or fragile sites

Antidote backs off from page-level spoofing, poisoning, popup guards, and other aggressive hooks. Use `Trust Current Site` when you want a persistent site bypass.

Brave users: if search pages or search redirects feel delayed, enable Antidote Mode or trust the search site.

## Cloudflare

Poison cannot bypass Cloudflare. Cloudflare uses server-side signals such as IP reputation, TLS/HTTP fingerprinting, challenge scripts, ASN/geolocation, and browser integrity checks.

Poison only tries to avoid making Cloudflare challenges worse by backing off when challenge pages are detected.

## Remote Filters

Remote filters are disabled by default in the standalone build because public lists can break sites.

Poison Hybrid handles stronger network, cosmetic, and scriptlet filtering. Custom packaged filters live in `filters/`; add file names to `filters/index.json`.

## Build

### Standalone

```powershell
.\build.ps1
```

Outputs:

- `dist/poison-identity-firefox.xpi`
- `dist/poison-identity-chrome.zip`

### Poison Hybrid

```powershell
.\build-hybrid-ublock.ps1
```

Outputs:

- `dist/poison-hybrid-firefox.xpi`
- `dist/poison-hybrid-chromium.zip`
- `dist/poison-hybrid-chromium`

## Install Locally

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `dist/poison-hybrid-firefox.xpi` or `dist/poison-identity-firefox.xpi`.

### Chrome or Brave

1. Run `.\build.ps1` or `.\build-hybrid-ublock.ps1`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select `dist/poison-hybrid-chromium` for the hybrid build, or extract the standalone Chrome ZIP and select that folder.

## Test Lab

```powershell
.\run-test-lab.ps1
```

Open:

```text
http://127.0.0.1:8787
```

The lab includes fake collectors, tracker pixels, popups, redirects, fingerprint probes, and a legitimate download link.

## Browser Support

Poison Identity is Firefox-first. I mainly made it for Firefox because I use Zen Firefox most of the time, and Firefox still gives privacy extensions a stronger API surface.

Chrome and Brave are secondary targets. I do not plan to support Chromium forks like Opera or Opera GX.

## License And Attribution

The standalone Poison Identity build is this project.

Poison Hybrid includes modified GPLv3 code from uBlock Origin:

```text
https://github.com/gorhill/uBlock
```

uBlock Origin is copyright Raymond Hill and contributors.

Poison Hybrid is not an official uBlock Origin release. If you distribute Poison Hybrid builds, keep the GPLv3 license files and attribution, publish the complete corresponding source code, and clearly mark the package as a modified build.
