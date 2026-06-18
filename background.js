const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const ADTIDY_FILTER_URLS = Array.from({ length: 23 }, (_, index) => `https://filters.adtidy.org/extension/ublock/filters/${index + 1}.txt`);
const UASSETS_FILTER_FILES = [
  'annoyances-cookies.txt',
  'annoyances-others.txt',
  'annoyances.txt',
  'badlists.txt',
  'badware.txt',
  'experimental.txt',
  'filters-2020.txt',
  'filters-2021.txt',
  'filters-2022.txt',
  'filters-2023.txt',
  'filters-2024.txt',
  'filters-2025.txt',
  'filters-2026.txt',
  'filters-general.txt',
  'filters-mobile.txt',
  'filters.txt',
  'lan-block.txt',
  'legacy.txt',
  'privacy-removeparam.txt',
  'privacy.txt',
  'quick-fixes.txt',
  'resource-abuse.txt',
  'ubo-link-shorteners.txt',
  'ubol-filters.txt',
  'unbreak.txt'
];
const UASSETS_FILTER_URLS = UASSETS_FILTER_FILES.map((file) => `https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/${file}`);
const EXTRA_FILTER_URLS = [
  'https://malware-filter.pages.dev/urlhaus-filter-ag-online.txt',
  'https://cdn.statically.io/gh/uBlockOrigin/uAssetsCDN/main/thirdparties/easyprivacy.txt',
  'https://cdn.jsdelivr.net/gh/uBlockOrigin/uAssetsCDN@main/thirdparties/easyprivacy.txt',
  'https://ublockorigin.github.io/uAssetsCDN/filters/unbreak.min.txt',
  'https://cdn.jsdelivr.net/gh/uBlockOrigin/uAssetsCDN@main/thirdparties/easylist.txt',
  'https://ublockorigin.pages.dev/filters/quick-fixes.min.txt',
  'https://ublockorigin.pages.dev/filters/privacy.min.txt',
  'https://ublockorigin.pages.dev/filters/badware.min.txt',
  'https://cdn.jsdelivr.net/gh/uBlockOrigin/uAssetsCDN@main/filters/filters.min.txt'
];
const FILTER_LIST_URLS = Array.from(new Set([...ADTIDY_FILTER_URLS, ...UASSETS_FILTER_URLS, ...EXTRA_FILTER_URLS]));
const CUSTOM_FILTER_INDEX_PATH = 'filters/index.json';
const FILTER_STORAGE_KEY = 'poisonFilterHosts';
const COSMETIC_STORAGE_KEY = 'poisonCosmeticSelectors';
const FILTER_META_KEY = 'poisonFilterMeta';
const DEBUG_LOG_KEY = 'poisonDebugLogs';
const TRUSTED_SITES_KEY = 'poisonTrustedSites';
const FILTER_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FILTER_FETCH_TIMEOUT_MS = 20000;
const DATA_SCRUB_ALARM = 'poisonIdentityDataScrub';
const DATA_SCRUB_INTERVAL_MINUTES = 5;
const MAX_COSMETIC_SELECTORS = 5000;
const MAX_DEBUG_LOGS = 120;
const DYNAMIC_FILTER_RULE_START_ID = 50000;
const DYNAMIC_FILTER_RULE_LIMIT = 4500;
const NAVIGATION_ALLOWANCE_TTL_MS = 7000;
const REMOTE_FILTER_BLOCK_TYPES = new Set([
  'xmlhttprequest',
  'ping',
  'beacon',
  'websocket',
  'webtransport',
  'other'
]);
const PLAYER_COMPAT_ALLOW_PATTERNS = [
  'securepubads.g.doubleclick.net/pagead/ima_ppub_config'
];
const POPUP_BLANK_TAB_TTL_MS = 3500;
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
  cookieEnabled: true,
  screenWidth: 1920,
  screenHeight: 1080,
  availWidth: 1920,
  availHeight: 1040,
  innerWidth: 1920,
  innerHeight: 940,
  outerWidth: 1920,
  outerHeight: 1080,
  colorDepth: 24,
  pixelDepth: 24,
  devicePixelRatio: 1,
  timezone: 'UTC',
  timezoneOffset: 0
};
const SESSION_PERSONAS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Low-noise Firefox-compatible profile for normal browsing.',
    interests: ['privacy', 'software', 'news'],
    poisonSources: ['direct', 'search', 'newsletter'],
    fingerprintProfile: {
      ...DEFAULT_FINGERPRINT_PROFILE,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0 Poisoned/1.0',
      vendor: '',
      webglVendor: 'Mozilla',
      webglRenderer: 'Firefox WebGL',
      timezone: 'Europe/Berlin',
      timezoneOffset: -60
    }
  },
  gamer: {
    id: 'gamer',
    name: 'Noise Gamer',
    description: 'Fake gaming and hardware interest trail with desktop-like signals.',
    interests: ['gaming', 'hardware', 'esports', 'streaming', 'mods'],
    poisonSources: ['twitch', 'youtube', 'steam', 'discord', 'reddit'],
    fingerprintProfile: {
      ...DEFAULT_FINGERPRINT_PROFILE,
      deviceMemory: 16,
      hardwareConcurrency: 12,
      screenWidth: 2560,
      screenHeight: 1440,
      availWidth: 2560,
      availHeight: 1400,
      innerWidth: 2560,
      innerHeight: 1320,
      outerWidth: 2560,
      outerHeight: 1440,
      devicePixelRatio: 1,
      webglVendor: 'Google Inc.',
      webglRenderer: 'ANGLE (Google, Vulkan 1.3.0)'
    }
  },
  finance: {
    id: 'finance',
    name: 'Finance Ghost',
    description: 'Fake finance and travel trail for tracker noise.',
    interests: ['finance', 'travel', 'insurance', 'credit', 'markets'],
    poisonSources: ['search', 'affiliate', 'newsletter', 'comparison'],
    fingerprintProfile: {
      ...DEFAULT_FINGERPRINT_PROFILE,
      platform: 'Win86',
      deviceMemory: -1,
      hardwareConcurrency: 8,
      screenWidth: 1366,
      screenHeight: 768,
      availWidth: 1366,
      availHeight: 728,
      innerWidth: 1366,
      innerHeight: 640,
      outerWidth: 1366,
      outerHeight: 768,
      devicePixelRatio: 1,
      timezone: 'America/New_York',
      timezoneOffset: 300,
      webglVendor: 'Google Inc.',
      webglRenderer: 'ANGLE (Google, Vulkan 1.3.0)'
    }
  },
  lockdown: {
    id: 'lockdown',
    name: 'Lockdown Scrub',
    description: 'Highest-security mode: enables blocking, spoofing, cookie rejection, remote filters, and whole-browser data scrub.',
    interests: ['privacy', 'security', 'encryption', 'threat-intel', 'burner-session'],
    poisonSources: ['direct', 'hardened-search', 'security-feed', 'temporary-profile'],
    settingOverrides: {
      enabled: true,
      spoofingEnabled: true,
      poisoningEnabled: true,
      webrtcShieldEnabled: true,
      headerProtectionEnabled: true,
      autoCookieClearingEnabled: true,
      autoRejectCookiesEnabled: true,
      popupBlockingEnabled: true,
      cloudflareCompatibilityEnabled: true,
      antidoteModeEnabled: false,
      useRemoteFilters: true
    },
    fingerprintProfile: {
      ...DEFAULT_FINGERPRINT_PROFILE,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0 Poisoned/1.0',
      platform: 'Win32',
      language: 'en-US',
      languages: ['en-US', 'en'],
      deviceMemory: 0,
      hardwareConcurrency: 4,
      screenWidth: 1600,
      screenHeight: 900,
      availWidth: 1600,
      availHeight: 860,
      innerWidth: 1600,
      innerHeight: 780,
      outerWidth: 1600,
      outerHeight: 900,
      devicePixelRatio: 1,
      vendor: '',
      webglVendor: 'Mozilla',
      webglRenderer: 'Firefox WebGL',
      timezone: 'UTC',
      timezoneOffset: 0
    }
  }
};
let sessionPersona = { ...SESSION_PERSONAS.standard };

const DEFAULT_SETTINGS = {
  enabled: true,
  spoofingEnabled: true,
  poisoningEnabled: true,
  webrtcShieldEnabled: true,
  headerProtectionEnabled: true,
  autoCookieClearingEnabled: false,
  autoRejectCookiesEnabled: true,
  popupBlockingEnabled: true,
  cloudflareCompatibilityEnabled: true,
  debugEnabled: true,
  blockedCount: 0,
  poisonRequests: 0,
  siteDataClears: 0,
  lastDataClear: '',
  lastBlockedHost: '',
  useRemoteFilters: false,
  trustedSites: [],
  antidoteModeEnabled: false,
  poisonPersona: null,
  fingerprintProfile: DEFAULT_FINGERPRINT_PROFILE,
  blockList: [
    "google-analytics.com",
    "googletagmanager.com",
    "googlesyndication.com",
    "googleadservices.com",
    "pagead2.googlesyndication.com",
    "googleads.g.doubleclick.net",
    "doubleclick.net",
    "adservice.google.com",
    "analytics.google.com",
    "stats.g.doubleclick.net",
    "facebook.com",
    "facebook.net",
    "connect.facebook.net",
    "graph.facebook.com",
    "pixel.facebook.com",
    "business.facebook.com",
    "instagram.com",
    "cdninstagram.com",
    "whatsapp.net",
    "ads.yahoo.com",
    "ads.twitter.com",
    "adroll.com",
    "quantserve.com",
    "rubiconproject.com",
    "taboola.com",
    "outbrain.com",
    "criteo.com",
    "scorecardresearch.com",
    "mathtag.com",
    "amazon-adsystem.com",
    "demdex.net",
    "everesttech.net",
    "sewarsremeets.cfd",
    "bladelikefreightwhat.com",
    "rostelshute.shop",
    "thatdisform.cyou"
  ]
};

let filterHosts = new Set();
let cosmeticSelectors = [];
let filterLoaded = false;
let currentSettings = { ...DEFAULT_SETTINGS };
let dynamicFilterSyncRunning = false;
const pendingPopupBlankTabs = new Map();
const navigationAllowances = new Map();
const tabNavigationAllowances = new Map();
const sourceNavigationAllowances = new Map();
const isManifestV3 = browserAPI.runtime.getManifest().manifest_version === 3;
const canUseDeclarativeNetRequest = isManifestV3 && Boolean(browserAPI.declarativeNetRequest);

function getSessionPersonaState(settings = {}) {
  return {
    ...settings,
    poisonPersona: sessionPersona,
    personaOptions: Object.values(SESSION_PERSONAS).map(({ id, name, description }) => ({ id, name, description })),
    fingerprintProfile: {
      ...DEFAULT_FINGERPRINT_PROFILE,
      ...(sessionPersona.fingerprintProfile || {})
    }
  };
}

function setSessionPersona(personaId) {
  const nextPersona = SESSION_PERSONAS[personaId] || SESSION_PERSONAS.standard;
  sessionPersona = {
    ...nextPersona,
    fingerprintProfile: {
      ...DEFAULT_FINGERPRINT_PROFILE,
      ...(nextPersona.fingerprintProfile || {})
    }
  };
  logDebug('settings', 'session-persona-set', { personaId: sessionPersona.id });
  const settingOverrides = sessionPersona.settingOverrides || {};
  browserAPI.storage.local.set({
    ...settingOverrides,
    poisonPersona: sessionPersona,
    fingerprintProfile: sessionPersona.fingerprintProfile
  });
  if (Object.prototype.hasOwnProperty.call(settingOverrides, 'autoCookieClearingEnabled')) {
    const nextSettings = { ...currentSettings, ...settingOverrides };
    syncDataScrubAlarm(nextSettings);
    clearSiteDataIfPoisonActive(nextSettings);
  }
  return sessionPersona;
}

function resetSessionPersonaStorage() {
  sessionPersona = { ...SESSION_PERSONAS.standard };
  browserAPI.storage.local.set({
    poisonPersona: sessionPersona,
    fingerprintProfile: sessionPersona.fingerprintProfile,
    antidoteModeEnabled: false
  });
}

browserAPI.runtime.onInstalled.addListener((details) => {
  const manifestVersion = browserAPI.runtime.getManifest().manifest_version;
  logDebug('background', 'installed', { manifestVersion, reason: details?.reason || '' });
  browserAPI.storage.local.get(DEFAULT_SETTINGS, (storedSettings) => {
    const nextSettings = details?.reason === 'install'
      ? { ...DEFAULT_SETTINGS, ...storedSettings }
      : { ...DEFAULT_SETTINGS, ...storedSettings };
    browserAPI.storage.local.set(nextSettings, () => {
      currentSettings = nextSettings;
      syncDeclarativeRuleset(nextSettings.enabled);
      applyBrowserPrivacySettings(nextSettings);
      syncDataScrubAlarm(nextSettings);
      clearSiteDataIfPoisonActive(nextSettings);
      initializeFilters();
      syncDynamicFilterRules();
    });
  });
});

browserAPI.runtime.onStartup.addListener(() => {
  logDebug('background', 'startup');
  resetSessionPersonaStorage();
  browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    if (!settings || typeof settings.enabled === 'undefined') {
      browserAPI.storage.local.set(DEFAULT_SETTINGS);
    }
  });
  initializeFilters();
  loadCurrentSettings();
});

initializeFilters();
loadCurrentSettings().then(() => logDebug('background', 'settings-loaded', summarizeSettings(currentSettings)));

browserAPI.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') {
    return;
  }
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key === FILTER_STORAGE_KEY && Array.isArray(newValue)) {
      filterHosts = new Set(newValue);
      filterLoaded = true;
    }
    if (key === COSMETIC_STORAGE_KEY && Array.isArray(newValue)) {
      cosmeticSelectors = newValue;
    }
    currentSettings[key] = newValue;
    if (key === 'useRemoteFilters') {
      initializeFilters();
      syncDynamicFilterRules();
    }
    if (key === 'enabled' || key === 'antidoteModeEnabled') {
      syncDeclarativeRuleset(Boolean(currentSettings.enabled));
      syncDynamicFilterRules();
    }
    if (key === 'enabled' || key === 'webrtcShieldEnabled' || key === 'headerProtectionEnabled') {
      applyBrowserPrivacySettings(currentSettings);
    }
    if (key === 'enabled' || key === 'poisoningEnabled' || key === 'autoCookieClearingEnabled') {
      syncDataScrubAlarm(currentSettings);
      clearSiteDataIfPoisonActive(currentSettings);
    }
  }
});

if (browserAPI.alarms?.onAlarm) {
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== DATA_SCRUB_ALARM) {
      return;
    }
    getStorage(DEFAULT_SETTINGS).then((settings) => clearSiteDataIfPoisonActive(settings));
  });
}

if (browserAPI.tabs?.onCreated) {
  browserAPI.tabs.onCreated.addListener((tab) => {
    if (!currentSettings.enabled || !currentSettings.popupBlockingEnabled) {
      return;
    }
    const initialUrl = tab.url || tab.pendingUrl || '';
    const isBlankPopup = initialUrl === 'about:blank' || !initialUrl;
    if (typeof tab.openerTabId === 'number') {
      if (isBlankPopup) {
        pendingPopupBlankTabs.set(tab.id, { createdAt: Date.now(), openerTabId: tab.openerTabId });
        setTimeout(() => closeStalePopupBlankTab(tab.id), POPUP_BLANK_TAB_TTL_MS);
        logDebug('tabs', 'opener-blank-popup-watch', {
          tabId: tab.id,
          openerTabId: tab.openerTabId
        });
        return;
      }
      if (isSuspiciousNavigationUrl(initialUrl) || isRemoteBlockedHost(initialUrl)) {
        browserAPI.tabs.remove(tab.id);
        logDebug('tabs', 'opener-suspicious-tab-closed', {
          tabId: tab.id,
          openerTabId: tab.openerTabId,
          url: initialUrl
        });
        return;
      }
      allowTabNavigation(tab.id, initialUrl);
      logDebug('tabs', 'opener-tab-allowed', {
        tabId: tab.id,
        openerTabId: tab.openerTabId,
        url: initialUrl
      });
      return;
    }
    if (isBlankPopup) {
      pendingPopupBlankTabs.set(tab.id, { createdAt: Date.now(), openerTabId: null });
      setTimeout(() => closeStalePopupBlankTab(tab.id), POPUP_BLANK_TAB_TTL_MS);
      logDebug('tabs', 'blank-created-watch', { tabId: tab.id, openerTabId: tab.openerTabId });
    }
  });
}

if (browserAPI.tabs?.onUpdated) {
  browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const currentUrl = changeInfo.url || tab?.url || tab?.pendingUrl || '';
    const pendingBlank = pendingPopupBlankTabs.get(tabId);
    if (pendingBlank && currentSettings.enabled && currentSettings.popupBlockingEnabled && currentUrl && pendingBlank.openerTabId !== null && !consumeNavigationAllowance('', currentUrl, tabId)) {
      browserAPI.tabs.remove(tabId);
      pendingPopupBlankTabs.delete(tabId);
      logDebug('tabs', 'blank-opener-popup-navigation-closed', { tabId, url: currentUrl });
      return;
    }

    if (pendingBlank && currentSettings.enabled && currentSettings.popupBlockingEnabled && currentUrl && isSuspiciousCrossSiteNavigationUrl(currentUrl)) {
      browserAPI.tabs.remove(tabId);
      pendingPopupBlankTabs.delete(tabId);
      logDebug('tabs', 'known-bad-redirect-tab-closed', { tabId, url: currentUrl });
      return;
    }

    if (!pendingPopupBlankTabs.has(tabId)) {
      return;
    }

    const nextUrl = currentUrl;
    if (!nextUrl || nextUrl === 'about:blank') {
      return;
    }

    if (isSuspiciousNavigationUrl(nextUrl)) {
      browserAPI.tabs.remove(tabId);
      pendingPopupBlankTabs.delete(tabId);
      logDebug('tabs', 'suspicious-popup-tab-closed', { tabId, url: nextUrl });
      return;
    }

    pendingPopupBlankTabs.delete(tabId);
    logDebug('tabs', 'blank-tab-allowed-navigation', { tabId, url: nextUrl });
  });
}

function closeStalePopupBlankTab(tabId) {
  if (!pendingPopupBlankTabs.has(tabId) || !browserAPI.tabs?.get || !browserAPI.tabs?.remove) {
    return;
  }

  browserAPI.tabs.get(tabId, (tab) => {
    if (browserAPI.runtime.lastError || !tab) {
      pendingPopupBlankTabs.delete(tabId);
      return;
    }
    if (tab.url === 'about:blank' || tab.pendingUrl === 'about:blank' || !tab.url) {
      browserAPI.tabs.remove(tabId);
      logDebug('tabs', 'stale-blank-popup-closed', { tabId });
    }
    pendingPopupBlankTabs.delete(tabId);
  });
}

async function initializeFilters() {
  logDebug('filters', 'initialize-start');
  const stored = await getStorage({ [FILTER_STORAGE_KEY]: null, [COSMETIC_STORAGE_KEY]: null, [FILTER_META_KEY]: 0, useRemoteFilters: false });
  
  if (stored.useRemoteFilters && Array.isArray(stored[FILTER_STORAGE_KEY]) && stored[FILTER_STORAGE_KEY].length > 0) {
    filterHosts = new Set(stored[FILTER_STORAGE_KEY]);
    filterLoaded = true;
    logDebug('filters', 'loaded-from-storage', { hosts: filterHosts.size });
  }
  if (stored.useRemoteFilters && Array.isArray(stored[COSMETIC_STORAGE_KEY])) {
    cosmeticSelectors = stored[COSMETIC_STORAGE_KEY];
    logDebug('filters', 'cosmetic-loaded-from-storage', { selectors: cosmeticSelectors.length });
  }

  const lastUpdated = stored[FILTER_META_KEY] || 0;
  const now = Date.now();
  if (stored.useRemoteFilters && (!filterLoaded || now - lastUpdated > FILTER_UPDATE_INTERVAL_MS)) {
    await updateFilterLists();
  } else {
    logDebug('filters', 'remote-disabled-or-fresh', { useRemoteFilters: stored.useRemoteFilters, filterLoaded });
  }
}

function loadCurrentSettings() {
  return getStorage(DEFAULT_SETTINGS).then((settings) => {
    currentSettings = { ...DEFAULT_SETTINGS, ...settings };
    syncDeclarativeRuleset(currentSettings.enabled);
    applyBrowserPrivacySettings(currentSettings);
    syncDataScrubAlarm(currentSettings);
    clearSiteDataIfPoisonActive(currentSettings);
    syncDynamicFilterRules();
  });
}

function isDataScrubActive(settings) {
  return Boolean(settings.enabled && settings.poisoningEnabled && settings.autoCookieClearingEnabled);
}

function syncDataScrubAlarm(settings) {
  if (!browserAPI.alarms) {
    return;
  }

  if (isDataScrubActive(settings)) {
    browserAPI.alarms.create(DATA_SCRUB_ALARM, {
      periodInMinutes: DATA_SCRUB_INTERVAL_MINUTES
    });
    return;
  }

  browserAPI.alarms.clear(DATA_SCRUB_ALARM);
}

function clearSiteDataIfPoisonActive(settings) {
  if (!isDataScrubActive(settings)) {
    logDebug('scrub', 'skip', { enabled: settings.enabled, poisoningEnabled: settings.poisoningEnabled, autoCookieClearingEnabled: settings.autoCookieClearingEnabled });
    return;
  }
  logDebug('scrub', 'clear-start');
  clearSiteData();
}

function clearSiteData() {
  const dataToRemove = {
    cookies: true,
    cache: true,
    localStorage: true,
    indexedDB: true,
    serviceWorkers: true
  };

  const recordClear = () => {
    logDebug('scrub', 'clear-complete');
    browserAPI.storage.local.get({ siteDataClears: 0 }, (data) => {
      browserAPI.storage.local.set({
        siteDataClears: (data.siteDataClears || 0) + 1,
        lastDataClear: new Date().toISOString()
      });
    });
  };

  if (browserAPI.browsingData?.remove) {
    try {
      const result = browserAPI.browsingData.remove({ since: 0 }, dataToRemove, recordClear);
      if (result && typeof result.then === 'function') {
        result.then(recordClear).catch((error) => {
          console.warn('Failed to clear browsing data:', error);
        });
      }
      return;
    } catch (error) {
      try {
        const result = browserAPI.browsingData.remove({ since: 0 }, dataToRemove);
        if (result && typeof result.then === 'function') {
          result.then(recordClear).catch((promiseError) => {
            console.warn('Failed to clear browsing data:', promiseError);
          });
          return;
        }
        recordClear();
        return;
      } catch (fallbackError) {
        console.warn('Failed to clear browsing data:', fallbackError);
      }
    }
  }

  clearCookiesFallback().then(recordClear);
}

async function clearCookiesFallback() {
  if (!browserAPI.cookies?.getAll || !browserAPI.cookies?.remove) {
    return;
  }

  const cookies = await new Promise((resolve) => {
    browserAPI.cookies.getAll({}, (items) => resolve(items || []));
  });

  await Promise.all(cookies.map((cookie) => {
    const protocol = cookie.secure ? 'https:' : 'http:';
    const host = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    const url = `${protocol}//${host}${cookie.path}`;
    return new Promise((resolve) => {
      browserAPI.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId }, () => resolve());
    });
  }));
}

function setPrivacyValue(setting, value) {
  if (!setting || typeof setting.set !== 'function') {
    return;
  }
  try {
    setting.set({ value });
  } catch (error) {
    console.warn('Failed to apply privacy setting:', error);
  }
}

function applyBrowserPrivacySettings(settings) {
  const privacy = browserAPI.privacy;
  if (!privacy) {
    return;
  }

  const active = Boolean(settings.enabled);
  const webrtcActive = active && Boolean(settings.webrtcShieldEnabled);
  const headerActive = active && Boolean(settings.headerProtectionEnabled);

  setPrivacyValue(privacy.network?.webRTCIPHandlingPolicy, webrtcActive ? 'disable_non_proxied_udp' : 'default');
  setPrivacyValue(privacy.websites?.hyperlinkAuditingEnabled, !headerActive);
  setPrivacyValue(privacy.websites?.thirdPartyCookiesAllowed, !headerActive);
}

async function updateFilterLists() {
  try {
    logDebug('filters', 'update-start', {
      lists: FILTER_LIST_URLS.length,
      adtidy: ADTIDY_FILTER_URLS.length,
      uassets: UASSETS_FILTER_URLS.length,
      extra: EXTRA_FILTER_URLS.length
    });
    const hosts = new Set();
    const cosmetic = new Map();
    for (const url of FILTER_LIST_URLS) {
      const response = await fetchWithTimeout(url, FILTER_FETCH_TIMEOUT_MS);
      if (!response.ok) {
        logDebug('filters', 'list-fetch-failed', { url, status: response.status });
        continue;
      }
      const text = await response.text();
      if (!text.trim()) {
        logDebug('filters', 'list-empty', { url });
        continue;
      }
      parseFilterText(text, hosts, cosmetic);
    }
    const customFilterTexts = await loadCustomFilterTexts();
    for (const { name, text } of customFilterTexts) {
      parseFilterText(text, hosts, cosmetic);
      logDebug('filters', 'custom-loaded', { name });
    }
    if (hosts.size > 0) {
      filterHosts = hosts;
      cosmeticSelectors = Array.from(cosmetic.values()).slice(0, MAX_COSMETIC_SELECTORS);
      filterLoaded = true;
      const hostArray = Array.from(hosts);
      browserAPI.storage.local.set({
        [FILTER_STORAGE_KEY]: hostArray,
        [COSMETIC_STORAGE_KEY]: cosmeticSelectors,
        [FILTER_META_KEY]: Date.now()
      }, () => syncDynamicFilterRules());
      logDebug('filters', 'update-complete', { hosts: hostArray.length, cosmeticSelectors: cosmeticSelectors.length });
    } else {
      logDebug('filters', 'update-empty');
    }
  } catch (error) {
    logDebug('filters', 'update-error', { message: error.message });
    console.warn('Failed to update filter lists:', error);
  }
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  try {
    return await fetch(url, controller ? { signal: controller.signal } : undefined);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function loadCustomFilterTexts() {
  const results = [];
  try {
    const indexUrl = browserAPI.runtime.getURL(CUSTOM_FILTER_INDEX_PATH);
    const indexResponse = await fetch(indexUrl);
    if (!indexResponse.ok) {
      logDebug('filters', 'custom-index-missing', { status: indexResponse.status });
      return results;
    }

    const files = await indexResponse.json();
    if (!Array.isArray(files)) {
      logDebug('filters', 'custom-index-invalid');
      return results;
    }

    for (const file of files) {
      if (typeof file !== 'string' || file.includes('..') || !file.endsWith('.txt')) {
        continue;
      }
      const fileUrl = browserAPI.runtime.getURL(`filters/${file}`);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        logDebug('filters', 'custom-file-missing', { file, status: response.status });
        continue;
      }
      results.push({ name: file, text: await response.text() });
    }
  } catch (error) {
    logDebug('filters', 'custom-load-error', { message: error.message });
  }
  return results;
}

function parseFilterText(fileText, hostSet, cosmeticMap = new Map()) {
  const lines = fileText.split(/\r?\n/);
  for (let rawLine of lines) {
    rawLine = rawLine.trim();
    if (!rawLine || rawLine.startsWith('!') || rawLine.startsWith('@@') || rawLine.includes('#@#') || rawLine.startsWith('/') || rawLine.startsWith('[')) {
      continue;
    }

    if (rawLine.includes('##')) {
      parseCosmeticFilter(rawLine, cosmeticMap);
      continue;
    }

    if (rawLine.startsWith('||')) {
      const rule = rawLine.slice(2).split('$')[0].split('^')[0].split('/')[0].trim();
      if (isValidHostname(rule)) {
        hostSet.add(rule.toLowerCase());
      }
      continue;
    }

    if (rawLine.startsWith('|http://') || rawLine.startsWith('|https://') || rawLine.startsWith('http://') || rawLine.startsWith('https://')) {
      try {
        const url = rawLine.startsWith('|') ? rawLine.slice(1) : rawLine;
        const stripped = url.split('$')[0];
        const parsed = new URL(stripped);
        if (isValidHostname(parsed.hostname)) {
          hostSet.add(parsed.hostname.toLowerCase());
        }
      } catch (error) {
        continue;
      }
      continue;
    }

    if (rawLine.includes('^')) {
      const candidate = rawLine.split('^')[0].trim();
      if (isValidHostname(candidate)) {
        hostSet.add(candidate.toLowerCase());
      }
    }
  }
}

function parseCosmeticFilter(rawLine, cosmeticMap) {
  const [domainPart, selectorPart] = rawLine.split('##');
  if (!selectorPart || cosmeticMap.size >= MAX_COSMETIC_SELECTORS) {
    return;
  }

  const selector = selectorPart.trim();
  if (!isSafeCosmeticSelector(selector)) {
    return;
  }

  const domains = domainPart
    ? domainPart.split(',').map((domain) => domain.trim().replace(/^~/, '')).filter(isValidHostname)
    : [];

  if (domains.length === 0) {
    const key = `*|${selector}`;
    cosmeticMap.set(key, { domains: [], selector });
    return;
  }

  for (const domain of domains.slice(0, 10)) {
    const key = `${domain}|${selector}`;
    cosmeticMap.set(key, { domains: [domain.toLowerCase()], selector });
    if (cosmeticMap.size >= MAX_COSMETIC_SELECTORS) {
      return;
    }
  }
}

function isSafeCosmeticSelector(selector) {
  if (selector.length > 240 || selector.includes('{') || selector.includes('}') || selector.includes('@')) {
    return false;
  }

  return ![
    ':has-text',
    ':matches-css',
    ':matches-path',
    ':xpath',
    ':remove',
    ':style',
    ':watch-attr',
    ':-abp-',
    '#?#',
    '#$#'
  ].some((token) => selector.includes(token));
}

function isValidHostname(hostname) {
  return /^[a-z0-9._-]+$/.test(hostname) && hostname.includes('.');
}

function matchesFilterHosts(hostname) {
  let domain = hostname.toLowerCase();
  while (domain) {
    if (filterHosts.has(domain)) {
      return true;
    }
    const dotIndex = domain.indexOf('.');
    if (dotIndex === -1) {
      break;
    }
    domain = domain.slice(dotIndex + 1);
  }
  return false;
}

function isRemoteBlockedHost(urlString) {
  if (!currentSettings.useRemoteFilters || !filterLoaded) {
    return false;
  }
  try {
    return matchesFilterHosts(new URL(urlString).hostname);
  } catch (error) {
    return false;
  }
}

function normalizeHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\.+|\.+$/g, '');
}

function hostnameMatchesTrustedSites(hostname, trustedSites = []) {
  const normalized = normalizeHostname(hostname);
  return normalized && trustedSites.some((site) => {
    const trusted = normalizeHostname(site);
    return trusted && (normalized === trusted || normalized.endsWith(`.${trusted}`));
  });
}

function getHostnameFromUrl(urlString) {
  try {
    return new URL(urlString).hostname;
  } catch (error) {
    return '';
  }
}

function isTrackerUrl(url, blockList, requestType = 'other', sourceUrl = '', tabId = -1) {
  try {
    const parsed = new URL(url);
    if (hostnameMatchesTrustedSites(parsed.hostname, currentSettings.trustedSites)) {
      return false;
    }
    if (parsed.searchParams.get('poison') === '1') {
      return false;
    }
    if (PLAYER_COMPAT_ALLOW_PATTERNS.some((pattern) => url.includes(pattern))) {
      logDebug('request', 'player-compat-allowed', { url, type: requestType });
      return false;
    }
    const hostname = parsed.hostname;
    if (requestType === 'main_frame') {
      const sourceTriggered = Boolean(sourceUrl);
      const sameSite = sourceTriggered && isSameSiteUrl(url, sourceUrl);
      const remoteMatch = currentSettings.useRemoteFilters && filterLoaded && matchesFilterHosts(hostname);
      const suspicious = isSuspiciousNavigationUrl(url);
      if (sourceTriggered && !sameSite && currentSettings.popupBlockingEnabled && (suspicious || remoteMatch)) {
        if (consumeNavigationAllowance(sourceUrl, url, tabId)) {
          logDebug('request', 'main-frame-navigation-allowed', { url, sourceUrl, hostname });
          return false;
        }
        logDebug('request', 'main-frame-suspicious-cross-site-blocked', { url, sourceUrl, hostname, remoteMatch, suspicious });
        return true;
      }
      if (remoteMatch) {
        logDebug('request', 'remote-main-frame-allowed', { url, hostname });
      }
      return false;
    }
    const builtInMatch = blockList.some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`));
    if (builtInMatch) {
      return true;
    }
    if (sourceUrl && isSameSiteUrl(url, sourceUrl)) {
      if (currentSettings.useRemoteFilters && filterLoaded && matchesFilterHosts(hostname)) {
        logDebug('request', 'remote-first-party-allowed', { url, sourceUrl, hostname });
      }
      return false;
    }
    if (!REMOTE_FILTER_BLOCK_TYPES.has(requestType)) {
      if (currentSettings.useRemoteFilters && filterLoaded && matchesFilterHosts(hostname)) {
        logDebug('request', 'remote-asset-allowed', { url, type: requestType, hostname });
      }
      return false;
    }
    return currentSettings.useRemoteFilters && filterLoaded && matchesFilterHosts(hostname);
  } catch (error) {
    return false;
  }
}

function addTrustedSite(hostname) {
  const trustedSite = normalizeHostname(hostname);
  if (!trustedSite) {
    return Promise.resolve({ ok: false, error: 'missing-hostname' });
  }
  return getStorage({ [TRUSTED_SITES_KEY]: [], trustedSites: [] }).then((stored) => {
    const trustedSites = Array.from(new Set([
      ...(Array.isArray(stored[TRUSTED_SITES_KEY]) ? stored[TRUSTED_SITES_KEY] : []),
      ...(Array.isArray(stored.trustedSites) ? stored.trustedSites : []),
      trustedSite
    ].map(normalizeHostname).filter(Boolean)));
    currentSettings.trustedSites = trustedSites;
    return new Promise((resolve) => {
      browserAPI.storage.local.set({
        [TRUSTED_SITES_KEY]: trustedSites,
        trustedSites
      }, () => {
        logDebug('settings', 'trusted-site-added', { hostname: trustedSite });
        resolve({ ok: true, trustedSites });
      });
    });
  });
}

function getNavigationAllowanceKey(sourceUrl, targetUrl) {
  try {
    const source = new URL(sourceUrl);
    const target = new URL(targetUrl);
    return `${getBaseDomain(source.hostname)}>${getBaseDomain(target.hostname)}`;
  } catch (error) {
    return '';
  }
}

function pruneNavigationAllowances() {
  const now = Date.now();
  for (const [key, expiresAt] of navigationAllowances.entries()) {
    if (expiresAt <= now) {
      navigationAllowances.delete(key);
    }
  }
  for (const [tabId, allowance] of tabNavigationAllowances.entries()) {
    if (!allowance || allowance.expiresAt <= now) {
      tabNavigationAllowances.delete(tabId);
    }
  }
  for (const [sourceBaseDomain, allowance] of sourceNavigationAllowances.entries()) {
    if (!allowance || allowance.expiresAt <= now || allowance.remaining <= 0) {
      sourceNavigationAllowances.delete(sourceBaseDomain);
    }
  }
}

function allowNavigation(sourceUrl, targetUrl) {
  const key = getNavigationAllowanceKey(sourceUrl, targetUrl);
  if (!key) {
    return;
  }
  navigationAllowances.set(key, Date.now() + NAVIGATION_ALLOWANCE_TTL_MS);
  logDebug('navigation', 'allow-token-created', { sourceUrl, targetUrl });
}

function allowTabNavigation(tabId, targetUrl) {
  if (typeof tabId !== 'number' || !targetUrl) {
    return;
  }
  tabNavigationAllowances.set(tabId, {
    targetBaseDomain: getUrlBaseDomain(targetUrl),
    expiresAt: Date.now() + NAVIGATION_ALLOWANCE_TTL_MS
  });
}

function allowNextNavigationFromSource(sourceUrl, reason = '') {
  const sourceBaseDomain = getUrlBaseDomain(sourceUrl);
  if (!sourceBaseDomain) {
    return;
  }
  sourceNavigationAllowances.set(sourceBaseDomain, {
    expiresAt: Date.now() + NAVIGATION_ALLOWANCE_TTL_MS,
    remaining: 1,
    reason
  });
  logDebug('navigation', 'source-allow-token-created', { sourceUrl, reason });
}

function consumeNavigationAllowance(sourceUrl, targetUrl, tabId) {
  pruneNavigationAllowances();

  if (typeof tabId === 'number') {
    const tabAllowance = tabNavigationAllowances.get(tabId);
    if (tabAllowance && tabAllowance.targetBaseDomain && tabAllowance.targetBaseDomain === getUrlBaseDomain(targetUrl)) {
      tabNavigationAllowances.delete(tabId);
      return true;
    }
  }

  const key = getNavigationAllowanceKey(sourceUrl, targetUrl);
  if (key && navigationAllowances.has(key)) {
    navigationAllowances.delete(key);
    return true;
  }

  const sourceBaseDomain = getUrlBaseDomain(sourceUrl);
  const sourceAllowance = sourceNavigationAllowances.get(sourceBaseDomain);
  if (sourceAllowance && sourceAllowance.remaining > 0 && sourceAllowance.expiresAt > Date.now()) {
    sourceAllowance.remaining -= 1;
    if (sourceAllowance.remaining <= 0) {
      sourceNavigationAllowances.delete(sourceBaseDomain);
    }
    return true;
  }

  return false;
}

function isSuspiciousNavigationUrl(urlString) {
  try {
    const url = new URL(urlString);
    const haystack = `${url.hostname} ${url.pathname} ${url.search}`.toLowerCase();
    const tld = url.hostname.toLowerCase().split('.').pop();
    return SUSPICIOUS_REDIRECT_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ||
      SUSPICIOUS_REDIRECT_TLDS.includes(tld) ||
      SUSPICIOUS_NAV_PATTERNS.some((pattern) => haystack.includes(pattern));
  } catch (error) {
    return false;
  }
}

function isSuspiciousCrossSiteNavigationUrl(urlString) {
  if (isSuspiciousNavigationUrl(urlString)) {
    return true;
  }
  try {
    const url = new URL(urlString);
    const haystack = `${url.hostname} ${url.pathname} ${url.search}`.toLowerCase();
    return CROSS_SITE_LURE_PATTERNS.some((pattern) => haystack.includes(pattern));
  } catch (error) {
    return false;
  }
}

function getBaseDomain(hostname) {
  const parts = hostname.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) {
    return parts.join('.');
  }
  return parts.slice(-2).join('.');
}

function getUrlBaseDomain(urlString) {
  try {
    return getBaseDomain(new URL(urlString).hostname);
  } catch (error) {
    return '';
  }
}

function isSameSiteUrl(targetUrl, sourceUrl) {
  try {
    const target = new URL(targetUrl);
    const source = new URL(sourceUrl);
    return getBaseDomain(target.hostname) === getBaseDomain(source.hostname);
  } catch (error) {
    return false;
  }
}

function getRequestSourceUrl(details) {
  return details.initiator || details.documentUrl || details.originUrl || '';
}

if (!canUseDeclarativeNetRequest) {
  browserAPI.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (!currentSettings.enabled) {
        return { cancel: false };
      }

      if (isTrackerUrl(details.url, currentSettings.blockList, details.type, getRequestSourceUrl(details), details.tabId)) {
        const lastBlockedHost = new URL(details.url).hostname;
        logDebug('request', 'blocked', { url: details.url, type: details.type });
        browserAPI.storage.local.set({
          blockedCount: (currentSettings.blockedCount || 0) + 1,
          lastBlockedHost
        });
        return { cancel: true };
      }

      return { cancel: false };
    },
    { urls: ['<all_urls>'] },
    ['blocking']
  );

  browserAPI.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      if (details.type === 'main_frame') {
        return { requestHeaders: details.requestHeaders };
      }
      if (!currentSettings.enabled || !currentSettings.headerProtectionEnabled || !isTrackerUrl(details.url, currentSettings.blockList, details.type, getRequestSourceUrl(details), details.tabId)) {
        return { requestHeaders: details.requestHeaders };
      }

      const protectedHeaders = (details.requestHeaders || []).filter((header) => {
        const name = header.name.toLowerCase();
        return name !== 'cookie' && name !== 'referer' && name !== 'origin';
      });

      protectedHeaders.push({ name: 'DNT', value: '1' });
      protectedHeaders.push({ name: 'Sec-GPC', value: '1' });
      return { requestHeaders: protectedHeaders };
    },
    { urls: ['<all_urls>'] },
    ['blocking', 'requestHeaders']
  );
}

if (browserAPI.declarativeNetRequest?.onRuleMatchedDebug) {
  browserAPI.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const url = info.request?.url || '';
    let lastBlockedHost = '';
    try {
      lastBlockedHost = url ? new URL(url).hostname : '';
    } catch (error) {
      lastBlockedHost = '';
    }
    logDebug('dnr', 'rule-matched', {
      ruleId: info.rule?.ruleId,
      rulesetId: info.rule?.rulesetId,
      url
    });
    if (lastBlockedHost && info.rule?.rulesetId === 'built_in_trackers') {
      browserAPI.storage.local.get({ blockedCount: 0 }, (data) => {
        browserAPI.storage.local.set({
          blockedCount: (data.blockedCount || 0) + 1,
          lastBlockedHost
        });
      });
    }
  });
}

function syncDeclarativeRuleset(enabled) {
  if (!canUseDeclarativeNetRequest) {
    return;
  }

  const enabledRulesets = [];
  const disabledRulesets = [];
  const active = Boolean(enabled);
  if (active) {
    enabledRulesets.push('built_in_trackers');
  } else {
    disabledRulesets.push('built_in_trackers');
  }

  if (active && currentSettings.headerProtectionEnabled) {
    enabledRulesets.push('privacy_headers');
  } else {
    disabledRulesets.push('privacy_headers');
  }

  browserAPI.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabledRulesets,
    disableRulesetIds: disabledRulesets
  });
}

async function syncDynamicFilterRules() {
  if (!canUseDeclarativeNetRequest || !browserAPI.declarativeNetRequest?.getDynamicRules || dynamicFilterSyncRunning) {
    return;
  }

  dynamicFilterSyncRunning = true;
  try {
    const existingRules = await browserAPI.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules
      .map((rule) => rule.id)
      .filter((id) => id >= DYNAMIC_FILTER_RULE_START_ID && id < DYNAMIC_FILTER_RULE_START_ID + DYNAMIC_FILTER_RULE_LIMIT);

    const addRules = [];
    if (currentSettings.enabled && currentSettings.useRemoteFilters && filterLoaded && filterHosts.size > 0) {
      const hosts = Array.from(filterHosts)
        .filter(isValidHostname)
        .slice(0, DYNAMIC_FILTER_RULE_LIMIT);

      for (let index = 0; index < hosts.length; index += 1) {
        addRules.push({
          id: DYNAMIC_FILTER_RULE_START_ID + index,
          priority: 2,
          action: { type: 'block' },
          condition: {
            urlFilter: `||${hosts[index]}^`,
            resourceTypes: ['xmlhttprequest', 'ping', 'websocket', 'webtransport', 'other']
          }
        });
      }
    }

    await browserAPI.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
    logDebug('dnr', 'dynamic-filter-sync', { removed: removeRuleIds.length, added: addRules.length });
  } catch (error) {
    logDebug('dnr', 'dynamic-filter-sync-error', { message: error.message });
  } finally {
    dynamicFilterSyncRunning = false;
  }
}

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.command === 'getState') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      sendResponse(getSessionPersonaState(settings));
    });
    return true;
  }

  if (message?.command === 'toggleEnabled') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.enabled;
      browserAPI.storage.local.set({ enabled: newState }, () => {
        syncDeclarativeRuleset(newState);
        sendResponse({ enabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'toggleSpoofing') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.spoofingEnabled;
      browserAPI.storage.local.set({ spoofingEnabled: newState }, () => {
        sendResponse({ spoofingEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'togglePoisoning') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.poisoningEnabled;
      browserAPI.storage.local.set({ poisoningEnabled: newState }, () => {
        sendResponse({ poisoningEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'debugLog') {
    logDebug(message.scope || 'content', message.event || 'event', message.data || {});
    sendResponse({ ok: true });
    return true;
  }

  if (message?.command === 'getDebugLogs') {
    browserAPI.storage.local.get({ [DEBUG_LOG_KEY]: [] }, (data) => {
      sendResponse({ logs: data[DEBUG_LOG_KEY] || [] });
    });
    return true;
  }

  if (message?.command === 'clearDebugLogs') {
    browserAPI.storage.local.set({ [DEBUG_LOG_KEY]: [] }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.command === 'setSessionPersona') {
    const persona = setSessionPersona(message.personaId || 'standard');
    sendResponse({ ok: true, poisonPersona: persona, fingerprintProfile: persona.fingerprintProfile });
    return true;
  }

  if (message?.command === 'toggleAntidoteMode') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.antidoteModeEnabled;
      browserAPI.storage.local.set({ antidoteModeEnabled: newState }, () => {
        logDebug('settings', 'antidote-toggle', { enabled: newState });
        sendResponse({ antidoteModeEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'addTrustedSite') {
    const hostname = message.hostname || getHostnameFromUrl(message.url || sender.tab?.url || '');
    addTrustedSite(hostname).then(sendResponse);
    return true;
  }

  if (message?.command === 'allowNavigation') {
    if (currentSettings.enabled && currentSettings.popupBlockingEnabled && message.sourceUrl && message.targetUrl) {
      allowNavigation(message.sourceUrl, message.targetUrl);
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.command === 'allowNextNavigation') {
    if (currentSettings.enabled && currentSettings.popupBlockingEnabled && message.sourceUrl) {
      allowNextNavigationFromSource(message.sourceUrl, message.reason || '');
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message?.command === 'openAllowedNavigation') {
    const sourceUrl = message.sourceUrl || sender.tab?.url || '';
    const targetUrl = message.targetUrl || '';
    if (!currentSettings.enabled || !currentSettings.popupBlockingEnabled || !sourceUrl || !targetUrl) {
      sendResponse({ ok: false, error: 'missing-navigation-context' });
      return true;
    }

    allowNavigation(sourceUrl, targetUrl);

    if (message.openInNewTab) {
      if (!browserAPI.tabs?.create) {
        sendResponse({ ok: false, error: 'tabs-create-unavailable' });
        return true;
      }
      browserAPI.tabs.create({
        url: targetUrl,
        active: message.active !== false
      }, (tab) => {
        if (browserAPI.runtime.lastError) {
          sendResponse({ ok: false, error: browserAPI.runtime.lastError.message });
          return;
        }
        if (tab?.id) {
          allowTabNavigation(tab.id, targetUrl);
        }
        logDebug('navigation', 'explicit-new-tab-opened', { sourceUrl, targetUrl, tabId: tab?.id });
        sendResponse({ ok: true, tabId: tab?.id || null });
      });
      return true;
    }

    if (!browserAPI.tabs?.update || typeof sender.tab?.id !== 'number') {
      sendResponse({ ok: false, error: 'tabs-update-unavailable' });
      return true;
    }
    browserAPI.tabs.update(sender.tab.id, { url: targetUrl }, () => {
      if (browserAPI.runtime.lastError) {
        sendResponse({ ok: false, error: browserAPI.runtime.lastError.message });
        return;
      }
      logDebug('navigation', 'explicit-tab-updated', { sourceUrl, targetUrl, tabId: sender.tab.id });
      sendResponse({ ok: true, tabId: sender.tab.id });
    });
    return true;
  }

  if (message?.command === 'toggleDebugMode') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.debugEnabled;
      browserAPI.storage.local.set({ debugEnabled: newState }, () => {
        logDebug('debug', 'toggle', { enabled: newState });
        sendResponse({ debugEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'toggleAutoCookieClearing') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.autoCookieClearingEnabled;
      const nextSettings = { ...settings, autoCookieClearingEnabled: newState };
      browserAPI.storage.local.set({ autoCookieClearingEnabled: newState }, () => {
        syncDataScrubAlarm(nextSettings);
        clearSiteDataIfPoisonActive(nextSettings);
        sendResponse({ autoCookieClearingEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'toggleAutoRejectCookies') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.autoRejectCookiesEnabled;
      browserAPI.storage.local.set({ autoRejectCookiesEnabled: newState }, () => {
        sendResponse({ autoRejectCookiesEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'togglePopupBlocking') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.popupBlockingEnabled;
      browserAPI.storage.local.set({ popupBlockingEnabled: newState }, () => {
        sendResponse({ popupBlockingEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'toggleCloudflareCompatibility') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.cloudflareCompatibilityEnabled;
      browserAPI.storage.local.set({ cloudflareCompatibilityEnabled: newState }, () => {
        sendResponse({ cloudflareCompatibilityEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'toggleWebrtcShield') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.webrtcShieldEnabled;
      browserAPI.storage.local.set({ webrtcShieldEnabled: newState }, () => {
        applyBrowserPrivacySettings({ ...settings, webrtcShieldEnabled: newState });
        sendResponse({ webrtcShieldEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'toggleHeaderProtection') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.headerProtectionEnabled;
      browserAPI.storage.local.set({ headerProtectionEnabled: newState }, () => {
        applyBrowserPrivacySettings({ ...settings, headerProtectionEnabled: newState });
        sendResponse({ headerProtectionEnabled: newState });
      });
    });
    return true;
  }

  if (message?.command === 'toggleRemoteFilters') {
    browserAPI.storage.local.get(DEFAULT_SETTINGS, (settings) => {
      const newState = !settings.useRemoteFilters;
      browserAPI.storage.local.set({ useRemoteFilters: newState }, async () => {
        currentSettings.useRemoteFilters = newState;
        if (newState) {
          await initializeFilters();
        }
        sendResponse({ useRemoteFilters: newState });
      });
    });
    return true;
  }

  if (message?.command === 'refreshFilters') {
    updateFilterLists().then(() => {
      sendResponse({ ok: true, hosts: filterHosts.size, cosmeticSelectors: cosmeticSelectors.length });
    });
    return true;
  }
});

function getStorage(defaults) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get(defaults, (items) => resolve(items));
  });
}

function summarizeSettings(settings) {
  return {
    enabled: settings.enabled,
    poisoningEnabled: settings.poisoningEnabled,
    popupBlockingEnabled: settings.popupBlockingEnabled,
    useRemoteFilters: settings.useRemoteFilters,
    autoCookieClearingEnabled: settings.autoCookieClearingEnabled
  };
}

function logDebug(scope, event, data = {}) {
  const entry = {
    time: new Date().toISOString(),
    scope,
    event,
    data
  };

  console.debug('[Poison Identity]', scope, event, data);

  if (currentSettings && currentSettings.debugEnabled === false) {
    return;
  }

  try {
    browserAPI.storage.local.get({ [DEBUG_LOG_KEY]: [] }, (items) => {
      const logs = Array.isArray(items[DEBUG_LOG_KEY]) ? items[DEBUG_LOG_KEY] : [];
      logs.push(entry);
      browserAPI.storage.local.set({ [DEBUG_LOG_KEY]: logs.slice(-MAX_DEBUG_LOGS) });
    });
  } catch (error) {
    console.warn('Failed to write debug log:', error);
  }
}
