const POISON_RATE_MS = 30000;
const MAX_POISONED_TARGETS = 10;
const COOKIE_REJECT_SCAN_MS = 1200;
const COOKIE_REJECT_MAX_SCANS = 20;
const POPUP_BLOCK_SCAN_MS = 1000;
const POPUP_BLOCK_MAX_SCANS = 0;
const COSMETIC_STORAGE_KEY = 'poisonCosmeticSelectors';
const COSMETIC_STYLE_ID = 'poison-identity-cosmetic-filters';
const MAX_PAGE_COSMETIC_SELECTORS = 1500;
const BUILT_IN_POPUP_CSS = `
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
const EMERGENCY_POPUP_STYLE_ID = 'poison-identity-emergency-popup-css';
const BUILT_IN_POPUP_SELECTORS = [
  '[id*="adblock" i]',
  '[class*="adblock" i]',
  '[id*="anti-adblock" i]',
  '[class*="anti-adblock" i]',
  '[id*="banner-ad" i]',
  '[class*="banner-ad" i]',
  '[id*="ad-banner" i]',
  '[class*="ad-banner" i]',
  '[id*="advertisement" i]',
  '[class*="advertisement" i]',
  '[id*="sponsored" i]',
  '[class*="sponsored" i]',
  '[id*="push" i][id*="notif" i]',
  '[class*="push" i][class*="notif" i]',
  '[aria-label*="advert" i]',
  '[aria-label*="sponsor" i]',
  '[data-onopen]',
  'img.pic[src*="thatdisform.cyou" i]',
  'img[src*="thatdisform.cyou" i]',
  '.mask[data-onopen]',
  '.wrapper[data-area]'
];
const COMMON_AD_PATTERNS = [
  'ads',
  'doubleclick',
  'adservice',
  'advert',
  'sponsor',
  'tracking',
  'track',
  'analytics',
  'pixel',
  'banner'
];
const SUSPICIOUS_NAV_PATTERNS = [
  'click',
  'clk',
  'pop',
  'popup',
  'redirect',
  'redir',
  'out.php',
  'go.php',
  'link.php',
  'visit.php',
  'afu.php',
  '/go/',
  '/out/',
  '/redirect/',
  'adsterra',
  'propeller',
  'popcash',
  'onclick',
  'traffic',
  'campaign',
  'affiliate',
  'captcha',
  'picture_captcha',
  'psid=',
  '/sbx/',
  'csel',
  'md='
];
const CROSS_SITE_LURE_PATTERNS = [
  'update',
  'download',
  'verify'
];
const SUSPICIOUS_REDIRECT_HOSTS = [
  'bladelikefreightwhat.com',
  'rostelshute.shop',
  'sewarsremeets.cfd',
  'thatdisform.cyou',
  'watchcolleague.com',
  'redgarto.com',
  'flushpersist.com',
  'workdeadlinededicate.com',
  'preferencenail.com'
];
const SUSPICIOUS_REDIRECT_TLDS = [
  'cfd',
  'cyou',
  'top',
  'xyz',
  'click',
  'link',
  'monster',
  'quest',
  'sbs',
  'icu'
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

const browserAPI = window.browser || window.chrome;

const installEmergencyPopupCss = () => {
  const root = document.documentElement || document.head;
  if (!root || document.getElementById(EMERGENCY_POPUP_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = EMERGENCY_POPUP_STYLE_ID;
  style.textContent = BUILT_IN_POPUP_CSS;
  root.appendChild(style);
};

installEmergencyPopupCss();
document.addEventListener('DOMContentLoaded', installEmergencyPopupCss, { once: true });

const isEmergencyPopupFrame = (element) => {
  if (!element || element.tagName !== 'IFRAME' || typeof element.getBoundingClientRect !== 'function') {
    return false;
  }
  const rect = element.getBoundingClientRect();
  const src = element.getAttribute('src') || '';
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('title') || ''}`.toLowerCase();
  const adSignature = /ad|ads|advert|banner|popup|pop|promo|sponsor|campaign|onclick|thatdisform|\.cyou|data-onopen/i.test(`${src} ${marker}`);
  const largeKnownPlayer = rect.width >= 520 &&
    rect.height >= 280 &&
    /voe|dood|filemoon|vidmoly|stream|player|video|embed/i.test(`${src} ${marker}`);
  return !largeKnownPlayer &&
    adSignature &&
    rect.width >= 160 &&
    rect.width <= Math.max(620, window.innerWidth * 0.85) &&
    rect.height >= 60 &&
    rect.height <= Math.max(320, window.innerHeight * 0.7);
};

const emergencyRemovePopups = () => {
  try {
    const directTargets = document.querySelectorAll('[data-onopen], .mask[data-onopen], .wrapper[data-area], img.pic[src*="thatdisform" i], img[src*=".cyou/" i]');
    for (const element of directTargets) {
      element.remove();
    }

    for (const frame of Array.from(document.querySelectorAll('iframe'))) {
      if (isEmergencyPopupFrame(frame)) {
        frame.remove();
      }
    }
  } catch (error) {
    // Keep content script alive on hostile pages.
  }
};

emergencyRemovePopups();
document.addEventListener('DOMContentLoaded', emergencyRemovePopups, { once: true });
setTimeout(emergencyRemovePopups, 250);
setTimeout(emergencyRemovePopups, 1000);

const debugLog = (event, data = {}) => {
  try {
    browserAPI.runtime.sendMessage({ command: 'debugLog', scope: 'content', event, data });
  } catch (error) {
    console.debug('[Poison Identity]', event, data);
  }
};

const appendToDocument = (node) => {
  (document.head || document.documentElement || document.body).appendChild(node);
};

let pagePoisonCount = 0;
let pageDetectedTargets = 0;
let pageFingerprintProbes = 0;
const poisonedTargets = new Set();
let extensionState = {
  enabled: false,
  spoofingEnabled: false,
  poisoningEnabled: false,
  webrtcShieldEnabled: true,
  headerProtectionEnabled: true,
  autoRejectCookiesEnabled: true,
  popupBlockingEnabled: true,
  cloudflareCompatibilityEnabled: true,
  antidoteModeEnabled: false,
  useRemoteFilters: false,
  trustedSites: [],
  blockedCount: 0,
  poisonRequests: 0,
  poisonPersona: null,
  fingerprintProfile: DEFAULT_FINGERPRINT_PROFILE
};

const normalizeFingerprintProfile = (profile) => ({
  ...DEFAULT_FINGERPRINT_PROFILE,
  ...(profile && typeof profile === 'object' ? profile : {}),
  languages: Array.isArray(profile?.languages) && profile.languages.length
    ? profile.languages
    : DEFAULT_FINGERPRINT_PROFILE.languages
});

const normalizeExtensionState = (state) => ({
  ...state,
  trustedSites: Array.isArray(state.trustedSites) ? state.trustedSites : [],
  fingerprintProfile: normalizeFingerprintProfile(state.fingerprintProfile)
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

const isTrustedPage = () => hostnameMatchesTrustedSites(window.location.hostname, extensionState.trustedSites);

let cloudflareCompatibilityActive = false;

const hasCloudflareChallengeSignal = () => {
  if (/\/cdn-cgi\/challenge-platform\//i.test(window.location.pathname)) {
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

const getEffectivePageState = () => {
  const cloudflareCompat = Boolean(extensionState.cloudflareCompatibilityEnabled && cloudflareCompatibilityActive);
  const antidote = Boolean(extensionState.antidoteModeEnabled);
  return {
    enabled: antidote ? false : extensionState.enabled,
    spoofingEnabled: cloudflareCompat || antidote ? false : extensionState.spoofingEnabled,
    webrtcShieldEnabled: cloudflareCompat || antidote ? false : extensionState.webrtcShieldEnabled,
    headerProtectionEnabled: extensionState.headerProtectionEnabled,
    popupBlockingEnabled: cloudflareCompat || antidote ? false : extensionState.popupBlockingEnabled,
    cloudflareCompatibilityActive: cloudflareCompat,
    antidoteModeEnabled: antidote,
    fingerprintProfile: extensionState.fingerprintProfile
  };
};

const activateCloudflareCompatibility = (reason = 'challenge-detected') => {
  if (!extensionState.cloudflareCompatibilityEnabled || cloudflareCompatibilityActive) {
    return;
  }
  cloudflareCompatibilityActive = true;
  debugLog('cloudflare-compat-active', { reason, hostname: window.location.hostname });
  removeCosmeticFilters();
  if (popupBlockObserver) {
    popupBlockObserver.disconnect();
    popupBlockObserver = null;
  }
  syncPageState();
};

const isCloudflareCompatibilityPage = () => Boolean(extensionState.cloudflareCompatibilityEnabled && cloudflareCompatibilityActive);
const isAntidotePage = () => Boolean(extensionState.antidoteModeEnabled);

const observeCloudflareCompatibility = () => {
  if (!extensionState.cloudflareCompatibilityEnabled) {
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

let cookieRejectScans = 0;
let cookieRejectObserver = null;
let popupBlockScans = 0;
let popupBlockObserver = null;
let cosmeticFilterRules = [];

const overlayStyle = `
#poison-identity-overlay {
  position: fixed;
  right: 14px;
  top: 14px;
  width: 240px;
  z-index: 2147483647;
  font-family: Inter, system-ui, sans-serif;
  background: rgba(15, 16, 20, 0.96);
  color: #f5f5f5;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  padding: 12px 14px;
  backdrop-filter: blur(12px);
  min-width: 220px;
}
#poison-identity-overlay .overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
#poison-identity-overlay .overlay-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
#poison-identity-overlay .overlay-close {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #f5f5f5;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
#poison-identity-overlay .overlay-status {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}
#poison-identity-overlay .overlay-status span {
  display: flex;
  justify-content: space-between;
}
#poison-identity-overlay .overlay-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
#poison-identity-overlay .overlay-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 10px 8px;
  text-align: center;
}
#poison-identity-overlay .overlay-card strong {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}
#poison-identity-overlay .overlay-card small {
  color: #b8b8b8;
  font-size: 10px;
}
#poison-identity-overlay .overlay-footer {
  margin-top: 10px;
  font-size: 10px;
  opacity: 0.78;
  text-align: center;
}
`;

const overlayTemplate = `
  <div class="overlay-header">
    <div class="overlay-title">Poison Identity</div>
    <button class="overlay-close" type="button">x</button>
  </div>
  <div class="overlay-status">
    <span><strong>Protection</strong><span id="overlay-protection">Loading</span></span>
    <span><strong>Poisoning</strong><span id="overlay-poisoning">Loading</span></span>
    <span><strong>Detected</strong><span id="overlay-detected-count">0</span></span>
  </div>
  <div class="overlay-card-grid">
    <div class="overlay-card"><strong id="overlay-blocked-count">0</strong><small>Blocked total</small></div>
    <div class="overlay-card"><strong id="overlay-poisoned-count">0</strong><small>Page poison</small></div>
    <div class="overlay-card"><strong id="overlay-fingerprint-count">0</strong><small>Fingerprint probes</small></div>
    <div class="overlay-card"><strong id="overlay-poison-status">0%</strong><small>Poison status</small></div>
  </div>
  <div class="overlay-footer">Blocked trackers and hidden poison requests visualized.</div>
`;

const bannerStyle = `
#poison-identity-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(18, 48, 73, 0.94);
  color: #f5f5f5;
  font-family: Inter, system-ui, sans-serif;
  font-size: 13px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
}
#poison-identity-banner .banner-title {
  font-weight: 700;
}
#poison-identity-banner .banner-status {
  opacity: 0.9;
}
#poison-identity-banner .banner-close {
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 999px;
  width: 26px;
  height: 26px;
  cursor: pointer;
}
#poison-identity-banner + * {
  margin-top: 46px !important;
}
`;

const bannerTemplate = `
  <div>
    <span class="banner-title">Poison Identity</span>
    <span class="banner-status" id="banner-status">Loading...</span>
  </div>
  <button class="banner-close" type="button" aria-label="Close Poison banner">x</button>
`;

const createOverlay = () => {
  if (document.getElementById('poison-identity-overlay')) {
    return;
  }

  const style = document.createElement('style');
  style.textContent = overlayStyle;
  appendToDocument(style);

  const overlay = document.createElement('div');
  overlay.id = 'poison-identity-overlay';
  overlay.innerHTML = overlayTemplate;
  document.documentElement.appendChild(overlay);

  const closeButton = overlay.querySelector('.overlay-close');
  closeButton.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
};

const createBanner = () => {
  if (document.getElementById('poison-identity-banner')) {
    return;
  }

  const style = document.createElement('style');
  style.textContent = bannerStyle;
  appendToDocument(style);

  const banner = document.createElement('div');
  banner.id = 'poison-identity-banner';
  banner.innerHTML = bannerTemplate;
  document.documentElement.appendChild(banner);

  const closeButton = banner.querySelector('.banner-close');
  closeButton.addEventListener('click', () => {
    banner.style.display = 'none';
  });
};

const updateBanner = () => {
  const banner = document.getElementById('poison-identity-banner');
  if (!banner) {
    return;
  }
  const statusText = banner.querySelector('#banner-status');
  if (statusText) {
    if (extensionState.enabled) {
      statusText.textContent = 'Active - blocking trackers and poisoning noise';
    } else {
      statusText.textContent = 'Paused - reload extension to activate';
    }
  }
};

const setOverlayText = (id, value) => {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
};

const getPoisonStatus = () => {
  const total = Math.max(pageDetectedTargets, 1);
  return `${Math.round((pagePoisonCount / total) * 100)}%`;
};

const recordFingerprintProbe = () => {
  pageFingerprintProbes += 1;
  updateOverlay();
};

const syncPageState = () => {
  const pageState = getEffectivePageState();
  window.dispatchEvent(new CustomEvent('POISON_IDENTITY_STATE', {
    detail: pageState
  }));
};

const installPagePrivacyHooks = () => {
  debugLog('page-hooks-install-start', { href: window.location.href });
  window.addEventListener('POISON_IDENTITY_FINGERPRINT_PROBE', recordFingerprintProbe);
  window.addEventListener('POISON_IDENTITY_NAVIGATION_BLOCKED', (event) => {
    debugLog('page-blocked-surface', event.detail || {});
    pageDetectedTargets += 1;
    updateOverlay();
  });

  const script = document.createElement('script');
  script.src = browserAPI.runtime.getURL('pageScript.js');
  script.dataset.poisonState = JSON.stringify(getEffectivePageState());
  script.onload = () => {
    debugLog('page-script-loaded');
    script.remove();
  };
  script.onerror = () => debugLog('page-script-error', { url: script.src });
  appendToDocument(script);
};

const updateOverlay = () => {
  return;
  setOverlayText('overlay-protection', extensionState.enabled ? 'Active' : 'Paused');
  setOverlayText('overlay-poisoning', extensionState.poisoningEnabled ? 'Active' : 'Paused');
  setOverlayText('overlay-blocked-count', extensionState.blockedCount || 0);
  setOverlayText('overlay-poisoned-count', pagePoisonCount);
  setOverlayText('overlay-fingerprint-count', pageFingerprintProbes);
  setOverlayText('overlay-detected-count', pageDetectedTargets);
  setOverlayText('overlay-poison-status', extensionState.poisoningEnabled ? getPoisonStatus() : '0%');
  updateBanner();
};

const refreshOverlayState = () => {
  browserAPI.storage.local.get({ blockedCount: 0, poisonRequests: 0, enabled: false, spoofingEnabled: false, poisoningEnabled: false, webrtcShieldEnabled: true, headerProtectionEnabled: true, autoRejectCookiesEnabled: true, popupBlockingEnabled: true, cloudflareCompatibilityEnabled: true, antidoteModeEnabled: false, useRemoteFilters: false, trustedSites: [], poisonPersona: null, fingerprintProfile: DEFAULT_FINGERPRINT_PROFILE }, (data) => {
    extensionState = normalizeExtensionState({ ...extensionState, ...data });
    updateOverlay();
  });
};

const setupStorageListener = () => {
  browserAPI.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') {
      return;
    }
    let changed = false;
    if (changes[COSMETIC_STORAGE_KEY]) {
      cosmeticFilterRules = Array.isArray(changes[COSMETIC_STORAGE_KEY].newValue) ? changes[COSMETIC_STORAGE_KEY].newValue : [];
      debugLog('cosmetic-rules-updated', { count: cosmeticFilterRules.length });
      applyCosmeticFilters();
    }
    ['blockedCount', 'poisonRequests', 'enabled', 'spoofingEnabled', 'poisoningEnabled', 'webrtcShieldEnabled', 'headerProtectionEnabled', 'autoRejectCookiesEnabled', 'popupBlockingEnabled', 'cloudflareCompatibilityEnabled', 'antidoteModeEnabled', 'useRemoteFilters', 'trustedSites', 'poisonPersona', 'fingerprintProfile'].forEach((key) => {
      if (changes[key]) {
        extensionState[key] = changes[key].newValue;
        changed = true;
      }
    });
    if (changed) {
      extensionState = normalizeExtensionState(extensionState);
      updateOverlay();
      syncPageState();
      if (extensionState.enabled && extensionState.autoRejectCookiesEnabled) {
        observeCookieBanners();
      } else if (cookieRejectObserver) {
        cookieRejectObserver.disconnect();
        cookieRejectObserver = null;
      }
      if (extensionState.enabled && extensionState.popupBlockingEnabled && !isAntidotePage()) {
        observeAnnoyancePopups();
        applyCosmeticFilters();
      } else if (popupBlockObserver) {
        popupBlockObserver.disconnect();
        popupBlockObserver = null;
        removeCosmeticFilters();
      }
    }
  });
};

const domainMatches = (hostname, domain) => hostname === domain || hostname.endsWith(`.${domain}`);

const selectorAppliesToPage = (rule) => {
  if (!rule || !rule.selector) {
    return false;
  }
  if (!Array.isArray(rule.domains) || rule.domains.length === 0) {
    return true;
  }
  const hostname = window.location.hostname.toLowerCase();
  return rule.domains.some((domain) => domainMatches(hostname, domain));
};

const isValidPageSelector = (selector) => {
  try {
    document.documentElement.matches(selector);
    return true;
  } catch (error) {
    return false;
  }
};

const applyCosmeticFilters = () => {
  if (!extensionState.enabled || !extensionState.popupBlockingEnabled || isCloudflareCompatibilityPage() || isAntidotePage()) {
    removeCosmeticFilters();
    return;
  }

  const remoteSelectors = [];

  const selectors = Array.from(new Set([...BUILT_IN_POPUP_SELECTORS, ...remoteSelectors]))
    .filter(isValidPageSelector)
    .slice(0, MAX_PAGE_COSMETIC_SELECTORS);

  if (selectors.length === 0) {
    debugLog('cosmetic-empty', { remoteRules: cosmeticFilterRules.length, useRemoteFilters: extensionState.useRemoteFilters });
    removeCosmeticFilters();
    return;
  }

  let style = document.getElementById(COSMETIC_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = COSMETIC_STYLE_ID;
    document.documentElement.appendChild(style);
  }

  style.textContent = `${BUILT_IN_POPUP_CSS}\n${selectors.join(',\n')} {\n  display: none !important;\n  visibility: hidden !important;\n}`;
  debugLog('cosmetic-applied', { selectors: selectors.length, remoteRules: cosmeticFilterRules.length });
};

const removeCosmeticFilters = () => {
  const style = document.getElementById(COSMETIC_STYLE_ID);
  if (style) {
    style.remove();
  }
};

const loadCosmeticFilters = () => {
  browserAPI.storage.local.get({ [COSMETIC_STORAGE_KEY]: [] }, (data) => {
    cosmeticFilterRules = Array.isArray(data[COSMETIC_STORAGE_KEY]) ? data[COSMETIC_STORAGE_KEY] : [];
    debugLog('cosmetic-loaded', { count: cosmeticFilterRules.length });
    applyCosmeticFilters();
  });
};

const appendPoisonMarker = (url) => {
  try {
    const parsed = new URL(url, window.location.href);
    const persona = extensionState.poisonPersona || {};
    const interests = Array.isArray(persona.interests) && persona.interests.length
      ? persona.interests
      : ['privacy', 'software', 'news'];
    const sources = Array.isArray(persona.poisonSources) && persona.poisonSources.length
      ? persona.poisonSources
      : ['google', 'newsletter', 'social', 'partner'];
    parsed.searchParams.set('poison', '1');
    parsed.searchParams.set('persona', persona.id || 'standard');
    parsed.searchParams.set('utm_source', pick(sources));
    parsed.searchParams.set('utm_medium', pick(['cpc', 'display', 'email', 'affiliate']));
    parsed.searchParams.set('utm_campaign', pick(['spring_sale', 'retargeting', 'brand_awareness', 'trial']));
    parsed.searchParams.set('interest', pick(interests));
    parsed.searchParams.set('cid', Math.random().toString(36).slice(2, 12));
    return parsed.toString();
  } catch (error) {
    return url;
  }
};

const pick = (values) => values[Math.floor(Math.random() * values.length)];

const incrementGlobalPoisonRequests = () => {
  browserAPI.storage.local.get({ poisonRequests: 0 }, (data) => {
    browserAPI.storage.local.set({ poisonRequests: (data.poisonRequests || 0) + 1 });
  });
};

const createHiddenRequest = (url) => {
  if (poisonedTargets.has(url) || poisonedTargets.size >= MAX_POISONED_TARGETS) {
    return;
  }
  poisonedTargets.add(url);

  const img = document.createElement('img');
  img.src = appendPoisonMarker(url);
  img.style.width = '1px';
  img.style.height = '1px';
  img.style.position = 'fixed';
  img.style.left = '-9999px';
  img.style.top = '-9999px';
  img.referrerPolicy = 'no-referrer';
  img.decoding = 'async';
  img.alt = '';
  document.documentElement.appendChild(img);

  pagePoisonCount += 1;
  incrementGlobalPoisonRequests();
  updateOverlay();

  setTimeout(() => {
    img.remove();
  }, 15000);
};

const isAdOrTrackerUrl = (urlString) => {
  try {
    const url = new URL(urlString, window.location.href);
    return COMMON_AD_PATTERNS.some((pattern) => url.hostname.includes(pattern) || url.pathname.includes(pattern));
  } catch (error) {
    return false;
  }
};

const collectTargets = () => {
  const sources = new Set();
  const addUrl = (value) => {
    if (!value) {
      return;
    }
    try {
      const url = new URL(value, window.location.href);
      if (isAdOrTrackerUrl(url.toString())) {
        sources.add(url.toString());
      }
    } catch (error) {
      // ignore invalid URLs
    }
  };

  document.querySelectorAll('iframe[src], img[src], script[src], a[href]').forEach((node) => {
    const url = node.getAttribute('src') || node.getAttribute('href');
    addUrl(url);
  });

  document.querySelectorAll('[data-ad], [data-ads], [class*="ad"], [id*="ad"], [class*="sponsor"], [id*="sponsor"]').forEach((node) => {
    const url = node.getAttribute('src') || node.getAttribute('href') || node.dataset.ad || node.dataset.ads;
    addUrl(url);
  });

  const targets = Array.from(sources).slice(0, MAX_POISONED_TARGETS);
  pageDetectedTargets = targets.length;
  return targets;
};

const poisonPage = () => {
  if (!extensionState.enabled || !extensionState.poisoningEnabled || isCloudflareCompatibilityPage()) {
    return;
  }
  const targets = collectTargets();
  updateOverlay();
  targets.forEach((target) => createHiddenRequest(target));
};

const observeAds = () => {
  if (isCloudflareCompatibilityPage()) {
    return;
  }
  const observer = new MutationObserver(() => {
    poisonPage();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'href', 'class', 'id', 'data-ad', 'data-ads']
  });
};

const getBaseDomain = (hostname) => {
  const parts = hostname.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) {
    return parts.join('.');
  }
  return parts.slice(-2).join('.');
};

const isSameSiteUrl = (urlString) => {
  try {
    const url = new URL(urlString, window.location.href);
    return getBaseDomain(url.hostname) === getBaseDomain(window.location.hostname);
  } catch (error) {
    return true;
  }
};

const isSuspiciousNavigationUrl = (urlString) => {
  try {
    const url = new URL(urlString, window.location.href);
    const haystack = `${url.hostname} ${url.pathname} ${url.search}`.toLowerCase();
    const tld = url.hostname.toLowerCase().split('.').pop();
    return SUSPICIOUS_REDIRECT_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ||
      SUSPICIOUS_REDIRECT_TLDS.includes(tld) ||
      SUSPICIOUS_NAV_PATTERNS.some((pattern) => haystack.includes(pattern)) ||
      isAdOrTrackerUrl(url.toString());
  } catch (error) {
    return false;
  }
};

const isSuspiciousCrossSiteNavigationUrl = (urlString) => {
  if (isSuspiciousNavigationUrl(urlString)) {
    return true;
  }
  try {
    const url = new URL(urlString, window.location.href);
    const haystack = `${url.hostname} ${url.pathname} ${url.search}`.toLowerCase();
    return CROSS_SITE_LURE_PATTERNS.some((pattern) => haystack.includes(pattern));
  } catch (error) {
    return false;
  }
};

const looksLikeClickOverlay = (element) => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const zIndex = Number.parseInt(style.zIndex, 10) || 0;
  const text = getVisibleText(element);
  const coversContent = rect.width >= window.innerWidth * 0.45 && rect.height >= window.innerHeight * 0.25;
  const lowSignal = text.length < 12 || style.opacity === '0' || style.backgroundColor === 'rgba(0, 0, 0, 0)';
  return (style.position === 'fixed' || style.position === 'absolute') && zIndex >= 10 && coversContent && lowSignal;
};

const looksLikeAdLink = (element) => {
  if (isKnownPopupAdElement(element)) {
    return true;
  }
  const text = getVisibleText(element);
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`.toLowerCase();
  const media = Array.from(element.querySelectorAll?.('img[src], iframe[src]') || []);
  const mediaText = media.map((node) => `${node.getAttribute('src') || ''} ${node.getAttribute('alt') || ''}`).join(' ').toLowerCase();
  return /buy now|save up to|sale|promo|sponsor|advertisement|guardscore|looking for ads|casino|bonus|offer/.test(text) ||
    /(^|\b)(ad|ads|advert|banner|promo|sponsor|widget)(\b|[-_])/.test(marker) ||
    /adserver|doubleclick|googlesyndication|promo|sponsor|banner|campaign|affiliate|guardscore/.test(mediaText);
};

const hasAdWidgetText = (element) => {
  const text = getVisibleText(element);
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`.toLowerCase();
  const mediaText = Array.from(element.querySelectorAll?.('img[src], iframe[src], a[href]') || [])
    .map((node) => `${node.getAttribute('src') || ''} ${node.getAttribute('href') || ''} ${node.getAttribute('alt') || ''}`)
    .join(' ')
    .toLowerCase();
  return /looking for ads|kupferaktie|meldet fund|gift box|trade now|buy now|save up to|join forex|sponsored|advertisement|easy .* tutorial|continue|reward zone|book now|withdraw money|payment has increased/.test(text) ||
    /adsterra|propeller|popcash|doubleclick|googlesyndication|campaign|affiliate|banner|sponsor|promo|forex|gift|offer|thatdisform\.cyou/.test(`${marker} ${mediaText}`);
};

const isKnownPopupAdElement = (element) => {
  if (!element) {
    return false;
  }
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute?.('data-onopen') || ''}`.toLowerCase();
  const src = element.getAttribute?.('src') || '';
  const text = getVisibleText(element);
  const style = typeof window !== 'undefined' && element.nodeType === 1 ? window.getComputedStyle(element) : null;
  const zIndex = style ? Number.parseInt(style.zIndex, 10) || 0 : 0;
  return element.hasAttribute?.('data-onopen') ||
    (element.matches?.('#stream.hosterSiteDirectNav') && zIndex >= 100000 && /congratulations|available \$?35,?000|withdraw money|transfer money|please confirm|attention/.test(text)) ||
    (element.matches?.('.wrapper[data-area]') && /attention|please confirm|continue|looking for ads|withdraw money|book now|reward zone/.test(text)) ||
    (element.matches?.('div.actions') && element.closest?.('.wrapper[data-area]')) ||
    /(^|\s)mask(\s|$)/.test(marker) ||
    /(^|\s)pic(\s|$)/.test(marker) && /thatdisform\.cyou|\.cyou\//i.test(src) ||
    /thatdisform\.cyou|\/\/[^/]+\.cyou\//i.test(src);
};

const looksLikeDownloadAction = (element) => {
  const text = getVisibleText(element);
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`.toLowerCase();
  const context = getVisibleText(element.closest?.('article, main, section, .entry, .post, .content, body') || document.body).slice(0, 2000);
  const positive = /download|download link|generating download|part\s*\d+|mega(?:up|\.nz)?|1fichier|gofile|mixdrop|rapidgator|bowfile|sendcm|clicknupload|pixeldrain|mediafire|workupload/.test(`${text} ${marker}`);
  const contextual = /download|links?|hoster|part\s*\d+/.test(context) && /open|get link|generate|download|part\s*\d+/.test(`${text} ${marker}`);
  const negative = text === 'continue' ||
    /looking for ads|buy now|trade now|sponsor|advert|promo|casino|bonus|offer|subscribe|notification|allow|verify|confirm to continue|gift box|join forex/.test(`${text} ${marker}`);
  return !negative && !looksLikeAdLink(element) && (positive || contextual);
};

const looksLikeCloseControl = (element) => {
  const text = getVisibleText(element);
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`.toLowerCase();
  return text === 'x' || text === '×' || text === 'close' || /close|dismiss/.test(marker);
};

const allowNextDownloadNavigation = (element, reason) => {
  if (!looksLikeDownloadAction(element)) {
    return;
  }
  try {
    browserAPI.runtime.sendMessage({
      command: 'allowNextNavigation',
      sourceUrl: window.location.href,
      reason
    });
    debugLog('download-action-armed', {
      reason,
      tag: element.tagName,
      text: getVisibleText(element).slice(0, 80)
    });
  } catch (error) {
    debugLog('download-action-arm-failed', { message: error.message });
  }
};

const shouldBlockClickNavigation = (link) => {
  const href = link.href || link.getAttribute('href') || '';
  if (looksLikeDownloadAction(link)) {
    return false;
  }

  if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
    return Boolean(link.onclick || link.getAttribute('onclick') || looksLikeClickOverlay(link) || looksLikeAdLink(link));
  }

  if (looksLikeAdLink(link)) {
    return true;
  }

  const crossSite = !isSameSiteUrl(href);
  const targetBlank = (link.target || '').toLowerCase() === '_blank';
  const deliberateCurrentTabLink = !targetBlank && !looksLikeClickOverlay(link) && getVisibleText(link).length > 0;
  if (crossSite && deliberateCurrentTabLink) {
    return false;
  }
  return isSuspiciousNavigationUrl(href) || looksLikeClickOverlay(link) || (crossSite && (targetBlank || isSuspiciousCrossSiteNavigationUrl(href)));
};

const routeExplicitNavigation = (targetUrl, link, event, reason) => {
  if (!targetUrl || isSameSiteUrl(targetUrl) || isSuspiciousNavigationUrl(targetUrl)) {
    return false;
  }

  const openInNewTab = event.button === 1 || event.ctrlKey || event.metaKey || (link.target || '').toLowerCase() === '_blank';
  event.preventDefault();
  event.stopImmediatePropagation();

  try {
    browserAPI.runtime.sendMessage({
      command: 'openAllowedNavigation',
      sourceUrl: window.location.href,
      targetUrl,
      openInNewTab,
      active: !event.ctrlKey && !event.metaKey,
      reason
    }, (response) => {
      if (browserAPI.runtime.lastError || !response?.ok) {
        debugLog('explicit-navigation-failed', {
          targetUrl,
          message: browserAPI.runtime.lastError?.message || response?.error || ''
        });
      }
    });
  } catch (error) {
    debugLog('explicit-navigation-failed', { targetUrl, message: error.message });
  }

  debugLog('explicit-navigation-routed', { targetUrl, openInNewTab, reason });
  return true;
};

const clearPageSelection = () => {
  try {
    window.getSelection()?.removeAllRanges();
  } catch (error) {
    // Ignore selection APIs blocked by unusual documents.
  }
};

const hasAdClickTrapSignals = () => {
  const suspiciousNodes = Array.from(document.querySelectorAll('iframe[src], a[href], [onclick]')).slice(0, 250);
  return suspiciousNodes.some((node) => {
    const url = node.getAttribute('src') || node.getAttribute('href') || '';
    const marker = `${node.id || ''} ${node.className || ''} ${node.getAttribute('aria-label') || ''}`.toLowerCase();
    return isAdOrTrackerUrl(url) || /adsterra|propeller|popcash|popup|advert|sponsor|campaign|onclick|redirect/i.test(`${url} ${marker}`);
  });
};

const shouldSwallowDocumentClickTrap = (event) => {
  if (!extensionState.enabled || !extensionState.popupBlockingEnabled || isCloudflareCompatibilityPage() || isAntidotePage() || !event.isTrusted) {
    return false;
  }

  const interactive = event.target?.closest?.('a[href], area[href], button, input, select, textarea, label, video, audio, [role="button"], [contenteditable="true"]');
  if (interactive) {
    return false;
  }

  const pointElements = typeof document.elementsFromPoint === 'function'
    ? document.elementsFromPoint(event.clientX, event.clientY)
    : [];
  if (pointElements.some((element) => isPageOwnedElement(element) && looksLikePopup(element))) {
    return true;
  }

  return false;
};

const installClickRedirectShield = () => {
  const swallowSuspiciousClick = (event, phase) => {
    if (!extensionState.enabled || !extensionState.popupBlockingEnabled || isCloudflareCompatibilityPage() || isAntidotePage()) {
      return;
    }

    removeAnnoyancePopups();

    const link = event.target?.closest?.('a[href], area[href], button, [role="button"], [onclick]');
    if (!link && shouldSwallowDocumentClickTrap(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearPageSelection();
      debugLog('document-click-trap-blocked', {
        phase,
        tag: event.target?.tagName || '',
        text: getVisibleText(event.target || document.body).slice(0, 80)
      });
      return;
    }
    if (!link) {
      setTimeout(clearPageSelection, 0);
      return;
    }

    const href = link.href || link.getAttribute('href') || '';
    const popupContainer = link.closest?.('div, section, aside, [role="dialog"], [aria-modal="true"]');
    if (popupContainer && isPageOwnedElement(popupContainer) && looksLikePopup(popupContainer) && !looksLikeCloseControl(link)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      popupContainer.remove();
      clearPageSelection();
      debugLog('popup-click-removed', {
        phase,
        text: getVisibleText(popupContainer).slice(0, 100)
      });
      return;
    }

    if (looksLikeCloseControl(link)) {
      return;
    }

    if (phase !== 'pointerdown' && looksLikeDownloadAction(link)) {
      allowNextDownloadNavigation(link, phase);
    }

    const shouldGhostClick = link.matches('[onclick], button, [role="button"]')
      ? (!looksLikeDownloadAction(link) && (looksLikeClickOverlay(link) || looksLikeAdLink(link) || (href ? (!isSameSiteUrl(href) && isSuspiciousCrossSiteNavigationUrl(href)) : false)))
      : shouldBlockClickNavigation(link);

    if (!shouldGhostClick) {
      if (phase !== 'pointerdown' && href && isVisible(link) && !looksLikeClickOverlay(link) && !looksLikeAdLink(link) && !isSameSiteUrl(href)) {
        routeExplicitNavigation(href, link, event, phase);
      }
      return;
    }

    if (link.href || link.getAttribute('href')) {
      link.dataset.poisonOriginalTarget = link.target || '';
      link.removeAttribute('target');
      link.rel = `${link.rel || ''} noopener noreferrer`.trim();
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    clearPageSelection();
    debugLog('ghost-click-blocked', {
      phase,
      tag: link.tagName,
      href,
      target: link.target || '',
      text: getVisibleText(link).slice(0, 80)
    });
  };

  document.addEventListener('pointerdown', (event) => {
    swallowSuspiciousClick(event, 'pointerdown');
  }, true);

  document.addEventListener('click', (event) => {
    swallowSuspiciousClick(event, 'click');
  }, true);

  document.addEventListener('auxclick', (event) => {
    swallowSuspiciousClick(event, 'auxclick');
  }, true);

  document.addEventListener('submit', (event) => {
    if (!extensionState.enabled || !extensionState.popupBlockingEnabled || isCloudflareCompatibilityPage() || isAntidotePage()) {
      return;
    }

    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const action = form.action || window.location.href;
    const targetBlank = (form.target || '').toLowerCase() === '_blank';
    const crossSite = !isSameSiteUrl(action);
    if (isSuspiciousNavigationUrl(action) || (crossSite && targetBlank)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      debugLog('form-redirect-blocked', {
        action,
        target: form.target || ''
      });
    }
  }, true);
};

const COOKIE_BANNER_SELECTORS = [
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
];

const COOKIE_REJECT_TEXT = [
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

const COOKIE_SETTINGS_TEXT = [
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

const COOKIE_ACCEPT_TEXT = [
  'accept',
  'agree',
  'allow all',
  'accept all',
  'i agree',
  'alle akzeptieren',
  'akzeptieren'
];

const getVisibleText = (element) => (element.textContent || element.value || element.getAttribute('aria-label') || '').trim().toLowerCase();

const isVisible = (element) => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
};

const isCookieContainer = (element) => {
  const text = getVisibleText(element);
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('aria-label') || ''}`.toLowerCase();
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

const findButtonByText = (container, preferredText) => {
  const buttons = Array.from(container.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a'));
  return buttons.find((button) => {
    if (!isVisible(button)) {
      return false;
    }
    const text = getVisibleText(button);
    return preferredText.some((candidate) => text.includes(candidate)) && !COOKIE_ACCEPT_TEXT.some((candidate) => text === candidate || text.includes(candidate));
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
    const text = getVisibleText(button);
    const marker = `${button.id || ''} ${button.className || ''} ${button.getAttribute?.('aria-label') || ''}`.toLowerCase();
    return /alle ablehnen|alles ablehnen|reject all|decline all/.test(`${text} ${marker}`) &&
      !/alle akzeptieren|accept all/.test(`${text} ${marker}`);
  });
};

const activateConsentButton = (button) => {
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
  if (!extensionState.enabled || !extensionState.autoRejectCookiesEnabled || isCloudflareCompatibilityPage()) {
    return;
  }

  const googleRejectButton = findGoogleConsentRejectButton();
  if (googleRejectButton) {
    debugLog('cookie-reject-click', { text: getVisibleText(googleRejectButton).slice(0, 80), provider: 'google' });
    activateConsentButton(googleRejectButton);
    return;
  }

  const containers = Array.from(document.querySelectorAll(COOKIE_BANNER_SELECTORS.join(',')))
    .filter((element) => isVisible(element) && isCookieContainer(element));

  for (const container of containers) {
    const rejectButton = findButtonByText(container, COOKIE_REJECT_TEXT);
    if (rejectButton) {
      debugLog('cookie-reject-click', { text: getVisibleText(rejectButton).slice(0, 80) });
      activateConsentButton(rejectButton);
      return;
    }

    const settingsButton = findButtonByText(container, COOKIE_SETTINGS_TEXT);
    if (settingsButton) {
      debugLog('cookie-settings-click', { text: getVisibleText(settingsButton).slice(0, 80) });
      activateConsentButton(settingsButton);
      setTimeout(autoRejectCookieBanners, 500);
      return;
    }
  }
};

const observeCookieBanners = () => {
  if (isCloudflareCompatibilityPage()) {
    return;
  }
  if (cookieRejectObserver) {
    autoRejectCookieBanners();
    return;
  }

  autoRejectCookieBanners();

  const intervalId = setInterval(() => {
    cookieRejectScans += 1;
    autoRejectCookieBanners();
    if (cookieRejectScans >= COOKIE_REJECT_MAX_SCANS) {
      clearInterval(intervalId);
    }
  }, COOKIE_REJECT_SCAN_MS);

  cookieRejectObserver = new MutationObserver(() => autoRejectCookieBanners());
  cookieRejectObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'style', 'aria-label']
  });
};

const POPUP_TEXT_PATTERNS = [
  'verify you are not a bot',
  'not a bot',
  'disable adblock',
  'disable ad blocker',
  'turn off adblock',
  'allow notifications',
  'click allow',
  'looking for ads',
  'looking for ad',
  'attention',
  'please confirm',
  'confirm to continue',
  'confirm you are',
  'sponsored',
  'advertisement',
  'advert',
  'continue',
  'continue to',
  'close ad',
  'skip ad',
  'open ad',
  'download now',
  'update now',
  'kupferaktie',
  'meldet fund',
  'withdraw money',
  'payment has increased',
  '$35,000',
  'hurry up',
  'book now',
  'limited deals',
  'save on top',
  'tourist attraction'
];

const POPUP_SELECTOR_PATTERNS = [
  '[id*="popup" i]',
  '[class*="popup" i]',
  '[id*="modal" i]',
  '[class*="modal" i]',
  '[id*="overlay" i]',
  '[class*="overlay" i]',
  '[id*="interstitial" i]',
  '[class*="interstitial" i]',
  '[id*="adblock" i]',
  '[class*="adblock" i]',
  '[id*="float" i]',
  '[class*="float" i]',
  '[id*="sticky" i]',
  '[class*="sticky" i]'
];

const isPageOwnedElement = (element) => element.id !== 'poison-identity-overlay' && element.id !== 'poison-identity-banner' && !element.closest('#poison-identity-overlay, #poison-identity-banner');

const isAniWorldEmbedFrame = (element) => {
  if (!element || element.tagName !== 'IFRAME' || !/(^|\.)aniworld\.to$/i.test(window.location.hostname)) {
    return false;
  }
  const src = element.getAttribute('src') || element.src || '';
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('title') || ''}`.toLowerCase();
  const container = element.closest?.('#stream, .hosterSiteDirectNav, [id*="stream" i], [class*="stream" i], [id*="player" i], [class*="player" i], [class*="hoster" i]');
  return Boolean(container) || /aniworld\.to\/redirect\/|\/redirect\/\d+|voe|dood|filemoon|vidmoly|stream|player|embed/i.test(`${src} ${marker}`);
};

const isStaticPageLayoutElement = (element) => {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.position !== 'static' && style.position !== 'relative') {
    return false;
  }
  const rect = element.getBoundingClientRect();
  const marker = `${element.id || ''} ${element.className || ''}`.toLowerCase();
  const textLength = getVisibleText(element).length;
  const structuralTag = /^(MAIN|HEADER|FOOTER|NAV|ARTICLE)$/.test(element.tagName);
  const structuralMarker = /(^|\s|[-_])(app|root|page|site|layout|container|content|main|wrapper|footer|header|navigation)(\s|[-_]|$)/.test(marker);
  const popupMarker = /popup|modal|overlay|interstitial|adblock|float|sticky|sponsor|advert/.test(marker);
  return !popupMarker &&
    (structuralTag || structuralMarker) &&
    rect.width >= Math.min(520, window.innerWidth * 0.45) &&
    rect.height >= 120 &&
    textLength >= 40;
};

const isActualMediaSurface = (element) => {
  if (!element) {
    return false;
  }
  const tagName = element.tagName;
  const text = getVisibleText(element);
  const rect = typeof element.getBoundingClientRect === 'function'
    ? element.getBoundingClientRect()
    : { width: 0, height: 0 };
  if (tagName === 'VIDEO' || tagName === 'AUDIO') {
    return true;
  }
  if (tagName === 'IFRAME') {
    if (isAniWorldEmbedFrame(element)) {
      return true;
    }
    const src = element.getAttribute('src') || '';
    const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('title') || ''}`.toLowerCase();
    const largePlayerFrame = rect.width >= 520 && rect.height >= 280;
    const knownPlayerFrame = /voe|dood|filemoon|vidmoly|stream|player|video|embed/i.test(`${src} ${marker}`);
    return largePlayerFrame && knownPlayerFrame && !hasAdWidgetText(element) && !POPUP_TEXT_PATTERNS.some((pattern) => text.includes(pattern));
  }
  const marker = `${element.id || ''} ${element.className || ''}`.toLowerCase();
  return /(^|\b)(player|video|stream)(\b|[-_])/.test(marker) &&
    !hasAdWidgetText(element) &&
    !POPUP_TEXT_PATTERNS.some((pattern) => text.includes(pattern));
};

const looksLikePopup = (element) => {
  if (!isVisible(element)) {
    return false;
  }

  if (isKnownPopupAdElement(element)) {
    return true;
  }

  if (isActualMediaSurface(element)) {
    return false;
  }

  if (isStaticPageLayoutElement(element)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const zIndex = Number.parseInt(style.zIndex, 10) || 0;
  const fixedOrSticky = style.position === 'fixed' || style.position === 'sticky';
  const fixedOrAbsolute = fixedOrSticky || style.position === 'absolute';
  const centeredModal = fixedOrSticky && rect.width >= 250 && rect.height >= 120 && rect.left > 20 && rect.right < window.innerWidth - 20 && rect.top > 20;
  const centeredAdGate = fixedOrAbsolute && rect.width >= 200 && rect.height >= 80 && rect.left > 0 && rect.right < window.innerWidth && rect.top > 0 && rect.top < window.innerHeight * 0.85;
  const largeOverlay = rect.width >= window.innerWidth * 0.35 && rect.height >= window.innerHeight * 0.2;
  const cornerWidget = fixedOrSticky && rect.width >= 80 && rect.height >= 80 && (rect.right > window.innerWidth * 0.65 || rect.bottom > window.innerHeight * 0.65);
  const coversViewport = fixedOrSticky && rect.width >= window.innerWidth * 0.75 && rect.height >= window.innerHeight * 0.75;
  const text = getVisibleText(element);
  const marker = `${element.id || ''} ${element.className || ''} ${element.getAttribute('aria-label') || ''}`.toLowerCase();
  const hasAdFrame = Array.from(element.querySelectorAll('iframe[src], img[src], a[href]')).some((node) => {
    if (isKnownPopupAdElement(node)) {
      return true;
    }
    const url = node.getAttribute('src') || node.getAttribute('href') || '';
    const nodeText = `${url} ${node.getAttribute('alt') || ''}`.toLowerCase();
    return isAdOrTrackerUrl(url) || /ad|promo|sponsor|banner|click|campaign|gift|forex|trade|buy now|offer/i.test(nodeText);
  });
  const hasCloseButton = Boolean(element.querySelector('[aria-label*="close" i], [class*="close" i], [id*="close" i], button'));
  const hasPopupText = POPUP_TEXT_PATTERNS.some((pattern) => text.includes(pattern) || marker.includes(pattern.replace(/\s+/g, '')));
  const hasPopupMarker = /popup|modal|overlay|interstitial|adblock|float|sticky|sponsor|advert/i.test(marker);
  const isAdIframe = element.tagName === 'IFRAME' && isAdOrTrackerUrl(element.src || '');
  const iframeOverlay = element.tagName === 'IFRAME' &&
    rect.width >= 180 &&
    rect.width <= window.innerWidth * 0.8 &&
    rect.height >= 70 &&
    rect.height <= window.innerHeight * 0.65 &&
    !isActualMediaSurface(element);
  const adWidgetText = hasAdWidgetText(element);
  const adWidgetMarker = /ad|ads|advert|banner|promo|sponsor|float|sticky|popup|modal|widget/.test(marker);
  const positionedPopupSurface = fixedOrAbsolute || fixedOrSticky || centeredModal || centeredAdGate || cornerWidget || coversViewport;

  return fixedOrSticky && zIndex >= 100 && (
    isAdIframe ||
    iframeOverlay ||
    hasAdFrame ||
    hasPopupText ||
    (hasPopupMarker && (largeOverlay || cornerWidget || centeredModal || coversViewport || hasCloseButton))
  ) ||
    (centeredAdGate && hasPopupText && (hasCloseButton || largeOverlay || rect.width >= 300)) ||
    iframeOverlay ||
    (fixedOrAbsolute && (cornerWidget || centeredAdGate || largeOverlay || hasCloseButton) && (adWidgetText || hasAdFrame || hasPopupMarker || adWidgetMarker)) ||
    ((hasPopupText || adWidgetText) && positionedPopupSurface && rect.width >= 180 && rect.height >= 70 && (hasCloseButton || rect.width <= window.innerWidth * 0.75));
};

const removeAnnoyancePopups = () => {
  if (!extensionState.enabled || !extensionState.popupBlockingEnabled || isCloudflareCompatibilityPage() || isAntidotePage()) {
    return;
  }

  const candidates = new Set([
    ...document.querySelectorAll(POPUP_SELECTOR_PATTERNS.join(',')),
    ...document.querySelectorAll('#stream.hosterSiteDirectNav, .hosterSiteDirectNav'),
    ...document.querySelectorAll('[data-onopen], img.pic, img[src*=".cyou" i], img[src*="thatdisform" i], .mask[data-onopen], .mask'),
    ...document.querySelectorAll('body > div, body > section, body > aside, body > iframe, body iframe'),
    ...Array.from(document.querySelectorAll('div, section, aside, iframe, [role="dialog"], [aria-modal="true"]')).filter((element) => {
      if (!isVisible(element)) {
        return false;
      }
      if (isStaticPageLayoutElement(element)) {
        return false;
      }
      const text = getVisibleText(element);
      return POPUP_TEXT_PATTERNS.some((pattern) => text.includes(pattern)) || hasAdWidgetText(element);
    }).slice(0, 500),
    ...Array.from(document.querySelectorAll('div, section, aside, iframe')).filter((element) => {
      if (!isVisible(element)) {
        return false;
      }
      const style = window.getComputedStyle(element);
      return style.position === 'fixed' || style.position === 'sticky' || style.position === 'absolute';
    }).slice(0, 500)
  ]);

  for (const element of candidates) {
    if (!isPageOwnedElement(element)) {
      continue;
    }
    if (looksLikePopup(element)) {
      debugLog('popup-removed', {
        tag: element.tagName,
        id: element.id || '',
        className: String(element.className || '').slice(0, 80),
        text: getVisibleText(element).slice(0, 100)
      });
      element.remove();
      pageDetectedTargets += 1;
      updateOverlay();
    }
  }

  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
};

const observeAnnoyancePopups = () => {
  if (isCloudflareCompatibilityPage() || isAntidotePage()) {
    return;
  }
  if (popupBlockObserver) {
    removeAnnoyancePopups();
    return;
  }

  removeAnnoyancePopups();

  const intervalId = setInterval(() => {
    popupBlockScans += 1;
    removeAnnoyancePopups();
    if (POPUP_BLOCK_MAX_SCANS > 0 && popupBlockScans >= POPUP_BLOCK_MAX_SCANS) {
      clearInterval(intervalId);
    }
  }, POPUP_BLOCK_SCAN_MS);

  popupBlockObserver = new MutationObserver(() => removeAnnoyancePopups());
  popupBlockObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'style', 'src', 'href', 'aria-label']
  });
};

const init = async () => {
  try {
    debugLog('init-start', { href: window.location.href, readyState: document.readyState });
    refreshOverlayState();
    setupStorageListener();

    const state = await getExtensionState();
    extensionState = normalizeExtensionState({ ...extensionState, ...state });
    if (isTrustedPage()) {
      debugLog('trusted-site-bypass', { hostname: window.location.hostname });
      return;
    }
    debugLog('state-loaded', {
      enabled: extensionState.enabled,
      poisoningEnabled: extensionState.poisoningEnabled,
      popupBlockingEnabled: extensionState.popupBlockingEnabled,
      useRemoteFilters: extensionState.useRemoteFilters
    });
    installPagePrivacyHooks();
    observeCloudflareCompatibility();
    updateOverlay();
    updateBanner();
    syncPageState();
    loadCosmeticFilters();
    installClickRedirectShield();

    if (extensionState.poisoningEnabled && !isAntidotePage()) {
      poisonPage();
      observeAds();
      setInterval(poisonPage, POISON_RATE_MS);
    }

    if (extensionState.autoRejectCookiesEnabled && !isAntidotePage()) {
      observeCookieBanners();
    }

    if (extensionState.popupBlockingEnabled && !isAntidotePage()) {
      observeAnnoyancePopups();
    }
    debugLog('init-complete');
  } catch (error) {
    debugLog('init-error', { message: error.message, stack: error.stack });
  }
};

const getExtensionState = () => {
  return new Promise((resolve) => {
    browserAPI.runtime.sendMessage({ command: 'getState' }, (response) => {
      resolve(response || {});
    });
  });
};

init();
