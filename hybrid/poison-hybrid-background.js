(function () {
  'use strict';

  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  const SETTINGS_KEY = 'poisonHybridSettings';
  const DEBUG_KEY = 'poisonHybridDebugLogs';
  const UBO_WHITELIST_KEY = 'netWhitelist';
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
        popupBlockingEnabled: true,
        cloudflareCompatibilityEnabled: true,
        webrtcShieldEnabled: true,
        headerProtectionEnabled: true,
        autoRejectCookiesEnabled: true,
        autoCookieClearingEnabled: true,
        antidoteModeEnabled: false
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
    popupBlockingEnabled: true,
    cloudflareCompatibilityEnabled: true,
    webrtcShieldEnabled: true,
    headerProtectionEnabled: true,
    autoRejectCookiesEnabled: true,
    autoCookieClearingEnabled: false,
    debugEnabled: true,
    poisonRequests: 0,
    siteDataClears: 0,
    lastDataClear: '',
    trustedSites: [],
    antidoteModeEnabled: false,
    poisonPersona: null,
    fingerprintProfile: DEFAULT_FINGERPRINT_PROFILE
  };
  const MAX_LOGS = 120;

  const getStorage = (defaults) => new Promise((resolve) => {
    browserAPI.storage.local.get(defaults, (items) => resolve(items || defaults));
  });

  const setStorage = (items) => new Promise((resolve) => {
    browserAPI.storage.local.set(items, resolve);
  });

  const getSessionPersonaState = (settings = {}) => ({
    ...settings,
    poisonPersona: sessionPersona,
    personaOptions: Object.values(SESSION_PERSONAS).map(({ id, name, description }) => ({ id, name, description })),
    fingerprintProfile: {
      ...DEFAULT_FINGERPRINT_PROFILE,
      ...(sessionPersona.fingerprintProfile || {})
    }
  });

  const setSessionPersona = async (personaId) => {
    const nextPersona = SESSION_PERSONAS[personaId] || SESSION_PERSONAS.standard;
    sessionPersona = {
      ...nextPersona,
      fingerprintProfile: {
        ...DEFAULT_FINGERPRINT_PROFILE,
        ...(nextPersona.fingerprintProfile || {})
      }
    };
    await logDebug('settings', 'session-persona-set', { personaId: sessionPersona.id });
    return sessionPersona;
  };

  const resetSessionPersonaStorage = async () => {
    sessionPersona = { ...SESSION_PERSONAS.standard };
    const settings = await getSettings();
    settings.poisonPersona = sessionPersona;
    settings.fingerprintProfile = sessionPersona.fingerprintProfile;
    settings.antidoteModeEnabled = false;
    await setSettings(settings);
  };

  const getSettings = async () => {
    const stored = await getStorage({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
    const settings = { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
    settings.fingerprintProfile = {
      ...DEFAULT_FINGERPRINT_PROFILE,
      ...(settings.fingerprintProfile || {})
    };
    return settings;
  };

  const setSettings = async (settings) => {
    await setStorage({
      [SETTINGS_KEY]: {
        ...DEFAULT_SETTINGS,
        ...settings,
        fingerprintProfile: {
          ...DEFAULT_FINGERPRINT_PROFILE,
          ...(settings.fingerprintProfile || {})
        }
      }
    });
  };

  const logDebug = async (scope, event, data = {}) => {
    const settings = await getSettings();
    if (!settings.debugEnabled) {
      return;
    }
    const stored = await getStorage({ [DEBUG_KEY]: [] });
    const logs = stored[DEBUG_KEY] || [];
    logs.push({
      time: new Date().toISOString(),
      scope,
      event,
      data
    });
    await setStorage({ [DEBUG_KEY]: logs.slice(-MAX_LOGS) });
  };

  const normalizeHostname = (hostname) => String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\.+|\.+$/g, '');

  const getHostnameFromUrl = (urlString) => {
    try {
      return new URL(urlString).hostname;
    } catch (error) {
      return '';
    }
  };

  const addUboTrustedSite = async (hostname) => {
    const trustedSite = normalizeHostname(hostname);
    if (!trustedSite) {
      return { ok: false, error: 'missing-hostname' };
    }
    const stored = await getStorage({ [UBO_WHITELIST_KEY]: [], [SETTINGS_KEY]: DEFAULT_SETTINGS });
    const netWhitelist = Array.from(new Set([
      ...(Array.isArray(stored[UBO_WHITELIST_KEY]) ? stored[UBO_WHITELIST_KEY] : []),
      'chrome-extension-scheme',
      'moz-extension-scheme',
      trustedSite
    ].map((entry) => String(entry || '').trim()).filter(Boolean)));
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(stored[SETTINGS_KEY] || {})
    };
    settings.trustedSites = Array.from(new Set([
      ...(Array.isArray(settings.trustedSites) ? settings.trustedSites : []),
      trustedSite
    ]));

    await setStorage({
      [UBO_WHITELIST_KEY]: netWhitelist,
      [SETTINGS_KEY]: settings
    });
    try {
      const ubo = globalThis['µBlock'] || globalThis.uBlock;
      if (ubo?.whitelistFromArray && ubo?.saveWhitelist) {
        ubo.netWhitelist = ubo.whitelistFromArray(netWhitelist);
        ubo.netWhitelistModifyTime = Date.now();
        ubo.saveWhitelist();
      }
    } catch (error) {
      await logDebug('settings', 'ubo-live-trust-failed', { message: error.message });
    }
    await logDebug('settings', 'trusted-site-added', { hostname: trustedSite, backend: 'ubo-netWhitelist' });
    return {
      ok: true,
      trustedSites: settings.trustedSites,
      note: 'Reload the tab once so Poison Hybrid refreshes its in-memory trusted-site map.'
    };
  };

  const clearSiteData = async () => {
    if (!browserAPI.browsingData?.remove) {
      return;
    }
    await new Promise((resolve) => {
      browserAPI.browsingData.remove({ since: 0 }, {
        cookies: true,
        cache: true,
        localStorage: true,
        indexedDB: true,
        serviceWorkers: true
      }, resolve);
    });
    const settings = await getSettings();
    await setSettings({
      ...settings,
      siteDataClears: (settings.siteDataClears || 0) + 1,
      lastDataClear: new Date().toISOString()
    });
    await logDebug('scrub', 'clear-complete');
  };

  const setPrivacyValue = (setting, value) => {
    if (!setting?.set) {
      return;
    }
    try {
      setting.set({ value });
    } catch (error) {
      logDebug('privacy', 'set-failed', { message: error.message });
    }
  };

  const applyPrivacy = (settings) => {
    const privacy = browserAPI.privacy;
    if (!privacy) {
      return;
    }
    const active = settings.enabled;
    setPrivacyValue(privacy.network?.webRTCIPHandlingPolicy, active && settings.webrtcShieldEnabled ? 'disable_non_proxied_udp' : 'default');
    setPrivacyValue(privacy.websites?.hyperlinkAuditingEnabled, !(active && settings.headerProtectionEnabled));
    setPrivacyValue(privacy.websites?.thirdPartyCookiesAllowed, !(active && settings.headerProtectionEnabled));
  };

  const toggleSetting = async (key) => {
    const settings = await getSettings();
    settings[key] = !settings[key];
    await setSettings(settings);
    applyPrivacy(settings);
    if (key === 'autoCookieClearingEnabled' && settings.enabled && settings.poisoningEnabled && settings.autoCookieClearingEnabled) {
      clearSiteData();
    }
    await logDebug('settings', 'toggle', { key, value: settings[key] });
    return settings;
  };

  const handlePoisonRequest = async (message, sender) => {
    const settings = await getSettings();
    if (!settings.enabled || !settings.poisoningEnabled || !message.url) {
      return { ok: false };
    }
    browserAPI.tabs?.sendMessage?.(sender.tab?.id, { command: 'poisonHybridFetch', url: message.url }, () => void browserAPI.runtime.lastError);
    settings.poisonRequests = (settings.poisonRequests || 0) + 1;
    await setSettings(settings);
    await logDebug('poison', 'request', { url: message.url });
    return { ok: true };
  };

  browserAPI.runtime.onInstalled.addListener(async () => {
    const settings = await getSettings();
    await setSettings(settings);
    applyPrivacy(settings);
    await logDebug('background', 'installed');
  });

  browserAPI.runtime.onStartup?.addListener(async () => {
    const settings = await getSettings();
    await resetSessionPersonaStorage();
    applyPrivacy(settings);
  });

  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      if (message?.command === 'getState') {
        const settings = await getSettings();
        sendResponse({
          ...getSessionPersonaState(settings),
          blockedCount: 0,
          lastBlockedHost: settings.lastBlockedHost || 'none'
        });
        return;
      }
      if (message?.command === 'getDebugLogs') {
        const stored = await getStorage({ [DEBUG_KEY]: [] });
        sendResponse({ logs: stored[DEBUG_KEY] || [] });
        return;
      }
      if (message?.command === 'clearDebugLogs') {
        await setStorage({ [DEBUG_KEY]: [] });
        sendResponse({ ok: true });
        return;
      }
      if (message?.command === 'setSessionPersona') {
        const persona = await setSessionPersona(message.personaId || 'standard');
        const settings = await getSettings();
        Object.assign(settings, persona.settingOverrides || {});
        settings.fingerprintProfile = persona.fingerprintProfile;
        settings.poisonPersona = persona;
        await setSettings(settings);
        applyPrivacy(settings);
        if (settings.enabled && settings.poisoningEnabled && settings.autoCookieClearingEnabled) {
          clearSiteData();
        }
        sendResponse({ ok: true, poisonPersona: persona, fingerprintProfile: persona.fingerprintProfile });
        return;
      }
      if (message?.command === 'addTrustedSite') {
        const hostname = message.hostname || getHostnameFromUrl(message.url || sender.tab?.url || '');
        sendResponse(await addUboTrustedSite(hostname));
        return;
      }
      if (message?.command === 'debugLog') {
        await logDebug(message.scope || 'content', message.event || 'event', message.data || {});
        sendResponse({ ok: true });
        return;
      }
      if (message?.command === 'poisonHybridRequest') {
        sendResponse(await handlePoisonRequest(message, sender));
        return;
      }
      if (message?.command === 'refreshFilters') {
        sendResponse({ ok: true, note: 'Poison Hybrid handles filter updates in its dashboard' });
        return;
      }

      const toggles = {
        toggleEnabled: 'enabled',
        toggleSpoofing: 'spoofingEnabled',
        togglePoisoning: 'poisoningEnabled',
        toggleAutoRejectCookies: 'autoRejectCookiesEnabled',
        togglePopupBlocking: 'popupBlockingEnabled',
        toggleCloudflareCompatibility: 'cloudflareCompatibilityEnabled',
        toggleAutoCookieClearing: 'autoCookieClearingEnabled',
        toggleWebrtcShield: 'webrtcShieldEnabled',
        toggleHeaderProtection: 'headerProtectionEnabled',
        toggleAntidoteMode: 'antidoteModeEnabled',
        toggleRemoteFilters: 'enabled',
        toggleDebugMode: 'debugEnabled'
      };
      if (toggles[message?.command]) {
        sendResponse(await toggleSetting(toggles[message.command]));
        return;
      }
      sendResponse({ ok: false, error: 'unknown-command' });
    })();
    return true;
  });
})();
