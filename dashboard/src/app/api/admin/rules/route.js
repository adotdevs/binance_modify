import { jsonResponse, handleOptions } from '@/lib/cors';
import { getDb, saveDb } from '@/lib/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const db = getDb();
    return jsonResponse({
      success: true,
      rules: db.rules || [],
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, domain, enabled, priority, targetClientId, overlay } = body;

    if (!domain) {
      return jsonResponse({ success: false, error: 'Domain pattern is required' }, 400);
    }

    const db = getDb();
    const newRule = {
      id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name || `Overlay for ${domain}`,
      domain: domain.trim(),
      enabled: enabled !== undefined ? enabled : true,
      priority: Number(priority) || 10,
      targetClientId: targetClientId || null,
      overlay: {
        height: overlay?.height || '50',
        bg: overlay?.bg || '#0b0e11',
        text: overlay?.text || '#eaecef',
        titleColor: overlay?.titleColor || '#f0b90b',
        title: overlay?.title || 'Notice',
        message: overlay?.message || 'Important security notification.',
        position: overlay?.position || 'top',
        closable: overlay?.closable !== undefined ? overlay.closable : true,
        customCss: overlay?.customCss || '',
        customJs: overlay?.customJs || '',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.rules = db.rules || [];
    db.rules.unshift(newRule);
    saveDb(db);

    return jsonResponse({ success: true, rule: newRule }, 201);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return jsonResponse({ success: false, error: 'Rule ID is required for update' }, 400);
    }

    const db = getDb();
    const index = (db.rules || []).findIndex((r) => r.id === id);

    if (index === -1) {
      return jsonResponse({ success: false, error: 'Rule not found' }, 404);
    }

    const existing = db.rules[index];
    const updatedRule = {
      ...existing,
      ...updates,
      overlay: {
        ...existing.overlay,
        ...(updates.overlay || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    db.rules[index] = updatedRule;
    saveDb(db);

    return jsonResponse({ success: true, rule: updatedRule });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return jsonResponse({ success: false, error: 'Missing rule ID' }, 400);
    }

    const db = getDb();
    const initialLen = db.rules.length;
    db.rules = (db.rules || []).filter((r) => r.id !== id);

    if (db.rules.length === initialLen) {
      return jsonResponse({ success: false, error: 'Rule not found' }, 404);
    }

    saveDb(db);
    return jsonResponse({ success: true, deletedId: id });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
