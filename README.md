# Poison Hybrid

> They collect. We contaminate.

The modern internet runs on surveillance.

Every click, scroll, search, purchase, pause, misclick, device signal, and browser quirk can be harvested, analyzed, packaged, and used for advertising, profiling, behavioral prediction, or data brokerage.

Poison exists because privacy should not be a premium feature.

Poison improves privacy, but it is not magic invisibility. It does not hide your IP address, bypass Cloudflare/VPN reputation checks, protect logged-in accounts from first-party tracking, or replace a hardened browser profile, VPN/Tor, and account separation.

## Prebuilt Download

Current release:

```text
https://github.com/mendo0oo/Poisoning/releases/tag/Release
```

Prebuilt download.

## Why

Because we are tired of:

- endless telemetry
- behavioral profiling
- "anonymous" analytics that still know too much
- companies collecting data they do not need
- privacy being treated like a paid upgrade
- browsers pretending a few toggles cancel out an advertising ecosystem
- being told surveillance is the price of using the web

If data is the fuel, Poison throws sand into the engine.

[Documentation](https://www.mend0.net/docs/poisoning.html)

## What Works Now

Poison Hybrid currently focuses on practical blocking and controlled damage to tracker profiles:

- tracker/ad blocking through the hybrid backend
- popup, fake-dialog, blank-tab, and sketchy redirect blocking
- download-link allowance for visible user-clicked links
- auto-reject for common cookie/consent banners (testing)
- optional whole-browser cookie/cache/storage scrub
- WebRTC and header privacy controls
- fingerprint spoofing for navigator, screen, timezone, plugins, media devices, canvas, WebGL, and WebRTC surfaces
- session poison profiles that add controlled fake tracker-noise personas
- Antidote Mode for Cloudflare, banking, login, checkout, video embeds, and fragile sites
- local test lab for collectors, redirects, popups, downloads, and fingerprint probes

## Builds

- **Firefox**: `poison-firefox.xpi`
- **Brave**: `poison-brave.zip`
- **Chrome**: `poison-chrome.zip`

Firefox and Brave are the main targets. They use the Poison Hybrid build with the stronger blocking backend.

Chrome is a compatibility build because current Chrome rejects the hybrid Chromium package with a manifest-version error. The Chrome ZIP uses the MV3 standalone backend, so it is weaker than the Firefox/Brave hybrid builds.

## Browser Philosophy

Poison is built for browsers where the user still has some control.

Firefox is the main target. Zen is what I mostly use, so Firefox-based browsers get the most attention. They are not perfect, but the extension APIs are still stronger and the browser can be hardened without fighting the whole platform.

Brave is second. It is still Chromium, but it has a better privacy posture than Chrome and it can load the hybrid build. Some sites are fragile there, especially video embed pages, so Antidote Mode exists for that.

Chrome gets a compatibility build only. It is useful for testing and people who need Chrome, but Manifest V3 limits what blockers can do. Also, building a privacy tool around a browser owned by the largest ad company on earth is not exactly the dream.

Opera and Opera GX are not a target. Same Chromium base, more product fluff, more telemetry questions, more marketing. RGB, anime wallpapers, sidebars, AI buttons, crypto buttons, gamer branding - none of that makes a browser private.

## Antidote Mode

Use Antidote Mode for sites that break under aggressive privacy hooks:

- Cloudflare/security challenge pages
- banking
- login/account pages
- checkout/payment pages
- video embed sites such as AniWorld
- broken or fragile sites

On Brave, AniWorld and similar streaming pages may need Antidote enabled for video embeds/play buttons to work.

Antidote backs off from page-level spoofing, poisoning, popup guards, and other aggressive hooks. Use `Trust Current Site` when you want a persistent site bypass.

## Profiles

Profiles reset to `Standard` when the browser starts.

- `Standard`: low-noise Firefox-compatible profile.
- `Noise Gamer`: fake gaming/hardware/streaming interest trail.
- `Finance Ghost`: noisy finance/travel/insurance profile with intentionally weird values.
- `Lockdown Scrub`: aggressive profile that enables protection, spoofing, poisoning, popup blocking, cookie rejection, WebRTC/header protection, Cloudflare compatibility, and whole-browser data scrub.

`Lockdown Scrub` is destructive. It can clear browser-wide cookies, cache, localStorage, IndexedDB, and service workers, which can log you out everywhere and reset site preferences.

## Cloudflare

Poison cannot bypass Cloudflare. Cloudflare uses server-side signals such as IP reputation, TLS/HTTP fingerprinting, challenge scripts, ASN/geolocation, and browser integrity checks.

Poison only tries to avoid making Cloudflare challenges worse by backing off when challenge pages are detected.

## Principles

### Privacy is a right

Users should control their data.

### Transparency matters

If software communicates with a server, users deserve to know why.

### Telemetry should be opt-in

Not hidden behind menus, dark patterns, or vague wording.

### Users are not products

Advertising companies disagree.

Poison does not.

## Goals

- reduce the value of tracking data
- increase uncertainty in behavioral profiles
- expose collection mechanisms
- push back against surveillance capitalism
- make privacy tools accessible to normal users

## Build

### Firefox And Brave

```powershell
.\build-hybrid-ublock.ps1
```

Outputs:

- `dist/poison-firefox.xpi`
- `dist/poison-brave.zip`
- `dist/poison-brave-unpacked`

### Chrome Compatibility Build

```powershell
.\build.ps1
```

Output:

- `dist/poison-chrome.zip`

## Install Locally

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `dist/poison-firefox.xpi`.

### Brave

1. Open `brave://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist/poison-brave-unpacked`.

### Chrome

1. Extract `dist/poison-chrome.zip`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted Chrome folder.

## Test Lab

```powershell
.\run-test-lab.ps1
```

Open:

```text
http://127.0.0.1:8787
```

The lab includes fake collectors, tracker pixels, popups, redirects, fingerprint probes, and a legitimate download link.

## Not Affiliated

Poison is not affiliated with any browser vendor, advertising company, analytics provider, or data broker.

We answer to users.

Not shareholders.  
Not advertisers.  
Not engagement metrics.  
Not telemetry dashboards.

## License And Attribution

Poison Hybrid includes modified GPLv3 code from uBlock Origin:

```text
https://github.com/gorhill/uBlock
```

uBlock Origin is copyright Raymond Hill and contributors.

Poison Hybrid is not an official uBlock Origin release. If you distribute Poison Hybrid builds, keep the GPLv3 license files and attribution, publish the complete corresponding source code, and clearly mark the package as a modified build.

## Final Note

The internet was supposed to connect people.

Somewhere along the way it became a machine for measuring them.

Poison is a small act of resistance.
