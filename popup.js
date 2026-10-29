document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const activeDomainEl = document.getElementById('active-domain');
  const ruleStatusEl = document.getElementById('rule-status');
  const clientIdInput = document.getElementById('client-id-input');
  const userEmailInput = document.getElementById('user-email-input');
  const apiUrlInput = document.getElementById('api-url-input');
  const saveBtn = document.getElementById('save-btn');
  const forceRefreshBtn = document.getElementById('force-refresh-btn');
  const copyIdBtn = document.getElementById('copy-id-btn');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');

  const DEFAULT_SERVER_URL = 'https://extension-admin-phi.vercel.app';
  const CANDIDATE_URLS = [
    'https://extension-admin-phi.vercel.app',
    'http://localhost:3001',
    'http://localhost:3000',
  ];

  let currentDomain = '';
  let activeTabId = null;

  // 1. Get current active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      activeTabId = tabs[0].id;
      const url = new URL(tabs[0].url);
      currentDomain = url.hostname;
      activeDomainEl.innerText = currentDomain || 'N/A';
    } else {
      activeDomainEl.innerText = 'No active webpage';
    }
  } catch (err) {
    activeDomainEl.innerText = 'Local / Restricted Page';
  }

  // 2. Load stored settings or generate clientId
  chrome.storage.local.get(['apiBaseUrl', 'clientId', 'userEmail'], async (stored) => {
    let clientId = stored.clientId;
    if (!clientId) {
      clientId = 'client_' + Math.random().toString(36).substring(2, 10);
      chrome.storage.local.set({ clientId });
    }
    clientIdInput.value = clientId;

    let apiBaseUrl = stored.apiBaseUrl;
    if (stored.userEmail) {
      userEmailInput.value = stored.userEmail;
    }

    // Auto-migrate legacy or empty URL to current production server
    if (!apiBaseUrl || apiBaseUrl.includes('extension-dashboard-eight.vercel.app')) {
      apiBaseUrl = DEFAULT_SERVER_URL;
      chrome.storage.local.set({ apiBaseUrl });
    }

    apiUrlInput.value = apiBaseUrl;

    // Check backend health and matching rule
    checkBackend(apiBaseUrl, clientId, currentDomain);
  });

  // Check backend server connection and active rule
  async function checkBackend(apiUrl, clientId, domain) {
    statusBadge.className = 'badge badge-checking';
    statusBadge.innerText = 'Connecting...';
    ruleStatusEl.innerText = 'Checking...';

    try {
      const healthRes = await fetch(`${apiUrl}/api/health`, { method: 'GET', cache: 'no-store' });
      if (!healthRes.ok) throw new Error('API unreachable');

      statusBadge.className = 'badge badge-online';
      statusBadge.innerText = 'Online';

      if (domain) {
        const overlayRes = await fetch(
          `${apiUrl}/api/overlay?domain=${encodeURIComponent(domain)}&clientId=${encodeURIComponent(clientId)}&_t=${Date.now()}`,
          { cache: 'no-store' }
        );
        const overlayData = await overlayRes.json();

        if (overlayData.matched && overlayData.rule) {
          ruleStatusEl.innerHTML = `<span style="color:#0ecb81;">Active: ${overlayData.rule.name}</span>`;
        } else {
          ruleStatusEl.innerHTML = `<span style="color:#848e9c;">No active rule for this domain</span>`;
        }
      } else {
        ruleStatusEl.innerText = 'No active domain';
      }
    } catch (err) {
      statusBadge.className = 'badge badge-offline';
      statusBadge.innerText = 'Offline';
      ruleStatusEl.innerHTML = `<span style="color:#f6465d;">Cannot reach ${apiUrl}</span>`;
    }
  }

  // Save Settings
  saveBtn.addEventListener('click', () => {
    const apiBaseUrl = apiUrlInput.value.trim().replace(/\/+$/, '') || DEFAULT_SERVER_URL;
    const userEmail = userEmailInput.value.trim();
    const clientId = clientIdInput.value.trim();

    chrome.storage.local.set({ apiBaseUrl, userEmail, clientId }, () => {
      saveBtn.innerText = 'Saved! ✓';
      setTimeout(() => {
        saveBtn.innerText = 'Save Settings';
      }, 1500);

      checkBackend(apiBaseUrl, clientId, currentDomain);

      // Trigger immediate heartbeat
      fetch(`${apiBaseUrl}/api/client/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          clientId,
          email: userEmail,
          domain: currentDomain,
        }),
      }).catch(() => {});

      // Notify content script to reconnect
      if (activeTabId) {
        chrome.tabs.sendMessage(activeTabId, { action: 'refresh_overlay' }).catch(() => {});
      }
    });
  });

  // Force Refresh / Sync Overlay
  forceRefreshBtn.addEventListener('click', async () => {
    forceRefreshBtn.innerText = 'Syncing...';
    if (activeTabId) {
      try {
        await chrome.tabs.sendMessage(activeTabId, { action: 'refresh_overlay' });
      } catch (e) {}
    }
    setTimeout(() => {
      forceRefreshBtn.innerText = 'Sync Overlay';
      const apiBaseUrl = apiUrlInput.value.trim().replace(/\/+$/, '') || DEFAULT_SERVER_URL;
      const clientId = clientIdInput.value.trim();
      checkBackend(apiBaseUrl, clientId, currentDomain);
    }, 800);
  });

  // Copy Client ID
  copyIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(clientIdInput.value);
    copyIdBtn.innerText = '✓';
    setTimeout(() => {
      copyIdBtn.innerText = '📋';
    }, 1200);
  });

  // Open Admin Dashboard
  openDashboardBtn.addEventListener('click', () => {
    const apiBaseUrl = apiUrlInput.value.trim().replace(/\/+$/, '') || DEFAULT_SERVER_URL;
    chrome.tabs.create({ url: apiBaseUrl });
  });
});
