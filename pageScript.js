(function () {
  'use strict';

  const EVENT_PREFIX = 'POISON_IDENTITY';
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
    'banner',
    '/collector/',
    '/pixel.gif',
    '/ad-redirect'
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
    'sewarsremeets.cfd'
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

  let extensionState = {
    enabled: true,
    spoofingEnabled: true,
    webrtcShieldEnabled: true,
    headerProtectionEnabled: true,
    popupBlockingEnabled: true,
    cloudflareCompatibilityActive: false,
    fingerprintProfile: DEFAULT_FINGERPRINT_PROFILE
  };

  try {
    const rawState = document.currentScript?.dataset?.poisonState;
    if (rawState) {
      extensionState = { ...extensionState, ...JSON.parse(rawState) };
    }
  } catch (error) {
    // Keep defaults if the content script cannot pass state.
  }

  const original = {
    canvasToDataURL: HTMLCanvasElement.prototype.toDataURL,
    canvasToBlob: HTMLCanvasElement.prototype.toBlob,
    getImageData: CanvasRenderingContext2D.prototype.getImageData,
    webglReadPixels: window.WebGLRenderingContext?.prototype.readPixels,
    webgl2ReadPixels: window.WebGL2RenderingContext?.prototype.readPixels,
    webglGetParameter: window.WebGLRenderingContext?.prototype.getParameter,
    webgl2GetParameter: window.WebGL2RenderingContext?.prototype.getParameter,
    rtcPeerConnection: window.RTCPeerConnection || window.webkitRTCPeerConnection,
    mediaEnumerateDevices: navigator.mediaDevices?.enumerateDevices,
    intlResolvedOptions: Intl.DateTimeFormat.prototype.resolvedOptions,
    dateGetTimezoneOffset: Date.prototype.getTimezoneOffset,
    screenGetters: ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'].reduce((getters, prop) => {
      getters[prop] = Object.getOwnPropertyDescriptor(Screen.prototype, prop)?.get;
      return getters;
    }, {}),
    navigatorPluginsGetter: Object.getOwnPropertyDescriptor(Navigator.prototype, 'plugins')?.get,
    navigatorMimeTypesGetter: Object.getOwnPropertyDescriptor(Navigator.prototype, 'mimeTypes')?.get,
    alert: window.alert,
    confirm: window.confirm,
    prompt: window.prompt,
    notificationRequestPermission: window.Notification?.requestPermission,
    eval: window.eval,
    functionConstructor: window.Function,
    setTimeout: window.setTimeout,
    setInterval: window.setInterval,
    fetch: window.fetch,
    xhrOpen: window.XMLHttpRequest?.prototype.open,
    xhrSend: window.XMLHttpRequest?.prototype.send,
    sendBeacon: navigator.sendBeacon,
    windowOpen: window.open,
    locationAssign: Location.prototype.assign,
    locationReplace: Location.prototype.replace,
    devicePixelRatio: Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')?.get,
    innerWidth: Object.getOwnPropertyDescriptor(window, 'innerWidth')?.get,
    innerHeight: Object.getOwnPropertyDescriptor(window, 'innerHeight')?.get,
    outerWidth: Object.getOwnPropertyDescriptor(window, 'outerWidth')?.get,
    outerHeight: Object.getOwnPropertyDescriptor(window, 'outerHeight')?.get,
    connectionGetter: Object.getOwnPropertyDescriptor(Navigator.prototype, 'connection')?.get,
    mozConnectionGetter: Object.getOwnPropertyDescriptor(Navigator.prototype, 'mozConnection')?.get,
    webkitConnectionGetter: Object.getOwnPropertyDescriptor(Navigator.prototype, 'webkitConnection')?.get,
    getBattery: navigator.getBattery,
    permissionsQuery: navigator.permissions?.query,
    credentialsGet: navigator.credentials?.get,
    storageEstimate: navigator.storage?.estimate
  };

  let lastTrustedClick = null;

  const notify = (type, detail = {}) => {
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}_${type}`, { detail }));
  };

  const getFingerprintProfile = () => {
    const profile = extensionState.fingerprintProfile && typeof extensionState.fingerprintProfile === 'object'
      ? extensionState.fingerprintProfile
      : {};
    return {
      ...DEFAULT_FINGERPRINT_PROFILE,
      ...profile,
      languages: Array.isArray(profile.languages) && profile.languages.length
        ? profile.languages
      : DEFAULT_FINGERPRINT_PROFILE.languages
    };
  };

  const markPoisonInstalled = () => {
    try {
      const profile = getFingerprintProfile();
      Object.defineProperty(window, '__POISON_IDENTITY_PAGE_SCRIPT__', {
        value: {
          installed: true,
          enabled: Boolean(extensionState.enabled),
          spoofingEnabled: Boolean(extensionState.spoofingEnabled),
          userAgent: profile.userAgent,
          platform: profile.platform,
          deviceMemory: profile.deviceMemory
        },
        configurable: true
      });
      notify('PAGE_SCRIPT_READY', window.__POISON_IDENTITY_PAGE_SCRIPT__);
    } catch (error) {
      // Keep hooks alive even if another script locks globals.
    }
  };

  const isTrackerLikeUrl = (urlString) => {
    try {
      const url = new URL(urlString, window.location.href);
      const haystack = `${url.hostname} ${url.pathname} ${url.search}`.toLowerCase();
      return COMMON_AD_PATTERNS.some((pattern) => haystack.includes(pattern));
    } catch (error) {
      return false;
    }
  };

  const isCollectorLikeUrl = (urlString) => {
    try {
      const url = new URL(urlString, window.location.href);
      if (url.searchParams.get('poison') === '1' || url.pathname === '/collector/fingerprint') {
        return false;
      }
      return /\/collector\/(?:fetch|ad-click|redirected|frame-redirect)|\/pixel\.gif|\/ad-redirect/i.test(`${url.pathname} ${url.search}`);
    } catch (error) {
      return false;
    }
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

  const normalizeNavigationUrl = (urlString) => {
    try {
      return new URL(urlString || '', window.location.href).href;
    } catch (error) {
      return '';
    }
  };

  const getVisibleText = (element) => (
    element?.textContent ||
    element?.value ||
    element?.getAttribute?.('aria-label') ||
    ''
  ).trim().toLowerCase();

  const isVisibleElement = (element) => {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return false;
    }
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };

  const rememberTrustedClickIntent = (event) => {
    if (!event.isTrusted) {
      return;
    }
    const target = event.target?.closest?.('a[href], area[href], button, [role="button"], [onclick], input[type="button"], input[type="submit"]');
    if (!target) {
      lastTrustedClick = {
        time: Date.now(),
        href: '',
        hostname: '',
        visible: false,
        explicitLink: false,
        text: ''
      };
      return;
    }

    const href = target.href || target.getAttribute?.('href') || '';
    let hostname = '';
    if (href) {
      try {
        hostname = new URL(href, window.location.href).hostname.toLowerCase();
      } catch (error) {
        hostname = '';
      }
    }

    lastTrustedClick = {
      time: Date.now(),
      href: normalizeNavigationUrl(href),
      hostname,
      visible: isVisibleElement(target),
      explicitLink: Boolean(href),
      text: getVisibleText(target).slice(0, 80)
    };
  };

  document.addEventListener('pointerdown', rememberTrustedClickIntent, true);
  document.addEventListener('click', rememberTrustedClickIntent, true);

  const hasFreshExplicitIntentForUrl = (urlString) => {
    if (!lastTrustedClick || Date.now() - lastTrustedClick.time > 1200 || !lastTrustedClick.visible) {
      return false;
    }
    if (!lastTrustedClick.explicitLink || !lastTrustedClick.href) {
      return false;
    }

    const targetUrl = normalizeNavigationUrl(urlString);
    if (!targetUrl) {
      return false;
    }
    if (targetUrl === lastTrustedClick.href) {
      return true;
    }

    try {
      const target = new URL(targetUrl);
      return lastTrustedClick.hostname && target.hostname.toLowerCase() === lastTrustedClick.hostname;
    } catch (error) {
      return false;
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
        isTrackerLikeUrl(url.toString());
    } catch (error) {
      return false;
    }
  };

  const isKnownBadNavigationUrl = (urlString) => {
    try {
      const url = new URL(urlString, window.location.href);
      const tld = url.hostname.toLowerCase().split('.').pop();
      return SUSPICIOUS_REDIRECT_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ||
        SUSPICIOUS_REDIRECT_TLDS.includes(tld);
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

  const shouldBlockNavigationUrl = (urlString, { allowSameSite = true } = {}) => {
    if (!extensionState.enabled || !extensionState.popupBlockingEnabled || !urlString) {
      return false;
    }

    const sameSite = isSameSiteUrl(urlString);
    if (allowSameSite && sameSite && !isSuspiciousNavigationUrl(urlString)) {
      return false;
    }

    if (isKnownBadNavigationUrl(urlString)) {
      return true;
    }
    if (!sameSite && !navigator.userActivation?.isActive) {
      return true;
    }
    return sameSite ? isSuspiciousNavigationUrl(urlString) : false;
  };

  const shouldBlockPopupOpen = (urlString) => {
    if (!extensionState.enabled || !extensionState.popupBlockingEnabled) {
      return false;
    }

    const rawUrl = String(urlString || '').trim();
    if (!rawUrl || rawUrl === 'about:blank') {
      return true;
    }

    if (shouldBlockNavigationUrl(rawUrl, { allowSameSite: true }) || isTrackerLikeUrl(rawUrl)) {
      return true;
    }

    if (!isSameSiteUrl(rawUrl) && !hasFreshExplicitIntentForUrl(rawUrl)) {
      return true;
    }

    return false;
  };

  const shouldBlockScriptRedirect = (urlString) => {
    if (!extensionState.enabled || !extensionState.popupBlockingEnabled) {
      return false;
    }
    return isKnownBadNavigationUrl(urlString) ||
      isTrackerLikeUrl(urlString) ||
      (isSameSiteUrl(urlString) && isSuspiciousNavigationUrl(urlString));
  };

  const notifyFingerprintProbe = (surface) => {
    if (!extensionState.enabled) {
      return;
    }
    notify('FINGERPRINT_PROBE', { surface });
  };

  const addCanvasNoise = (canvas) => {
    if (!extensionState.enabled || !extensionState.spoofingEnabled) {
      return;
    }
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx || !canvas.width || !canvas.height) {
        return;
      }
      const x = Math.min(canvas.width - 1, Math.abs(location.hostname.length) % canvas.width);
      const y = Math.min(canvas.height - 1, Math.abs(location.pathname.length) % canvas.height);
      const pixel = ctx.getImageData(x, y, 1, 1);
      pixel.data[0] ^= 1;
      pixel.data[1] ^= 1;
      ctx.putImageData(pixel, x, y);
    } catch (error) {
      // Tainted canvases and blocked contexts are expected on some pages.
    }
  };

  const installNavigatorSpoofing = () => {
    const profile = getFingerprintProfile();
    const navigatorProfile = {
      userAgent: profile.userAgent,
      platform: profile.platform,
      language: profile.language,
      languages: profile.languages,
      hardwareConcurrency: profile.hardwareConcurrency,
      deviceMemory: profile.deviceMemory,
      webdriver: profile.webdriver,
      maxTouchPoints: profile.maxTouchPoints,
      vendor: profile.vendor,
      doNotTrack: profile.doNotTrack,
      globalPrivacyControl: profile.globalPrivacyControl,
      cookieEnabled: profile.cookieEnabled
    };

    const override = (target, prop, value) => {
      try {
        Object.defineProperty(target, prop, {
          get() {
            return Array.isArray(value) ? value.slice() : value;
          },
          configurable: true
        });
      } catch (error) {
        // Some browser properties are intentionally locked.
      }
    };

    const targets = [Navigator.prototype, navigator].filter(Boolean);
    for (const target of targets) {
      Object.entries(navigatorProfile).forEach(([prop, value]) => override(target, prop, value));
    }

    overrideScreenProperties();
    overrideTimezone();
    overridePlugins();
    overrideMediaDevices();
    overrideWindowMetrics();
    overrideNetworkConnection();
    overrideBattery();
    overridePermissions();
    overrideCredentials();
    overrideStorageEstimate();
  };

  const overrideScreenProperties = () => {
    const profile = getFingerprintProfile();
    const screenProfile = {
      width: profile.screenWidth || 1920,
      height: profile.screenHeight || 1080,
      availWidth: profile.availWidth || profile.screenWidth || 1920,
      availHeight: profile.availHeight || 1040,
      colorDepth: profile.colorDepth || 24,
      pixelDepth: profile.pixelDepth || profile.colorDepth || 24
    };

    Object.entries(screenProfile).forEach(([prop, value]) => {
      try {
        Object.defineProperty(Screen.prototype, prop, {
          get() {
            if (extensionState.enabled && extensionState.spoofingEnabled) {
              return value;
            }
            return original.screenGetters[prop] ? original.screenGetters[prop].call(this) : value;
          },
          configurable: true
        });
      } catch (error) {
        // Some browsers lock screen fields.
      }
    });
  };

  const overrideTimezone = () => {
    const timezone = getFingerprintProfile().timezone || 'UTC';
    const offset = Number.isFinite(getFingerprintProfile().timezoneOffset)
      ? getFingerprintProfile().timezoneOffset
      : 0;
    try {
      Intl.DateTimeFormat.prototype.resolvedOptions = function (...args) {
        const options = original.intlResolvedOptions.apply(this, args);
        if (extensionState.enabled && extensionState.spoofingEnabled) {
          return { ...options, timeZone: timezone };
        }
        return options;
      };
    } catch (error) {
      // Keep native Intl behavior if locked.
    }

    try {
      Date.prototype.getTimezoneOffset = function (...args) {
        if (extensionState.enabled && extensionState.spoofingEnabled) {
          return offset;
        }
        return original.dateGetTimezoneOffset.apply(this, args);
      };
    } catch (error) {
      // Keep native Date behavior if locked.
    }
  };

  const overridePlugins = () => {
    const emptyPluginArray = Object.freeze([]);
    const getters = {
      plugins: original.navigatorPluginsGetter,
      mimeTypes: original.navigatorMimeTypesGetter
    };

    for (const prop of ['plugins', 'mimeTypes']) {
      try {
        Object.defineProperty(Navigator.prototype, prop, {
          get() {
            if (extensionState.enabled && extensionState.spoofingEnabled) {
              return emptyPluginArray;
            }
            return getters[prop] ? getters[prop].call(this) : emptyPluginArray;
          },
          configurable: true
        });
      } catch (error) {
        // Some browsers lock plugin fields.
      }
    }
  };

  const overrideMediaDevices = () => {
    if (!navigator.mediaDevices || !original.mediaEnumerateDevices) {
      return;
    }

    try {
      navigator.mediaDevices.enumerateDevices = function (...args) {
        return original.mediaEnumerateDevices.apply(this, args).then((devices) => {
          if (!extensionState.enabled || !extensionState.spoofingEnabled) {
            return devices;
          }
          return devices.map((device) => ({
            deviceId: '',
            groupId: '',
            kind: device.kind,
            label: ''
          }));
        });
      };
    } catch (error) {
      // Keep native media behavior if locked.
    }
  };

  const overrideWindowMetrics = () => {
    const profile = getFingerprintProfile();
    const metrics = {
      devicePixelRatio: profile.devicePixelRatio || 1,
      innerWidth: profile.innerWidth || profile.screenWidth || 1920,
      innerHeight: profile.innerHeight || 940,
      outerWidth: profile.outerWidth || profile.screenWidth || 1920,
      outerHeight: profile.outerHeight || profile.screenHeight || 1080
    };

    Object.entries(metrics).forEach(([prop, value]) => {
      try {
        Object.defineProperty(window, prop, {
          get() {
            if (extensionState.enabled && extensionState.spoofingEnabled) {
              return value;
            }
            const getter = original[prop];
            return getter ? getter.call(window) : value;
          },
          configurable: true
        });
      } catch (error) {
        // Window metrics may be locked in some browsers.
      }
    });
  };

  const fakeConnection = Object.freeze({
    downlink: 10,
    downlinkMax: 10,
    effectiveType: '4g',
    rtt: 50,
    saveData: false,
    type: 'wifi',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; }
  });

  const overrideNetworkConnection = () => {
    const props = {
      connection: original.connectionGetter,
      mozConnection: original.mozConnectionGetter,
      webkitConnection: original.webkitConnectionGetter
    };
    for (const [prop, getter] of Object.entries(props)) {
      try {
        Object.defineProperty(Navigator.prototype, prop, {
          get() {
            if (extensionState.enabled && extensionState.spoofingEnabled) {
              return fakeConnection;
            }
            return getter ? getter.call(this) : undefined;
          },
          configurable: true
        });
      } catch (error) {
        // Some browsers do not expose network information.
      }
    }
  };

  const overrideBattery = () => {
    if (!original.getBattery) {
      return;
    }
    try {
      navigator.getBattery = function (...args) {
        if (!extensionState.enabled || !extensionState.spoofingEnabled) {
          return original.getBattery.apply(this, args);
        }
        return Promise.resolve(Object.freeze({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1,
          onchargingchange: null,
          onchargingtimechange: null,
          ondischargingtimechange: null,
          onlevelchange: null,
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return false; }
        }));
      };
    } catch (error) {
      // Battery API may be absent or locked.
    }
  };

  const overridePermissions = () => {
    if (!navigator.permissions || !original.permissionsQuery) {
      return;
    }
    try {
      navigator.permissions.query = function (permissionDescriptor, ...args) {
        if (!extensionState.enabled || !extensionState.spoofingEnabled) {
          return original.permissionsQuery.call(this, permissionDescriptor, ...args);
        }
        const name = String(permissionDescriptor?.name || '');
        const state = /notifications|push|camera|microphone|geolocation|midi|clipboard|persistent-storage/i.test(name)
          ? 'prompt'
          : 'granted';
        return Promise.resolve(Object.freeze({
          name,
          state,
          onchange: null,
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return false; }
        }));
      };
    } catch (error) {
      // Keep native permission behavior if locked.
    }
  };

  const overrideCredentials = () => {
    if (!navigator.credentials || !original.credentialsGet) {
      return;
    }
    try {
      navigator.credentials.get = function (options, ...args) {
        if (!extensionState.enabled || !extensionState.spoofingEnabled) {
          return original.credentialsGet.call(this, options, ...args);
        }
        return Promise.resolve(null);
      };
    } catch (error) {
      // Keep native credentials behavior if locked.
    }
  };

  const overrideStorageEstimate = () => {
    if (!navigator.storage || !original.storageEstimate) {
      return;
    }
    try {
      navigator.storage.estimate = function (...args) {
        if (!extensionState.enabled || !extensionState.spoofingEnabled) {
          return original.storageEstimate.apply(this, args);
        }
        return Promise.resolve({
          quota: 120000000000,
          usage: 12000000,
          usageDetails: {
            indexedDB: 4000000,
            caches: 2000000,
            serviceWorkerRegistrations: 0
          }
        });
      };
    } catch (error) {
      // Keep native storage behavior if locked.
    }
  };

  const installCanvasHooks = () => {
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      notifyFingerprintProbe('canvas.toDataURL');
      addCanvasNoise(this);
      return original.canvasToDataURL.apply(this, args);
    };

    if (original.canvasToBlob) {
      HTMLCanvasElement.prototype.toBlob = function (...args) {
        notifyFingerprintProbe('canvas.toBlob');
        addCanvasNoise(this);
        return original.canvasToBlob.apply(this, args);
      };
    }

    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      notifyFingerprintProbe('canvas.getImageData');
      const imageData = original.getImageData.apply(this, args);
      if (extensionState.enabled && extensionState.spoofingEnabled) {
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] ^= 1;
          imageData.data[i + 1] ^= 1;
        }
      }
      return imageData;
    };
  };

  const installWebGLHooks = (contextName, readPixels, getParameter) => {
    const context = window[contextName];
    if (!context) {
      return;
    }

    if (readPixels) {
      context.prototype.readPixels = function (...args) {
        notifyFingerprintProbe(`${contextName}.readPixels`);
        const result = readPixels.apply(this, args);
        const pixels = args[6];
        if (extensionState.enabled && extensionState.spoofingEnabled && pixels && pixels.length) {
          for (let i = 0; i < Math.min(pixels.length, 64); i += 4) {
            pixels[i] ^= 1;
          }
        }
        return result;
      };
    }

    if (getParameter) {
      context.prototype.getParameter = function (parameter) {
        notifyFingerprintProbe(`${contextName}.getParameter`);
        if (extensionState.enabled && extensionState.spoofingEnabled) {
          const profile = getFingerprintProfile();
          if (parameter === 37445) {
            return profile.webglVendor;
          }
          if (parameter === 37446) {
            return profile.webglRenderer;
          }
        }
        return getParameter.apply(this, arguments);
      };
    }
  };

  const installNavigationHooks = () => {
    window.open = function (url, ...args) {
      if (shouldBlockPopupOpen(url || '')) {
        notify('NAVIGATION_BLOCKED', { url: url ? String(url) : 'window.open' });
        return null;
      }
      return original.windowOpen.call(this, url, ...args);
    };

  Location.prototype.assign = function (url) {
      if (shouldBlockScriptRedirect(url)) {
        notify('NAVIGATION_BLOCKED', { url: String(url) });
        return;
      }
      return original.locationAssign.call(this, url);
    };

  Location.prototype.replace = function (url) {
      if (shouldBlockScriptRedirect(url)) {
        notify('NAVIGATION_BLOCKED', { url: String(url) });
        return;
      }
      return original.locationReplace.call(this, url);
    };
  };

  const installNetworkHooks = () => {
    if (original.fetch) {
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input?.url;
        if (extensionState.enabled && extensionState.popupBlockingEnabled && isCollectorLikeUrl(url)) {
          notify('NAVIGATION_BLOCKED', { url: String(url || 'fetch') });
          return Promise.resolve(new Response('', { status: 204, statusText: 'Blocked by Poison Identity' }));
        }
        return original.fetch.apply(this, arguments);
      };
    }

    if (original.sendBeacon) {
      navigator.sendBeacon = function (url, data) {
        if (extensionState.enabled && extensionState.popupBlockingEnabled && isCollectorLikeUrl(url)) {
          notify('NAVIGATION_BLOCKED', { url: String(url || 'sendBeacon') });
          return true;
        }
        return original.sendBeacon.call(this, url, data);
      };
    }

    if (original.xhrOpen && original.xhrSend && window.XMLHttpRequest) {
      XMLHttpRequest.prototype.open = function (method, url, ...args) {
        this.__poisonBlockedUrl = extensionState.enabled && extensionState.popupBlockingEnabled && isCollectorLikeUrl(url)
          ? String(url)
          : '';
        return original.xhrOpen.call(this, method, url, ...args);
      };
      XMLHttpRequest.prototype.send = function (...args) {
        if (this.__poisonBlockedUrl) {
          notify('NAVIGATION_BLOCKED', { url: this.__poisonBlockedUrl });
          return undefined;
        }
        return original.xhrSend.apply(this, args);
      };
    }

    const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (imageSrc?.set && imageSrc?.get) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        get() {
          return imageSrc.get.call(this);
        },
        set(value) {
          if (extensionState.enabled && extensionState.popupBlockingEnabled && isCollectorLikeUrl(value)) {
            notify('NAVIGATION_BLOCKED', { url: String(value || 'image') });
            return;
          }
          imageSrc.set.call(this, value);
        },
        configurable: true
      });
    }
  };

  const isSuspiciousDialogText = (message) => {
    const text = String(message || '').toLowerCase();
    return [
      'verify you are not a bot',
      'not a bot',
      'disable adblock',
      'disable ad blocker',
      'turn off adblock',
      'allow notifications',
      'click allow',
      'suspicious traffic',
      'continue to site',
      'please wait',
      'checking your browser',
      'download is ready',
      'looking for ads',
      'looking for ad',
      'attention',
      'please confirm',
      'confirm to continue',
      'confirm you are',
      'press ok',
      'click ok'
    ].some((needle) => text.includes(needle));
  };

  const shouldBlockPopupSurface = () => (
    extensionState.enabled &&
    extensionState.popupBlockingEnabled
  );

  const installPopupDialogHooks = () => {
    window.alert = function (message) {
      if (shouldBlockPopupSurface(message)) {
        notify('NAVIGATION_BLOCKED', { url: 'dialog:alert' });
        return undefined;
      }
      return original.alert.apply(this, arguments);
    };

    window.confirm = function (message) {
      if (shouldBlockPopupSurface(message)) {
        notify('NAVIGATION_BLOCKED', { url: 'dialog:confirm' });
        return false;
      }
      return original.confirm.apply(this, arguments);
    };

    window.prompt = function (message, defaultValue) {
      if (shouldBlockPopupSurface(message)) {
        notify('NAVIGATION_BLOCKED', { url: 'dialog:prompt' });
        return null;
      }
      return original.prompt.call(this, message, defaultValue);
    };

    if (window.Notification && original.notificationRequestPermission) {
      window.Notification.requestPermission = function (callback) {
        if (extensionState.enabled && extensionState.popupBlockingEnabled) {
          notify('NAVIGATION_BLOCKED', { url: 'notification:requestPermission' });
          if (typeof callback === 'function') {
            callback('denied');
          }
          return Promise.resolve('denied');
        }
        return original.notificationRequestPermission.apply(this, arguments);
      };
    }
  };

  const stripDebuggerStatements = (source) => {
    if (extensionState.cloudflareCompatibilityActive) {
      return source;
    }
    if (typeof source !== 'string' || !source.includes('debugger')) {
      return source;
    }
    return source.replace(/\bdebugger\s*;?/g, '');
  };

  const installAntiDebuggerCompatibility = () => {
    try {
      window.eval = function (source) {
        return original.eval.call(this, stripDebuggerStatements(source));
      };
    } catch (error) {
      // Keep native eval if the browser locks it.
    }

    try {
      window.Function = function (...args) {
        const nextArgs = args.map((arg, index) => index === args.length - 1 ? stripDebuggerStatements(arg) : arg);
        return original.functionConstructor.apply(this, nextArgs);
      };
      window.Function.prototype = original.functionConstructor.prototype;
    } catch (error) {
      // Keep native Function if the browser locks it.
    }

    try {
      window.setTimeout = function (handler, timeout, ...args) {
        return original.setTimeout.call(this, typeof handler === 'string' ? stripDebuggerStatements(handler) : handler, timeout, ...args);
      };
      window.setInterval = function (handler, timeout, ...args) {
        return original.setInterval.call(this, typeof handler === 'string' ? stripDebuggerStatements(handler) : handler, timeout, ...args);
      };
    } catch (error) {
      // Keep native timers if wrapping fails.
    }
  };

  const shouldHideCandidate = (candidate) => {
    if (!extensionState.enabled || !extensionState.webrtcShieldEnabled || !candidate) {
      return false;
    }
    const text = typeof candidate === 'string' ? candidate : candidate.candidate || '';
    return /\b(host|srflx)\b/i.test(text) || /\b(?:10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(text);
  };

  const installWebRTCShield = () => {
    const NativePeerConnection = original.rtcPeerConnection;
    if (!NativePeerConnection) {
      return;
    }

    const ShieldedPeerConnection = function (config = {}, constraints) {
      const nextConfig = { ...(config || {}) };
      if (extensionState.enabled && extensionState.webrtcShieldEnabled) {
        nextConfig.iceTransportPolicy = 'relay';
      }

      const pc = new NativePeerConnection(nextConfig, constraints);
      const nativeAddEventListener = pc.addEventListener.bind(pc);

      pc.addEventListener = function (type, listener, options) {
        if (type !== 'icecandidate' || typeof listener !== 'function') {
          return nativeAddEventListener(type, listener, options);
        }

        return nativeAddEventListener(type, (event) => {
          if (shouldHideCandidate(event.candidate)) {
            notify('FINGERPRINT_PROBE', { surface: 'webrtc.icecandidate' });
            return;
          }
          listener.call(this, event);
        }, options);
      };

      try {
        Object.defineProperty(pc, 'onicecandidate', {
          set(listener) {
            nativeAddEventListener('icecandidate', (event) => {
              if (shouldHideCandidate(event.candidate)) {
                notify('FINGERPRINT_PROBE', { surface: 'webrtc.icecandidate' });
                return;
              }
              if (typeof listener === 'function') {
                listener.call(pc, event);
              }
            });
          },
          configurable: true
        });
      } catch (error) {
        // Some browser objects reject property wrapping.
      }

      return pc;
    };

    ShieldedPeerConnection.prototype = NativePeerConnection.prototype;
    Object.defineProperty(ShieldedPeerConnection, 'name', { value: 'RTCPeerConnection' });
    window.RTCPeerConnection = ShieldedPeerConnection;
    if (window.webkitRTCPeerConnection) {
      window.webkitRTCPeerConnection = ShieldedPeerConnection;
    }
  };

  window.addEventListener(`${EVENT_PREFIX}_STATE`, (event) => {
    extensionState = { ...extensionState, ...(event.detail || {}) };
    markPoisonInstalled();
    installNavigatorSpoofing();
  });

  markPoisonInstalled();
  installNavigatorSpoofing();
  installCanvasHooks();
  installWebGLHooks('WebGLRenderingContext', original.webglReadPixels, original.webglGetParameter);
  installWebGLHooks('WebGL2RenderingContext', original.webgl2ReadPixels, original.webgl2GetParameter);
  installWebRTCShield();
  installNavigationHooks();
  installNetworkHooks();
  installPopupDialogHooks();
  installAntiDebuggerCompatibility();
})();
