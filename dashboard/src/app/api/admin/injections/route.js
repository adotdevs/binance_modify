import { jsonResponse, handleOptions } from '@/lib/cors';
import { getAllInjections, saveInjection, deleteInjection, toggleInjection } from '@/lib/db';
import { broadcastUpdate } from '@/lib/events';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const injections = await getAllInjections();

    const filtered = domain
      ? injections.filter((r) => r.domain === '*' || r.domain.toLowerCase() === domain.toLowerCase())
      : injections;

    return jsonResponse({
      success: true,
      injections: filtered,
      count: filtered.length,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, domain, targetClientId, injectionType, targetSelector, code, autoLocate, enabled } = body;

    if (!domain) {
      return jsonResponse({ success: false, error: 'Target domain is required (e.g. binance.com or *)' }, 400);
    }
    if (!code || !code.trim()) {
      return jsonResponse({ success: false, error: 'Please provide code to inject (JavaScript, CSS, or element modifier)' }, 400);
    }

    const saved = await saveInjection({
      id,
      name: name || '',
      domain,
      targetClientId: targetClientId || '',
      injectionType: injectionType || 'element',
      targetSelector: targetSelector || '',
      code: code || '',
      autoLocate: autoLocate !== undefined ? autoLocate : true,
      enabled: enabled !== undefined ? enabled : true,
    });

    // Notify all active extension instances via real-time SSE
    broadcastUpdate({
      type: 'injection_update',
      action: 'save',
      domain: saved.domain,
      injection: saved,
    });

    return jsonResponse({
      success: true,
      injection: saved,
      message: `Code injection rule saved for ${saved.domain}`,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return jsonResponse({ success: false, error: 'Missing injection ID' }, 400);
    }

    await deleteInjection(id);

    broadcastUpdate({
      type: 'injection_update',
      action: 'delete',
      id,
    });

    return jsonResponse({
      success: true,
      message: 'Code injection rule deleted successfully',
      id,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, enabled } = body;

    if (!id) {
      return jsonResponse({ success: false, error: 'Missing injection ID' }, 400);
    }

    const updated = await toggleInjection(id, enabled);

    broadcastUpdate({
      type: 'injection_update',
      action: 'toggle',
      id,
      enabled: Boolean(enabled),
    });

    return jsonResponse({
      success: true,
      injection: updated,
      message: `Injection ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

