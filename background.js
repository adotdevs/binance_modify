// Background Service Worker (Manifest V3)
const ALARM_NAME = 'poll_remote_overlay';
const POLL_INTERVAL_MINUTES = 1; // Check every minute
const DEFAULT_SERVER_URL = 'https://extension-dashboard-eight.vercel.app';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[RemoteOverlay Background] Installed');

  // Initialize defaults if not present
  chrome.storage.local.get(['apiBaseUrl', 'clientId'], (data) => {
    const updates = {};
    if (!data.apiBaseUrl) updates.apiBaseUrl = DEFAULT_SERVER_URL;
    if (!data.clientId) updates.clientId = 'client_' + Math.random().toString(36).substring(2, 10);

    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });

  // Setup periodic polling alarm
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: POLL_INTERVAL_MINUTES,
  });
});

// Periodic alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkUpdatesForActiveTabs();
  }
});

async function checkUpdatesForActiveTabs() {
  try {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        chrome.tabs.sendMessage(tab.id, { action: 'background_poll' }).catch(() => {
          // Tab might not have content script running
        });
      }
    }
  } catch (err) {
    console.warn('[RemoteOverlay Background] Poll error', err);
  }
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'get_client_info') {
    chrome.storage.local.get(['clientId', 'apiBaseUrl', 'userEmail'], (data) => {
      sendResponse(data);
    });
    return true; // Keep message port open for async response
  }
});
