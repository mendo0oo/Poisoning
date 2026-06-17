(function () {
  'use strict';

  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  const STYLE_ID = 'poison-hybrid-popup-guard';
  const PAGE_SCRIPT = '/poison/pageScript.js';
  const SETTINGS_KEY = 'poisonHybridSettings';
  const POISON_RATE_MS = 30000;
  const MAX_POISON_TARGETS = 10;
  const COOKIE_REJECT_SCAN_MS = 900;
  const COOKIE_REJECT_MAX_SCANS = 24;

  const POPUP_CSS = `
[data-onopen],
.mask[data-onopen],
.wrapper[data-area]:has(.mask[data-onopen]),
.wrapper[data-area]:has(.description),
#stream.hosterSiteDirectNav:has(.notification),
#stream.hosterSiteDirectNav:has([class*="notification" i]),
img.pic[src*="thatdisform.cyou"],
img[src*="thatdisform.cyou"],
img[src*=".cyou/"],
iframe[src*="thatdisform.cyou"],
iframe[src*=".cyou/"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
`;

  const adTextPattern = /attention|please confirm|confirm to continue|looking for ads|kupferaktie|meldet fund|congratulations|available \$?35,?000|withdraw money|transfer money|reward zone|book now|buy now|trade now|sponsored|advertisement/i;
  const trackerPattern = /google-analytics|googletagmanager|doubleclick|googlesyndication|facebook|connect\.facebook|pixel|analytics|tracker|tracking|ads?|advert|sponsor|campaign/i;
  const blockedNavigationPattern = /\/ad-redirect|\/collector\/ad-click|\/collector\/redirected|\/collector\/frame-redirect/i;
  const cookieBannerSelector = [
    '#onetrust-banner-sdk',
    '#CybotCookiebotDialog',
    '#didomi-host',
    '#usercentrics-root',
    '#CXQnmb',
    '.KxvlWc',
    '.GZ7xNe',
    '[id*="cookie" i]',
    '[class*="cookie" i]',
    '[id*="consent" i]',
    '[class*="consent" i]',
    '[aria-label*="cookie" i]',
    '[aria-label*="consent" i]',
    '[role="dialog"]'
  ].join(',');
  const cookieRejectText = [
    'reject all',
    'reject',
    'decline all',
    'decline',
    'deny all',
    'deny',
    'necessary only',
    'essential only',
    'only necessary',
    'only essential',
    'continue without accepting',
    'do not accept',
    'refuse',
    'opt out',
    'alle ablehnen',
    'alles ablehnen',
    'ablehnen',
    'nicht akzeptieren',
    'nur erforderliche',
    'nur notwendige',
    'tout refuser',
    'refuser',
    'rechazar todo',
    'rechazar',
    'rifiuta tutto',
    'rifiuta',
    'weigeren',
    'alles weigeren'
  ];
  const cookieSettingsText = [
    'manage options',
    'manage settings',
    'preferences',
    'customize',
    'settings',
    'options',
    'weitere optionen',
    'optionen verwalten',
    'datenschutzeinstellungen',
    'manage privacy'
  ];
  const cookieAcceptText = [
    'accept',
    'agree',
    'allow all',
    'accept all',
    'i agree',
    'alle akzeptieren',
    'akzeptieren'
  ];
  const DEFAULT_FINGERPRINT_PROFILE = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Poisoned/1.0',
    platform: 'Win32',
    language: 'en-US',
    languages: ['en-US', 'en'],
    hardwareConcurrency: 8,
    deviceMemory: 69,
    webdriver: false,
    maxTouchPoints: 0,
    vendor: 'Google Inc.',
    webglVendor: 'Google Inc.',
    webglRenderer: 'ANGLE (Google, Vulkan 1.3.0)',
    doNotTrack: '1',
    globalPrivacyControl: true,
    cookieEnabled: true
  };
  let settings = {
    enabled: true,
    spoofingEnabled: true,
    poisoningEnabled: true,
    popupBlockingEnabled: true,
    cloudflareCompatibilityEnabled: true,
    autoRejectCookiesEnabled: true,
    webrtcShieldEnabled: true,
    headerProtectionEnabled: true,
    trustedSites: [],
    antidoteModeEnabled: false,
    poisonPersona: null,
    fingerprintProfile: DEFAULT_FINGERPRINT_PROFILE
  };
  const poisonedTargets = new Set();
  let started = false;
  let cloudflareCompatibilityActive = false;
  let cookieRejectObserver = null;
  let cookieRejectScans = 0;

  const sendDebug = (event, data = {}) => {
    try {
      browserAPI.runtime.sendMessage({ command: 'debugLog', scope: 'hybrid-content', event, data });
    } catch (error) {
      // Ignore debug failures.
    }
  };

  sendDebug('content-loaded', {
    href: location.href,
    hostname: location.hostname,
    readyState: document.readyState
  });

  const normalizeHostname = (hostname) => String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\.+|\.+$/g, '');

  const hostnameMatchesTrustedSites = (hostname, trustedSites = []) => {
    const normalized = normalizeHostname(hostname);
    return normalized && trustedSites.some((site) => {
      const trusted = normalizeHostname(site);
      return trusted && (normalized === trusted || normalized.endsWith(`.${trusted}`));
    });
  };

  const isTrustedPage = () => hostnameMatchesTrustedSites(location.hostname, settings.trustedSites);

  const hasCloudflareChallengeSignal = () => {
    if (/\/cdn-cgi\/challenge-platform\//i.test(location.pathname)) {
      return true;
    }
    try {
      return Boolean(document.querySelector(
        'script[src*="/cdn-cgi/challenge-platform/" i], iframe[src*="challenges.cloudflare.com" i], form[action*="/cdn-cgi/challenge-platform/" i]'
      ));
    } catch (error) {
      return false;
    }
  };

  const isCloudflareCompatibilityPage = () => Boolean(settings.cloudflareCompatibilityEnabled && cloudflareCompatibilityActive);

  const getEffectivePageState = () => {
    const cloudflareCompat = isCloudflareCompatibilityPage();
    const antidote = Boolean(settings.antidoteModeEnabled);
    return {
      enabled: antidote ? false : settings.enabled,
      spoofingEnabled: cloudflareCompat || antidote ? false : settings.spoofingEnabled,
      webrtcShieldEnabled: cloudflareCompat || antidote ? false : settings.webrtcShieldEnabled,
      headerProtectionEnabled: settings.headerProtectionEnabled,
      popupBlockingEnabled: cloudflareCompat || antidote ? false : settings.popupBlockingEnabled,
      cloudflareCompatibilityActive: cloudflareCompat,
      antidoteModeEnabled: antidote,
      fingerprintProfile: settings.fingerprintProfile
    };
  };

  const activateCloudflareCompatibility = (reason = 'challenge-detected') => {
    if (!settings.cloudflareCompatibilityEnabled || cloudflareCompatibilityActive) {
      return;
    }
    cloudflareCompatibilityActive = true;
    sendDebug('cloudflare-compat-active', { reason, hostname: location.hostname });
    const style = document.getElementById(STYLE_ID);
    if (style) {
      style.remove();
    }
    syncPageState();
  };

  const observeCloudflareCompatibility = () => {
    if (!settings.cloudflareCompatibilityEnabled) {
      return;
    }
    if (hasCloudflareChallengeSignal()) {
      activateCloudflareCompatibility('initial-signal');
      return;
    }
    const observer = new MutationObserver(() => {
      if (hasCloudflareChallengeSignal()) {
        activateCloudflareCompatibility('mutation-signal');
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'action']
    });
    setTimeout(() => observer.disconnect(), 15000);
  };

  const loadSettings = () => {
    try {
      browserAPI.storage.local.get({ [SETTINGS_KEY]: settings }, (items) => {
        settings = { ...settings, ...(items?.[SETTINGS_KEY] || {}) };
        settings.trustedSites = Array.isArray(settings.trustedSites) ? settings.trustedSites : [];
        settings.poisonPersona = settings.poisonPersona || null;
        settings.fingerprintProfile = {
          ...DEFAULT_FINGERPRINT_PROFILE,
          ...(settings.fingerprintProfile || {})
        };
        sendDebug('settings-loaded', {
          enabled: settings.enabled,
          autoRejectCookiesEnabled: settings.autoRejectCookiesEnabled,
          antidoteModeEnabled: settings.antidoteModeEnabled,
          trusted: isTrustedPage(),
          hostname: location.hostname
        });
        syncPageState();
        startPageFeatures();
      });
    } catch (error) {
      sendDebug('settings-load-failed', { message: error.message });
      startPageFeatures();
    }
  };

  const injectCss = () => {
    const root = document.documentElement || document.head;
    if (!root || document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = POPUP_CSS;
    root.appendChild(style);
  };

  const textOf = (node) => (
    node?.textContent ||
    node?.value ||
    node?.getAttribute?.('aria-label') ||
    ''
  ).trim();

  const isVisible = (node) => {
    if (!node || typeof node.getBoundingClientRect !== 'function') {
      return false;
    }
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };

  const isCookieContainer = (node) => {
    const text = textOf(node).toLowerCase();
    const marker = `${node?.id || ''} ${node?.className || ''} ${node?.getAttribute?.('aria-label') || ''}`.toLowerCase();
    return text.includes('cookie') ||
      text.includes('cookies') ||
      text.includes('consent') ||
      text.includes('privacy') ||
      text.includes('datenschutz') ||
      text.includes('personalisierung') ||
      text.includes('alle ablehnen') ||
      marker.includes('cookie') ||
      marker.includes('consent') ||
      marker.includes('cxqnmb') ||
      marker.includes('kxvlwc');
  };

  const findConsentButton = (container, preferredText) => {
    const buttons = Array.from(container.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a'));
    return buttons.find((button) => {
      if (!isVisible(button)) {
        return false;
      }
      const text = textOf(button).toLowerCase();
      return preferredText.some((candidate) => text.includes(candidate)) &&
        !cookieAcceptText.some((candidate) => text === candidate || text.includes(candidate));
    });
  };

  const findGoogleConsentRejectButton = () => {
    const direct = document.querySelector('#W0wltc');
    if (direct && isVisible(direct)) {
      return direct;
    }
    return Array.from(document.querySelectorAll('button, [role="button"]')).find((button) => {
      if (!isVisible(button)) {
        return false;
      }
      const text = textOf(button).toLowerCase();
      const marker = `${button.id || ''} ${button.className || ''} ${button.getAttribute?.('aria-label') || ''}`.toLowerCase();
      return /alle ablehnen|alles ablehnen|reject all|decline all/.test(`${text} ${marker}`) &&
        !/alle akzeptieren|accept all/.test(`${text} ${marker}`);
    });
  };

  const activateButton = (button) => {
    try {
      button.scrollIntoView({ block: 'center', inline: 'center' });
    } catch (error) {
      // Ignore scroll failures.
    }
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      try {
        button.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      } catch (error) {
        // Continue with native click fallback.
      }
    }
    try {
      button.click();
    } catch (error) {
      // Ignore final click failures.
    }
  };

  const autoRejectCookieBanners = () => {
    if (!settings.enabled || !settings.autoRejectCookiesEnabled || settings.antidoteModeEnabled || isCloudflareCompatibilityPage() || isTrustedPage()) {
      return;
    }

    const googleRejectButton = findGoogleConsentRejectButton();
    if (googleRejectButton) {
      sendDebug('cookie-reject-click', { text: textOf(googleRejectButton).slice(0, 80), hostname: location.hostname, provider: 'google' });
      activateButton(googleRejectButton);
      return;
    }

    const containers = Array.from(document.querySelectorAll(cookieBannerSelector))
      .filter((node) => isVisible(node) && isCookieContainer(node));

    for (const container of containers) {
      const rejectButton = findConsentButton(container, cookieRejectText);
      if (rejectButton) {
        sendDebug('cookie-reject-click', { text: textOf(rejectButton).slice(0, 80), hostname: location.hostname });
        activateButton(rejectButton);
        return;
      }

      const settingsButton = findConsentButton(container, cookieSettingsText);
      if (settingsButton) {
        sendDebug('cookie-settings-click', { text: textOf(settingsButton).slice(0, 80), hostname: location.hostname });
        activateButton(settingsButton);
        setTimeout(autoRejectCookieBanners, 500);
        return;
      }
    }
  };

  const observeCookieBanners = () => {
    if (!settings.enabled || !settings.autoRejectCookiesEnabled || settings.antidoteModeEnabled || isCloudflareCompatibilityPage() || isTrustedPage()) {
      if (cookieRejectObserver) {
        cookieRejectObserver.disconnect();
        cookieRejectObserver = null;
      }
      sendDebug('cookie-reject-skip', {
        enabled: settings.enabled,
        autoRejectCookiesEnabled: settings.autoRejectCookiesEnabled,
        antidoteModeEnabled: settings.antidoteModeEnabled,
        cloudflareCompatibilityActive: isCloudflareCompatibilityPage(),
        trusted: isTrustedPage(),
        hostname: location.hostname
      });
      return;
    }

    sendDebug('cookie-reject-observe', {
      hostname: location.hostname,
      readyState: document.readyState,
      googleRejectFound: Boolean(document.querySelector('#W0wltc'))
    });
    autoRejectCookieBanners();
    if (!cookieRejectObserver) {
      cookieRejectScans = 0;
      [100, 350, 800, 1500, 3000, 5000].forEach((delay) => {
        setTimeout(autoRejectCookieBanners, delay);
      });
      const intervalId = setInterval(() => {
        cookieRejectScans += 1;
        autoRejectCookieBanners();
        if (cookieRejectScans >= COOKIE_REJECT_MAX_SCANS) {
          clearInterval(intervalId);
        }
      }, COOKIE_REJECT_SCAN_MS);

      cookieRejectObserver = new MutationObserver(autoRejectCookieBanners);
      cookieRejectObserver.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'style', 'aria-label']
      });
    }
  };

  const isPlayerFrame = (frame) => {
    const rect = frame.getBoundingClientRect();
    const src = frame.getAttribute('src') || '';
    const marker = `${frame.id || ''} ${frame.className || ''} ${frame.getAttribute('title') || ''}`;
    return rect.width >= 520 &&
      rect.height >= 280 &&
      /voe|dood|filemoon|vidmoly|stream|player|video|embed/i.test(`${src} ${marker}`);
  };

  const isAdFrame = (frame) => {
    const rect = frame.getBoundingClientRect();
    const src = frame.getAttribute('src') || '';
    const marker = `${frame.id || ''} ${frame.className || ''} ${frame.getAttribute('title') || ''}`;
    const hasAdSignature = /ad|ads|advert|banner|popup|pop|promo|sponsor|campaign|onclick|thatdisform|\.cyou|data-onopen/i.test(`${src} ${marker}`);
    if (hasAdSignature && !isPlayerFrame(frame)) {
      return true;
    }
    return !isPlayerFrame(frame) &&
      rect.width >= 160 &&
      rect.width <= Math.max(620, innerWidth * 0.85) &&
      rect.height >= 60 &&
      rect.height <= Math.max(320, innerHeight * 0.7);
  };

  const removePopups = () => {
    if (!settings.enabled || settings.antidoteModeEnabled || !settings.popupBlockingEnabled || isCloudflareCompatibilityPage()) {
      return;
    }
    if (isTrustedPage()) {
      return;
    }
    injectCss();

    const directSelectors = [
      '[data-onopen]',
      '.mask[data-onopen]',
      '.wrapper[data-area]',
      'img.pic[src*="thatdisform" i]',
      'img[src*=".cyou/" i]',
      '#stream.hosterSiteDirectNav',
      '.hosterSiteDirectNav'
    ].join(',');

    for (const node of Array.from(document.querySelectorAll(directSelectors))) {
      if (!isVisible(node)) {
        continue;
      }
      const text = textOf(node);
      if (node.matches('[data-onopen], .mask[data-onopen], img.pic, img[src*=".cyou/" i]') || adTextPattern.test(text)) {
        node.remove();
      }
    }

    for (const frame of Array.from(document.querySelectorAll('iframe'))) {
      if (isVisible(frame) && isAdFrame(frame)) {
        frame.remove();
      }
    }

    for (const node of Array.from(document.querySelectorAll('div, section, aside, [role="dialog"], [aria-modal="true"]')).slice(0, 800)) {
      if (!isVisible(node)) {
        continue;
      }
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const zIndex = Number.parseInt(style.zIndex, 10) || 0;
      const positioned = style.position === 'fixed' || style.position === 'absolute' || style.position === 'sticky';
      if (adTextPattern.test(textOf(node)) && (positioned || zIndex >= 100 || rect.width >= 180 && rect.height >= 70)) {
        node.remove();
      }
    }
  };

  const injectPageScript = () => {
    const root = document.documentElement || document.head;
    if (!root) {
      return;
    }
    const script = document.createElement('script');
    script.src = browserAPI.runtime.getURL(PAGE_SCRIPT);
    script.dataset.poisonState = JSON.stringify(getEffectivePageState());
    script.onload = () => script.remove();
    root.appendChild(script);
  };

  const syncPageState = () => {
    window.dispatchEvent(new CustomEvent('POISON_IDENTITY_STATE', {
      detail: getEffectivePageState()
    }));
  };

  const targetFromUrl = (urlString) => {
    try {
      const url = new URL(urlString, location.href);
      if (!/^https?:$/.test(url.protocol)) {
        return '';
      }
      if (url.origin === location.origin && /\/collector\/fetch|\/pixel\.gif/i.test(url.pathname)) {
        return url.href;
      }
      if (url.origin === location.origin) {
        return '';
      }
      return trackerPattern.test(url.href) ? url.href : '';
    } catch (error) {
      return '';
    }
  };

  const discoverPoisonTargets = () => {
    const urls = new Set();
    for (const node of Array.from(document.querySelectorAll('script[src], iframe[src], img[src], link[href], a[href]')).slice(0, 500)) {
      const rawUrl = node.getAttribute('src') || node.getAttribute('href') || '';
      const target = targetFromUrl(rawUrl);
      if (target) {
        urls.add(target);
      }
      if (urls.size >= MAX_POISON_TARGETS) {
        break;
      }
    }
    return Array.from(urls);
  };

  const poisonTrackers = () => {
    if (!settings.enabled || settings.antidoteModeEnabled || !settings.poisoningEnabled || isCloudflareCompatibilityPage()) {
      return;
    }
    if (isTrustedPage()) {
      return;
    }
    for (const target of discoverPoisonTargets()) {
      if (poisonedTargets.has(target)) {
        continue;
      }
      poisonedTargets.add(target);
      try {
        const url = new URL(target);
        const interests = Array.isArray(settings.poisonPersona?.interests) && settings.poisonPersona.interests.length
          ? settings.poisonPersona.interests
          : ['travel', 'finance', 'gaming', 'fitness', 'luxury'];
        url.searchParams.set('poison', '1');
        url.searchParams.set('persona', settings.poisonPersona?.id || 'standard');
        url.searchParams.set('pid', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        url.searchParams.set('interest', interests[Math.floor(Math.random() * interests.length)]);
        browserAPI.runtime.sendMessage({ command: 'poisonHybridRequest', url: url.href });
      } catch (error) {
        sendDebug('poison-target-failed', { message: error.message });
      }
      if (poisonedTargets.size >= MAX_POISON_TARGETS) {
        break;
      }
    }
  };

  const shouldBlockClick = (event) => {
    if (!settings.enabled || settings.antidoteModeEnabled || !settings.popupBlockingEnabled || isCloudflareCompatibilityPage()) {
      return false;
    }
    if (isTrustedPage()) {
      return false;
    }
    const target = event.target?.closest?.('a[href], button, [role="button"], [onclick]');
    if (!target) {
      return false;
    }
    const href = target.getAttribute?.('href') || '';
    const onclick = target.getAttribute?.('onclick') || '';
    const text = textOf(target);
    if (/download|final-file\.zip/i.test(`${href} ${text}`)) {
      return false;
    }
    return blockedNavigationPattern.test(`${href} ${onclick}`) ||
      adTextPattern.test(text) ||
      /buy now|trade now|continue|sponsor|advert|promo/i.test(`${text} ${target.id || ''} ${target.className || ''}`);
  };

  const installClickGuards = () => {
    const guard = (event) => {
      if (!shouldBlockClick(event)) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      sendDebug('click-blocked', {
        tag: event.target?.tagName || '',
        text: textOf(event.target).slice(0, 80)
      });
    };
    document.addEventListener('pointerdown', guard, true);
    document.addEventListener('click', guard, true);
    document.addEventListener('auxclick', guard, true);
  };

  browserAPI.runtime.onMessage.addListener((message) => {
    if (message?.command === 'poisonHybridFetch' && message.url) {
      fetch(message.url, {
        mode: 'no-cors',
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      }).catch(() => {});
    }
  });

  browserAPI.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) {
      return;
    }
    settings = { ...settings, ...(changes[SETTINGS_KEY].newValue || {}) };
    settings.trustedSites = Array.isArray(settings.trustedSites) ? settings.trustedSites : [];
    settings.poisonPersona = settings.poisonPersona || null;
    settings.fingerprintProfile = {
      ...DEFAULT_FINGERPRINT_PROFILE,
      ...(settings.fingerprintProfile || {})
    };
    syncPageState();
    observeCookieBanners();
    if (isTrustedPage() || settings.antidoteModeEnabled) {
      return;
    }
    if (settings.popupBlockingEnabled) {
      removePopups();
    }
  });

  const startPageFeatures = () => {
    if (started) {
      return;
    }
    started = true;
    injectCss();
    observeCloudflareCompatibility();
    if (isTrustedPage() || settings.antidoteModeEnabled) {
      sendDebug('trusted-site-bypass', { hostname: location.hostname });
      return;
    }
    removePopups();
    observeCookieBanners();
    injectPageScript();
    poisonTrackers();
    installClickGuards();

    const observer = new MutationObserver(removePopups);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'style', 'src', 'href', 'data-onopen', 'aria-label']
    });

    setInterval(removePopups, 1000);
    setInterval(poisonTrackers, POISON_RATE_MS);
  };

  loadSettings();
})();
