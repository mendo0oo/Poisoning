const http = require('http');
const crypto = require('crypto');

const port = Number(process.env.PORT || 8787);
const events = [];
const maxEvents = 800;
const maxBodyLength = 12000;

const send = (res, status, body, headers = {}) => {
  const content = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, {
    'content-length': content.length,
    'cache-control': 'no-store',
    ...headers
  });
  res.end(content);
};

const readBody = req => new Promise(resolve => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').slice(0, maxBodyLength)));
});

const queryObject = url => {
  const query = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (query[key] === undefined) {
      query[key] = value;
    } else if (Array.isArray(query[key])) {
      query[key].push(value);
    } else {
      query[key] = [query[key], value];
    }
  }
  return query;
};

const trackedHeaders = headers => {
  const names = [
    'host',
    'referer',
    'origin',
    'user-agent',
    'accept',
    'accept-language',
    'accept-encoding',
    'content-type',
    'sec-fetch-site',
    'sec-fetch-mode',
    'sec-fetch-dest',
    'sec-fetch-user',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'dnt',
    'sec-gpc',
    'cookie',
    'upgrade-insecure-requests'
  ];
  const picked = {};
  for (const name of names) {
    if (headers[name] !== undefined) {
      picked[name] = name === 'cookie' ? `[present:${String(headers[name]).length}] ${headers[name]}` : headers[name];
    }
  }
  return picked;
};

const expectationFor = type => {
  if (
    type.startsWith('collector:') ||
    type === 'pixel' ||
    type === 'popup-ad' ||
    type === 'ad-frame' ||
    type === 'redirect' ||
    type === 'ad-script' ||
    type === 'cloudflare-script'
  ) {
    return 'should-be-blocked-or-neutralized';
  }
  if (type === 'download' || type === 'main-page' || type === 'lab-script' || type === 'events') {
    return 'should-be-allowed';
  }
  return 'observe';
};

const logEvent = (type, req, extra = {}) => {
  const parsed = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);
  const entry = {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    type,
    expected: expectationFor(type),
    method: req.method,
    url: req.url,
    path: parsed.pathname,
    query: queryObject(parsed),
    referer: req.headers.referer || '',
    origin: req.headers.origin || '',
    userAgent: req.headers['user-agent'] || '',
    network: {
      remoteAddress: req.socket.remoteAddress,
      remotePort: req.socket.remotePort,
      encrypted: Boolean(req.socket.encrypted),
      httpVersion: req.httpVersion
    },
    headers: trackedHeaders(req.headers),
    ...extra
  };
  events.push(entry);
  while (events.length > maxEvents) {
    events.shift();
  }
  console.log(`[${entry.time}] ${type} ${req.method} ${req.url}`);
  return entry;
};

const summarizeEvents = () => {
  const summary = {
    total: events.length,
    collectors: 0,
    allowedDownloads: 0,
    popupAttempts: 0,
    redirects: 0,
    fingerprints: 0,
    storage: 0,
    webRtc: 0,
    cloudflare: 0,
    poisonNoise: 0,
    byType: {}
  };
  for (const event of events) {
    summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
    if (event.type.startsWith('collector:')) summary.collectors += 1;
    if (event.type === 'download') summary.allowedDownloads += 1;
    if (event.type === 'popup-ad' || event.type === 'collector:popup-open') summary.popupAttempts += 1;
    if (event.type === 'redirect') summary.redirects += 1;
    if (event.type === 'collector:fingerprint') summary.fingerprints += 1;
    if (event.type === 'collector:storage') summary.storage += 1;
    if (event.type === 'collector:webrtc') summary.webRtc += 1;
    if (event.type === 'cloudflare-script' || event.type === 'collector:challenge') summary.cloudflare += 1;
    if (event.type.startsWith('collector:poison') || /poison=1/.test(event.url)) summary.poisonNoise += 1;
  }
  return summary;
};

const page = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Poison Identity Test Lab</title>
  <style>
    :root {
      --bg: #030303;
      --panel: #050505;
      --line: #1c1c1c;
      --line-hot: #303030;
      --text: #e8e8e8;
      --muted: #8b8b8b;
      --dim: #5b5b5b;
      --accent: #8d4dff;
      --ok: #18ff87;
      --warn: #ffcc4d;
      --bad: #ff3347;
      --blue: #66d9ff;
    }

    * { box-sizing: border-box; }
    html { min-height: 100%; background: var(--bg); }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(circle at 50% -20%, rgba(255,255,255,.08), transparent 34rem),
        linear-gradient(90deg, rgba(255,255,255,.025), transparent 16%, transparent 84%, rgba(255,255,255,.025)),
        var(--bg);
      font-family: "Lucida Console", Consolas, "Courier New", monospace;
      font-size: 12px;
      letter-spacing: 0;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: 9999;
      pointer-events: none;
      background: repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0, rgba(255,255,255,.035) 1px, transparent 1px, transparent 4px);
      mix-blend-mode: overlay;
      opacity: .42;
    }

    main {
      width: min(1280px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 42px;
    }

    .topbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      gap: 20px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 18px;
      margin-bottom: 18px;
    }

    .brand {
      display: grid;
      gap: 8px;
    }

    .title {
      margin: 0;
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .subtitle {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
      max-width: 760px;
    }

    .status {
      border: 1px solid var(--line);
      padding: 12px 14px;
      min-width: 180px;
      text-align: right;
    }

    .label {
      color: var(--muted);
      text-transform: uppercase;
      font-size: 10px;
      margin-bottom: 8px;
    }

    .net {
      color: var(--ok);
      font-weight: 700;
      text-transform: uppercase;
    }

    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr);
      gap: 18px;
      align-items: start;
    }

    .panel {
      background: rgba(0,0,0,.72);
      border: 1px solid var(--line);
      padding: 18px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.015);
    }

    .panel + .panel { margin-top: 18px; }

    .panel-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      color: var(--text);
      font-weight: 700;
      text-transform: uppercase;
    }

    .panel-title::before {
      content: "::";
      color: var(--muted);
      margin-right: 6px;
    }

    .pill {
      border: 1px solid var(--line-hot);
      color: var(--muted);
      padding: 5px 8px;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 400;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .metric {
      border: 1px solid var(--line);
      padding: 12px;
      min-height: 74px;
      background: #020202;
    }

    .metric span {
      display: block;
      color: var(--muted);
      text-transform: uppercase;
      font-size: 10px;
      margin-bottom: 9px;
    }

    .metric strong {
      display: block;
      font-size: 22px;
      color: white;
    }

    .matrix {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    button, .button {
      width: 100%;
      min-height: 46px;
      border: 1px solid var(--line-hot);
      background: #080808;
      color: var(--text);
      font: inherit;
      font-weight: 700;
      text-align: left;
      text-decoration: none;
      padding: 10px 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }

    button:hover, .button:hover {
      border-color: var(--accent);
      color: white;
      background: #101010;
    }

    button small, .button small {
      color: var(--muted);
      font-weight: 400;
      line-height: 1.35;
    }

    .danger { border-color: rgba(255,51,71,.45); }
    .allow { border-color: rgba(24,255,135,.35); }
    .observe { border-color: rgba(102,217,255,.35); }

    .terminal {
      border: 1px solid var(--line);
      background: #000;
      min-height: 400px;
      max-height: 620px;
      overflow: auto;
      padding: 0;
    }

    .log-row {
      display: grid;
      grid-template-columns: 86px minmax(150px, .5fr) minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      border-bottom: 1px solid #111;
      padding: 10px;
    }

    .log-row:hover { background: #070707; }
    .log-time { color: var(--dim); white-space: nowrap; }
    .log-type { color: var(--blue); overflow-wrap: anywhere; }
    .log-type.block { color: var(--bad); }
    .log-type.allow { color: var(--ok); }
    .log-detail { color: var(--muted); overflow-wrap: anywhere; line-height: 1.45; }
    .log-json {
      margin-top: 8px;
      color: #bdbdbd;
      white-space: pre-wrap;
      font-size: 11px;
      display: none;
    }
    .log-row.open .log-json { display: block; }

    .env-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 14px;
      color: var(--muted);
    }

    .env-grid strong {
      color: var(--text);
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    iframe {
      width: 100%;
      min-height: 280px;
      border: 1px solid var(--line-hot);
      background: #050505;
    }

    .expected {
      display: grid;
      gap: 9px;
      color: var(--muted);
      line-height: 1.5;
    }

    .expected b { color: var(--text); }
    .good { color: var(--ok); }
    .bad-text { color: var(--bad); }
    .warn-text { color: var(--warn); }

    .cookie-banner, .fake-modal {
      position: fixed;
      z-index: 2147483647;
      border: 1px solid var(--line-hot);
      background: #020202;
      color: var(--text);
      box-shadow: 0 18px 70px rgba(0,0,0,.75);
    }

    .cookie-banner {
      left: 24px;
      right: 24px;
      bottom: 24px;
      padding: 16px;
      display: none;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 10px;
      align-items: center;
    }

    .cookie-banner button {
      width: auto;
      min-height: 38px;
      min-width: 140px;
      text-align: center;
      align-items: center;
    }

    .fake-modal {
      width: min(420px, calc(100vw - 38px));
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      padding: 22px;
    }

    .fake-modal::before {
      content: "";
      position: fixed;
      inset: -100vh;
      z-index: -1;
      background: rgba(0,0,0,.62);
      backdrop-filter: blur(3px);
    }

    .hidden { display: none !important; }

    @media (max-width: 920px) {
      main { width: min(100vw - 20px, 1280px); padding-top: 16px; }
      .topbar, .grid { grid-template-columns: 1fr; }
      .status { text-align: left; }
      .metrics, .matrix { grid-template-columns: 1fr; }
      .log-row { grid-template-columns: 1fr; }
      .cookie-banner { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <header class="topbar">
      <div class="brand">
        <h1 class="title">Poison Identity Test Lab</h1>
        <p class="subtitle">Local hostile-site simulator for extension verification. Green outcomes mean legitimate browsing still works. Red outcomes mean collector, popup, redirect, or fingerprint traffic reached the lab.</p>
      </div>
      <div class="status">
        <div class="label">NET_STATUS</div>
        <div class="net" id="netStatus">LAB_ONLINE</div>
      </div>
    </header>

    <section class="panel">
      <div class="panel-title">Telemetry Counters <span class="pill">live poll</span></div>
      <div class="metrics">
        <div class="metric"><span>Total events</span><strong id="mTotal">0</strong></div>
        <div class="metric"><span>Collectors hit</span><strong id="mCollectors">0</strong></div>
        <div class="metric"><span>Redirects hit</span><strong id="mRedirects">0</strong></div>
        <div class="metric"><span>Downloads allowed</span><strong id="mDownloads">0</strong></div>
        <div class="metric"><span>Fingerprints</span><strong id="mFingerprints">0</strong></div>
        <div class="metric"><span>WebRTC reports</span><strong id="mWebRtc">0</strong></div>
        <div class="metric"><span>Storage writes</span><strong id="mStorage">0</strong></div>
        <div class="metric"><span>Poison noise</span><strong id="mPoison">0</strong></div>
      </div>
    </section>

    <div class="grid">
      <div>
        <section class="panel">
          <div class="panel-title">Protection Test Matrix <span class="pill">manual + run all</span></div>
          <div class="matrix">
            <button class="observe" id="runAll">RUN_FULL_TEST_SWEEP<small>Triggers every safe local probe in sequence.</small></button>
            <button id="fingerprint">FINGERPRINT_PROBE<small>Navigator, screen, canvas, WebGL, timezone, plugins, media devices.</small></button>
            <button id="trackerFetch">TRACKER_FETCH<small>GET collector call with keepalive.</small></button>
            <button id="trackerXhr">TRACKER_XHR<small>Classic XMLHttpRequest collector call.</small></button>
            <button id="beacon">SEND_BEACON<small>Beacon API event used by analytics.</small></button>
            <button id="pixel">TRACKER_PIXEL<small>1x1 image request to pixel endpoint.</small></button>
            <button id="popup">WINDOW_OPEN_POPUP<small>Unsolicited popup tab/window simulation.</small></button>
            <button id="redirect">SCRIPT_REDIRECT_TRAP<small>location.assign to ad redirector.</small></button>
            <a class="button allow" href="/download/final-file.zip" target="_blank" rel="noopener">LEGIT_DOWNLOAD_LINK<small>Should keep working in a new tab/download flow.</small></a>
            <a class="button danger" href="/ad-redirect?to=/collector/ad-click" target="_blank" rel="noopener">TARGET_BLANK_AD_LINK<small>Should be blocked or neutralized.</small></a>
            <button id="cookieBanner">COOKIE_CONSENT_BANNER<small>Shows reject/accept banner for auto-reject testing.</small></button>
            <button id="storage">STORAGE_IDENTIFIER_WRITE<small>Writes cookie, localStorage, sessionStorage, IndexedDB probe.</small></button>
            <button id="webrtc">WEBRTC_CANDIDATE_PROBE<small>Collects ICE candidates visible to page JS.</small></button>
            <button id="cloudflare">CLOUDFLARE_STYLE_CHALLENGE<small>Loads /cdn-cgi/challenge-platform/ script path.</small></button>
            <button id="fakeModal">FAKE_DIALOG_OVERLAY<small>Injects Attention / Please confirm popup markup.</small></button>
            <button id="clearPage">CLEAR_PAGE_TRAPS<small>Removes lab-created banners and overlays.</small></button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-title">Embedded Hostile Frame <span class="pill">ad iframe</span></div>
          <iframe src="/ad-frame" title="hostile ad frame"></iframe>
        </section>

        <section class="panel">
          <div class="panel-title">Expected Outcomes</div>
          <div class="expected">
            <div><b class="good">Allowed:</b> main lab page, event log API, visible legitimate download link.</div>
            <div><b class="bad-text">Blocked or neutralized:</b> collector fetch/XHR/beacon, tracker pixel, popup window, target-blank ad link, ad iframe dialog, scripted redirects.</div>
            <div><b class="warn-text">Compatibility:</b> Cloudflare-style scripts should trigger Poison backoff, not bypass real Cloudflare checks.</div>
            <div><b>Interpretation:</b> if a blocked test appears in the collector log, that exact path still reached the local server.</div>
          </div>
        </section>
      </div>

      <div>
        <section class="panel">
          <div class="panel-title">Browser Surface Snapshot <span class="pill">page view</span></div>
          <div class="env-grid" id="envGrid"></div>
        </section>

        <section class="panel">
          <div class="panel-title">System Logs <span class="pill"><button id="clear" style="width:auto;min-height:28px;padding:5px 8px;">CLEAR</button></span></div>
          <div class="terminal" id="log"></div>
        </section>
      </div>
    </div>
  </main>

  <div class="cookie-banner" id="cookieBannerBox">
    <div>
      <strong>Cookie control test</strong><br>
      <span class="subtitle">This banner exists only to verify auto-reject logic. Reject should be clicked automatically if the module is active.</span>
    </div>
    <button id="rejectCookies">Reject all</button>
    <button id="acceptCookies">Accept all</button>
  </div>

  <script src="/tracker.js"></script>
  <script>
    const log = document.getElementById('log');
    const netStatus = document.getElementById('netStatus');
    const setText = (id, value) => { document.getElementById(id).textContent = String(value); };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const jsonPost = (url, body) => fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
      keepalive: true
    }).catch(() => {});

    async function refresh() {
      try {
        const [data, summary] = await Promise.all([
          fetch('/events').then(r => r.json()),
          fetch('/events/summary').then(r => r.json())
        ]);
        netStatus.textContent = 'LAB_ONLINE';
        setText('mTotal', summary.total);
        setText('mCollectors', summary.collectors);
        setText('mRedirects', summary.redirects);
        setText('mDownloads', summary.allowedDownloads);
        setText('mFingerprints', summary.fingerprints);
        setText('mWebRtc', summary.webRtc);
        setText('mStorage', summary.storage);
        setText('mPoison', summary.poisonNoise);
        renderLog(data);
      } catch (err) {
        netStatus.textContent = 'LAB_OFFLINE';
      }
    }

    function renderLog(data) {
      if (!data.length) {
        log.innerHTML = '<div class="log-row"><div class="log-time">--:--:--</div><div class="log-type">idle</div><div class="log-detail">No events yet. Run a test from the matrix.</div></div>';
        return;
      }
      log.innerHTML = data.map(event => {
        const time = new Date(event.time).toLocaleTimeString();
        const isBlockExpected = event.expected === 'should-be-blocked-or-neutralized';
        const isAllowExpected = event.expected === 'should-be-allowed';
        const cls = isBlockExpected ? 'block' : isAllowExpected ? 'allow' : '';
        const detail = [
          event.method + ' ' + event.url,
          event.referer ? 'ref=' + event.referer : '',
          event.headers && event.headers['sec-fetch-dest'] ? 'dest=' + event.headers['sec-fetch-dest'] : '',
          event.userAgent ? 'ua=' + event.userAgent.slice(0, 92) : ''
        ].filter(Boolean).join(' | ');
        return '<div class="log-row" data-id="' + event.id + '">' +
          '<div class="log-time">' + escapeHtml(time) + '</div>' +
          '<div class="log-type ' + cls + '">' + escapeHtml(event.type) + '<br><span class="pill">' + escapeHtml(event.expected) + '</span></div>' +
          '<div class="log-detail">' + escapeHtml(detail) + '<pre class="log-json">' + escapeHtml(JSON.stringify(event, null, 2)) + '</pre></div>' +
          '</div>';
      }).join('');
      for (const row of log.querySelectorAll('.log-row')) {
        row.addEventListener('click', () => row.classList.toggle('open'));
      }
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch]));
    }

    async function snapshotEnvironment() {
      const nav = navigator;
      const values = {
        poisonHook: window.__POISON_IDENTITY_PAGE_SCRIPT__?.installed ? 'installed' : 'not installed',
        poisonEnabled: window.__POISON_IDENTITY_PAGE_SCRIPT__?.enabled ?? 'n/a',
        poisonSpoofing: window.__POISON_IDENTITY_PAGE_SCRIPT__?.spoofingEnabled ?? 'n/a',
        poisonProfileUA: window.__POISON_IDENTITY_PAGE_SCRIPT__?.userAgent || 'n/a',
        poisonProfilePlatform: window.__POISON_IDENTITY_PAGE_SCRIPT__?.platform || 'n/a',
        poisonProfileDeviceMemory: window.__POISON_IDENTITY_PAGE_SCRIPT__?.deviceMemory ?? 'n/a',
        userAgent: nav.userAgent,
        platform: nav.platform,
        language: nav.language,
        languages: Array.from(nav.languages || []).join(', '),
        hardwareConcurrency: nav.hardwareConcurrency,
        deviceMemory: nav.deviceMemory,
        webdriver: nav.webdriver,
        vendor: nav.vendor,
        screen: screen.width + 'x' + screen.height + ' / depth ' + screen.colorDepth,
        viewport: innerWidth + 'x' + innerHeight + ' outer ' + outerWidth + 'x' + outerHeight,
        devicePixelRatio,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookieEnabled: nav.cookieEnabled,
        doNotTrack: nav.doNotTrack,
        plugins: nav.plugins ? nav.plugins.length : 'n/a',
        mimeTypes: nav.mimeTypes ? nav.mimeTypes.length : 'n/a',
        connection: nav.connection ? [nav.connection.effectiveType, nav.connection.rtt, nav.connection.downlink, nav.connection.saveData].join(' / ') : 'n/a',
        storageEstimate: nav.storage?.estimate ? 'available' : 'n/a',
        battery: nav.getBattery ? 'available' : 'n/a'
      };
      const env = document.getElementById('envGrid');
      env.innerHTML = Object.keys(values).map(key =>
        '<div>' + escapeHtml(key) + '</div><strong>' + escapeHtml(values[key]) + '</strong>'
      ).join('');
    }

    async function runStorageProbe() {
      const stamp = Date.now();
      document.cookie = 'poison_lab_cookie=' + stamp + '; SameSite=Lax; path=/';
      localStorage.setItem('poison_lab_local', String(stamp));
      sessionStorage.setItem('poison_lab_session', String(stamp));
      let indexedDb = 'not-tested';
      try {
        const request = indexedDB.open('poison-lab-db', 1);
        indexedDb = await new Promise(resolve => {
          request.onupgradeneeded = () => request.result.createObjectStore('ids');
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('ids', 'readwrite');
            tx.objectStore('ids').put({ stamp }, 'last');
            tx.oncomplete = () => { db.close(); resolve('write-ok'); };
            tx.onerror = () => resolve('write-error');
          };
          request.onerror = () => resolve('open-error');
        });
      } catch (err) {
        indexedDb = 'blocked:' + err.message;
      }
      await jsonPost('/collector/storage', {
        cookie: document.cookie,
        localStorage: localStorage.getItem('poison_lab_local'),
        sessionStorage: sessionStorage.getItem('poison_lab_session'),
        indexedDb
      });
    }

    async function runWebRtcProbe() {
      const candidates = [];
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('poison-lab');
        pc.onicecandidate = event => {
          if (event.candidate) candidates.push(event.candidate.candidate);
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sleep(1200);
        pc.close();
        await jsonPost('/collector/webrtc', { candidates, localDescription: offer.sdp.slice(0, 1600) });
      } catch (err) {
        await jsonPost('/collector/webrtc', { error: err.message, candidates });
      }
    }

    function showCookieBanner() {
      document.getElementById('cookieBannerBox').style.display = 'grid';
    }

    function showFakeModal() {
      const existing = document.getElementById('labFakeModal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.className = 'fake-modal';
      modal.id = 'labFakeModal';
      modal.innerHTML = '<h2>Attention</h2><p>Please confirm to continue</p><button id="fakeOk">OK</button><button id="fakeCancel">Cancel</button>';
      document.body.appendChild(modal);
      document.getElementById('fakeOk').onclick = () => jsonPost('/collector/fake-dialog-ok', { source: 'main-page' });
      document.getElementById('fakeCancel').onclick = () => modal.remove();
    }

    function clearPageTraps() {
      document.getElementById('cookieBannerBox').style.display = 'none';
      const modal = document.getElementById('labFakeModal');
      if (modal) modal.remove();
    }

    function loadCloudflareStyleChallenge() {
      const script = document.createElement('script');
      script.src = '/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1?ray=poison-lab&ts=' + Date.now();
      script.async = true;
      document.head.appendChild(script);
    }

    async function runAll() {
      await window.fakeTracker.runFingerprint();
      await sleep(150);
      await fetch('/collector/fetch?campaign=lab&ts=' + Date.now(), { keepalive: true }).catch(() => {});
      await sleep(150);
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/collector/xhr?campaign=lab&ts=' + Date.now(), true);
      xhr.send();
      await sleep(150);
      navigator.sendBeacon('/collector/beacon?campaign=lab&ts=' + Date.now(), JSON.stringify({ beacon: true, ts: Date.now() }));
      await sleep(150);
      const img = new Image();
      img.src = '/pixel.gif?campaign=lab&ts=' + Date.now();
      document.body.appendChild(img);
      await sleep(150);
      await runStorageProbe();
      await sleep(150);
      await runWebRtcProbe();
      await sleep(150);
      showCookieBanner();
      showFakeModal();
      loadCloudflareStyleChallenge();
      await sleep(500);
      refresh();
    }

    document.getElementById('runAll').onclick = runAll;
    document.getElementById('fingerprint').onclick = () => window.fakeTracker.runFingerprint();
    document.getElementById('trackerFetch').onclick = () => fetch('/collector/fetch?campaign=lab&ts=' + Date.now(), { keepalive: true }).catch(() => {});
    document.getElementById('trackerXhr').onclick = () => { const xhr = new XMLHttpRequest(); xhr.open('GET', '/collector/xhr?campaign=lab&ts=' + Date.now(), true); xhr.send(); };
    document.getElementById('beacon').onclick = () => navigator.sendBeacon('/collector/beacon?campaign=lab&ts=' + Date.now(), JSON.stringify({ beacon: true, ts: Date.now() }));
    document.getElementById('pixel').onclick = () => { const img = new Image(); img.src = '/pixel.gif?campaign=lab&ts=' + Date.now(); document.body.appendChild(img); };
    document.getElementById('popup').onclick = () => { window.open('/popup-ad', '_blank', 'width=420,height=320'); jsonPost('/collector/popup-open', { attempted: true }); };
    document.getElementById('redirect').onclick = () => location.assign('/ad-redirect?to=/collector/redirected');
    document.getElementById('cookieBanner').onclick = showCookieBanner;
    document.getElementById('storage').onclick = runStorageProbe;
    document.getElementById('webrtc').onclick = runWebRtcProbe;
    document.getElementById('cloudflare').onclick = loadCloudflareStyleChallenge;
    document.getElementById('fakeModal').onclick = showFakeModal;
    document.getElementById('clearPage').onclick = clearPageTraps;
    document.getElementById('clear').onclick = async () => { await fetch('/events', { method: 'DELETE' }); refresh(); };
    document.getElementById('rejectCookies').onclick = () => { jsonPost('/collector/cookie-choice', { choice: 'reject' }); clearPageTraps(); };
    document.getElementById('acceptCookies').onclick = () => { jsonPost('/collector/cookie-choice', { choice: 'accept' }); clearPageTraps(); };

    window.addEventListener('POISON_IDENTITY_PAGE_SCRIPT_READY', snapshotEnvironment);
    snapshotEnvironment();
    setTimeout(snapshotEnvironment, 800);
    setTimeout(snapshotEnvironment, 1800);
    setInterval(refresh, 1400);
    refresh();
  </script>
</body>
</html>`;

const trackerJs = `window.fakeTracker = {
  async runFingerprint() {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8d4dff';
    ctx.font = '18px Arial';
    ctx.fillText('poison-lab-fingerprint', 12, 18);
    ctx.fillStyle = 'rgba(24, 255, 135, .72)';
    ctx.fillText(navigator.userAgent, 12, 52);
    const dataUrl = canvas.toDataURL();
    const imageData = ctx.getImageData(0, 0, 24, 24);
    let webglVendor = '';
    let webglRenderer = '';
    let webglVersion = '';
    try {
      const gl = document.createElement('canvas').getContext('webgl') || document.createElement('canvas').getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        webglVendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        webglRenderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        webglVersion = gl.getParameter(gl.VERSION);
      }
    } catch (e) {
      webglVendor = 'error:' + e.message;
    }
    let mediaDevices = [];
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        mediaDevices = (await navigator.mediaDevices.enumerateDevices()).map(device => ({
          kind: device.kind,
          label: device.label,
          deviceId: device.deviceId,
          groupId: device.groupId
        }));
      }
    } catch (e) {
      mediaDevices = [{ error: e.message }];
    }
    await fetch('/collector/fingerprint', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userAgent: navigator.userAgent,
        appVersion: navigator.appVersion,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        languages: Array.from(navigator.languages || []),
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        webdriver: navigator.webdriver,
        doNotTrack: navigator.doNotTrack,
        cookieEnabled: navigator.cookieEnabled,
        screen: {
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth,
          devicePixelRatio,
          innerWidth,
          innerHeight,
          outerWidth,
          outerHeight
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          rtt: navigator.connection.rtt,
          downlink: navigator.connection.downlink,
          saveData: navigator.connection.saveData,
          type: navigator.connection.type
        } : null,
        storageEstimate: navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null,
        battery: navigator.getBattery ? await navigator.getBattery().then(battery => ({
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          level: battery.level
        })).catch(error => ({ error: error.message })) : null,
        permissions: navigator.permissions ? {
          notifications: await navigator.permissions.query({ name: 'notifications' }).then(result => result.state).catch(error => 'error:' + error.message),
          geolocation: await navigator.permissions.query({ name: 'geolocation' }).then(result => result.state).catch(error => 'error:' + error.message)
        } : null,
        plugins: Array.from(navigator.plugins || []).map(plugin => plugin.name),
        mimeTypes: Array.from(navigator.mimeTypes || []).map(type => type.type),
        mediaDevices,
        canvasPrefix: dataUrl.slice(0, 140),
        canvasLength: dataUrl.length,
        imageDataSample: Array.from(imageData.data.slice(0, 32)),
        webglVendor,
        webglRenderer,
        webglVersion
      })
    }).catch(() => {});
  }
};`;

const adScript = `(() => {
  fetch('/collector/ad-script?ts=' + Date.now(), { keepalive: true }).catch(() => {});
  const box = document.createElement('div');
  box.className = 'ad-float';
  box.innerHTML = '<button class="ad-close" aria-label="close">x</button><strong>Kupferaktie meldet Fund</strong><span>Looking for ads?</span><button class="ad-continue">Continue</button>';
  document.body.appendChild(box);
  box.querySelector('.ad-close').onclick = () => box.remove();
  box.querySelector('.ad-continue').onclick = () => window.open('/popup-ad', '_blank');
})();`;

const adFrame = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; min-height: 280px; background: #050505; color: white; font: 12px "Lucida Console", Consolas, monospace; overflow: hidden; }
    .wrapper { position: relative; width: 100%; height: 280px; background: linear-gradient(135deg, #050505, #1b1b1b); border: 1px solid #303030; }
    .banner { position: absolute; inset: 16px; display: grid; place-items: center; background: #101010; border: 1px solid #303030; color: #18ff87; font-size: 22px; font-weight: 900; }
    .mask { position: absolute; inset: 0; background: rgba(0,0,0,.62); }
    .dialog { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(360px, calc(100% - 42px)); background: #000; color: #e8e8e8; border: 1px solid #303030; padding: 18px; box-shadow: 0 16px 50px #000; }
    .dialog h2 { margin: 0 0 14px; font-size: 18px; }
    .dialog p { color: #8b8b8b; }
    .dialog button { padding: 10px 18px; margin-right: 8px; border: 1px solid #303030; background: #080808; color: #e8e8e8; font: inherit; }
  </style>
</head>
<body>
  <div class="wrapper" data-area="area3">
    <div class="banner">BUY NOW -90%</div>
    <div class="mask" data-onopen="0"></div>
    <div class="dialog">
      <h2>Attention</h2>
      <p>Please confirm to continue</p>
      <button onclick="fetch('/collector/frame-ok',{keepalive:true}).catch(()=>{}); window.open('/popup-ad','_blank')">OK</button>
      <button onclick="parent.location.href='/ad-redirect?to=/collector/frame-redirect'">Continue</button>
    </div>
  </div>
  <script src="/ad-script.js"></script>
</body>
</html>`;

const popupAd = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #030303; color: #e8e8e8; font: 12px "Lucida Console", Consolas, monospace; }
    main { width: min(440px, calc(100vw - 32px)); border: 1px solid #303030; background: #000; padding: 22px; }
    h1 { font-size: 18px; margin: 0 0 10px; }
    p { color: #8b8b8b; }
    button { border: 1px solid #303030; background: #080808; color: #e8e8e8; padding: 12px 18px; font: inherit; }
  </style>
</head>
<body>
  <main>
    <h1>Kupferaktie meldet Fund</h1>
    <p>Looking for ads?</p>
    <button onclick="location.href='/collector/popup-click'">Continue</button>
  </main>
</body>
</html>`;

const challengeJs = `(() => {
  const payload = {
    cfLike: true,
    webdriver: navigator.webdriver,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: [screen.width, screen.height, screen.colorDepth],
    ts: Date.now()
  };
  fetch('/collector/challenge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
  console.log('[poison-lab] Cloudflare-style challenge script executed');
})();`;

const gif = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);

  if (url.pathname === '/') {
    logEvent('main-page', req);
    return send(res, 200, page, { 'content-type': 'text/html; charset=utf-8' });
  }

  if (url.pathname === '/tracker.js') {
    logEvent('lab-script', req, { script: 'tracker.js' });
    return send(res, 200, trackerJs, { 'content-type': 'application/javascript; charset=utf-8' });
  }

  if (url.pathname === '/ad-script.js') {
    logEvent('ad-script', req);
    return send(res, 200, adScript, { 'content-type': 'application/javascript; charset=utf-8' });
  }

  if (url.pathname.startsWith('/cdn-cgi/challenge-platform/')) {
    logEvent('cloudflare-script', req);
    return send(res, 200, challengeJs, { 'content-type': 'application/javascript; charset=utf-8' });
  }

  if (url.pathname === '/ad-frame') {
    logEvent('ad-frame', req);
    return send(res, 200, adFrame, { 'content-type': 'text/html; charset=utf-8' });
  }

  if (url.pathname === '/popup-ad') {
    logEvent('popup-ad', req);
    return send(res, 200, popupAd, { 'content-type': 'text/html; charset=utf-8' });
  }

  if (url.pathname === '/pixel.gif') {
    logEvent('pixel', req);
    return send(res, 200, gif, { 'content-type': 'image/gif' });
  }

  if (url.pathname.startsWith('/collector/')) {
    const body = await readBody(req);
    logEvent(`collector:${url.pathname.slice('/collector/'.length)}`, req, {
      body,
      bodyLength: body.length,
      parsedBody: (() => {
        try {
          return body ? JSON.parse(body) : null;
        } catch (err) {
          return null;
        }
      })()
    });
    return send(res, 204, '');
  }

  if (url.pathname === '/ad-redirect') {
    const to = url.searchParams.get('to') || '/collector/redirect-default';
    logEvent('redirect', req, { to });
    res.writeHead(302, {
      location: to,
      'cache-control': 'no-store'
    });
    return res.end();
  }

  if (url.pathname === '/download/final-file.zip') {
    logEvent('download', req);
    return send(res, 200, 'fake download file\n', {
      'content-type': 'application/zip',
      'content-disposition': 'attachment; filename="poison-lab-download.zip"'
    });
  }

  if (url.pathname === '/events') {
    logEvent('events', req, { api: req.method === 'DELETE' ? 'clear' : 'read' });
    if (req.method === 'DELETE') {
      events.splice(0, events.length);
      return send(res, 204, '');
    }
    return send(res, 200, JSON.stringify(events.slice().reverse(), null, 2), { 'content-type': 'application/json; charset=utf-8' });
  }

  if (url.pathname === '/events/summary') {
    return send(res, 200, JSON.stringify(summarizeEvents(), null, 2), { 'content-type': 'application/json; charset=utf-8' });
  }

  logEvent('not-found', req);
  send(res, 404, 'not found', { 'content-type': 'text/plain; charset=utf-8' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Poison test lab running at http://127.0.0.1:${port}`);
});
