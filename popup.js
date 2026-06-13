const browserAPI = window.browser || window.chrome;

const els = {
  status: document.getElementById('status'),
  subtitle: document.getElementById('subtitle'),
  blockedCount: document.getElementById('blockedCount'),
  siteDataClears: document.getElementById('siteDataClears'),
  lastDataClear: document.getElementById('lastDataClear'),
  lastBlockedHost: document.getElementById('lastBlockedHost'),
  debugLogs: document.getElementById('debugLogs'),
  personaSelect: document.getElementById('personaSelect'),
  personaDescription: document.getElementById('personaDescription'),
  applyPersona: document.getElementById('applyPersona'),
  toggleEnabled: document.getElementById('toggleEnabled'),
  toggleSpoofing: document.getElementById('toggleSpoofing'),
  togglePoisoning: document.getElementById('togglePoisoning'),
  toggleAutoRejectCookies: document.getElementById('toggleAutoRejectCookies'),
  togglePopupBlocking: document.getElementById('togglePopupBlocking'),
  toggleCloudflareCompatibility: document.getElementById('toggleCloudflareCompatibility'),
  toggleAntidoteMode: document.getElementById('toggleAntidoteMode'),
  toggleAutoCookieClearing: document.getElementById('toggleAutoCookieClearing'),
  toggleWebrtcShield: document.getElementById('toggleWebrtcShield'),
  toggleHeaderProtection: document.getElementById('toggleHeaderProtection'),
  trustCurrentSite: document.getElementById('trustCurrentSite'),
  toggleRemoteFilters: document.getElementById('toggleRemoteFilters'),
  refreshFilters: document.getElementById('refreshFilters'),
  toggleDebugMode: document.getElementById('toggleDebugMode'),
  clearDebugLogs: document.getElementById('clearDebugLogs')
};

let currentState = null;

const sendMessage = (message) => new Promise((resolve) => {
  browserAPI.runtime.sendMessage(message, (response) => resolve(response || {}));
});

const getActiveTab = () => new Promise((resolve) => {
  if (!browserAPI.tabs?.query) {
    resolve(null);
    return;
  }
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    resolve(Array.isArray(tabs) ? tabs[0] : null);
  });
});

const getHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return '';
  }
};

const setButton = (id, active, onText, offText) => {
  els[id].textContent = active ? onText : offText;
};

const renderPersonas = (state) => {
  const options = Array.isArray(state.personaOptions) ? state.personaOptions : [];
  const activeId = state.poisonPersona?.id || 'standard';
  els.personaSelect.innerHTML = '';
  for (const option of options) {
    const node = document.createElement('option');
    node.value = option.id;
    node.textContent = option.name;
    node.selected = option.id === activeId;
    node.dataset.description = option.description || '';
    els.personaSelect.appendChild(node);
  }
  const selected = els.personaSelect.selectedOptions[0];
  els.personaDescription.textContent = selected?.dataset.description || state.poisonPersona?.description || 'Temporary profile resets next browser session.';
  els.subtitle.textContent = `Session profile: ${state.poisonPersona?.name || 'Standard'}`;
};

const renderState = (state) => {
  currentState = state;
  const antidote = Boolean(state.antidoteModeEnabled);
  els.status.classList.toggle('paused', !state.enabled);
  els.status.classList.toggle('antidote', antidote);
  els.status.textContent = antidote ? 'Antidote' : state.enabled ? 'Protected' : 'Paused';

  setButton('toggleEnabled', state.enabled, 'Pause Protection', 'Resume Protection');
  setButton('toggleSpoofing', state.spoofingEnabled, 'Spoofing On', 'Spoofing Off');
  setButton('togglePoisoning', state.poisoningEnabled, 'Poisoning On', 'Poisoning Off');
  setButton('toggleAutoRejectCookies', state.autoRejectCookiesEnabled, 'Cookie Reject On', 'Cookie Reject Off');
  setButton('togglePopupBlocking', state.popupBlockingEnabled, 'Popup Guard On', 'Popup Guard Off');
  setButton('toggleCloudflareCompatibility', state.cloudflareCompatibilityEnabled, 'Cloudflare Compat On', 'Cloudflare Compat Off');
  setButton('toggleAntidoteMode', antidote, 'Disable Antidote', 'Enable Antidote');
  setButton('toggleAutoCookieClearing', state.autoCookieClearingEnabled, 'Data Scrub On', 'Data Scrub Off');
  setButton('toggleWebrtcShield', state.webrtcShieldEnabled, 'WebRTC Shield On', 'WebRTC Shield Off');
  setButton('toggleHeaderProtection', state.headerProtectionEnabled, 'Headers Protected', 'Headers Normal');
  setButton('toggleRemoteFilters', state.useRemoteFilters, 'Remote Filters On', 'Remote Filters Off');
  setButton('toggleDebugMode', state.debugEnabled, 'Debug On', 'Debug Off');

  els.blockedCount.textContent = state.blockedCount || 0;
  els.siteDataClears.textContent = state.siteDataClears || 0;
  els.lastDataClear.textContent = state.lastDataClear ? new Date(state.lastDataClear).toLocaleTimeString() : 'none';
  els.lastBlockedHost.textContent = state.lastBlockedHost || 'none';
  renderPersonas(state);
  refreshDebugLogs();
};

const refreshState = async () => {
  renderState(await sendMessage({ command: 'getState' }));
};

const formatDebugLog = (entry) => {
  const time = entry.time ? new Date(entry.time).toLocaleTimeString() : 'time?';
  const data = entry.data && Object.keys(entry.data).length > 0 ? ` ${JSON.stringify(entry.data)}` : '';
  return `${time} [${entry.scope}] ${entry.event}${data}`;
};

const refreshDebugLogs = async () => {
  const response = await sendMessage({ command: 'getDebugLogs' });
  const logs = response?.logs || [];
  els.debugLogs.textContent = logs.length ? logs.slice(-40).map(formatDebugLog).join('\n') : 'No logs yet.';
  els.debugLogs.scrollTop = els.debugLogs.scrollHeight;
};

const toggle = (command) => async () => {
  await sendMessage({ command });
  await refreshState();
};

els.personaSelect.addEventListener('change', () => {
  const selected = els.personaSelect.selectedOptions[0];
  els.personaDescription.textContent = selected?.dataset.description || 'Temporary profile resets next browser session.';
});

els.applyPersona.addEventListener('click', async () => {
  els.applyPersona.textContent = 'Applying...';
  await sendMessage({ command: 'setSessionPersona', personaId: els.personaSelect.value });
  els.applyPersona.textContent = 'Apply Session Profile';
  await refreshState();
});

els.toggleEnabled.addEventListener('click', toggle('toggleEnabled'));
els.toggleSpoofing.addEventListener('click', toggle('toggleSpoofing'));
els.togglePoisoning.addEventListener('click', toggle('togglePoisoning'));
els.toggleAutoRejectCookies.addEventListener('click', toggle('toggleAutoRejectCookies'));
els.togglePopupBlocking.addEventListener('click', toggle('togglePopupBlocking'));
els.toggleCloudflareCompatibility.addEventListener('click', toggle('toggleCloudflareCompatibility'));
els.toggleAntidoteMode.addEventListener('click', toggle('toggleAntidoteMode'));
els.toggleAutoCookieClearing.addEventListener('click', toggle('toggleAutoCookieClearing'));
els.toggleWebrtcShield.addEventListener('click', toggle('toggleWebrtcShield'));
els.toggleHeaderProtection.addEventListener('click', toggle('toggleHeaderProtection'));
els.toggleRemoteFilters.addEventListener('click', toggle('toggleRemoteFilters'));
els.toggleDebugMode.addEventListener('click', toggle('toggleDebugMode'));

els.trustCurrentSite.addEventListener('click', async () => {
  const tab = await getActiveTab();
  const hostname = getHostname(tab?.url || '');
  if (!hostname) {
    els.trustCurrentSite.textContent = 'No Site Found';
    setTimeout(refreshState, 1200);
    return;
  }
  els.trustCurrentSite.textContent = `Trusting ${hostname}`;
  await sendMessage({ command: 'addTrustedSite', hostname, url: tab.url });
  await refreshState();
});

els.refreshFilters.addEventListener('click', async () => {
  els.refreshFilters.textContent = 'Refreshing...';
  await sendMessage({ command: 'refreshFilters' });
  els.refreshFilters.textContent = 'Refresh Filters';
  await refreshState();
});

els.clearDebugLogs.addEventListener('click', async () => {
  await sendMessage({ command: 'clearDebugLogs' });
  await refreshDebugLogs();
});

refreshState();
