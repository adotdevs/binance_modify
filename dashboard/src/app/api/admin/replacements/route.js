import { jsonResponse, handleOptions } from '@/lib/cors';
import { getAllReplacements, saveReplacement, deleteReplacement, toggleReplacement } from '@/lib/db';
import { broadcastUpdate } from '@/lib/events';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const replacements = await getAllReplacements();

    const filtered = domain
      ? replacements.filter((r) => r.domain === '*' || r.domain.toLowerCase() === domain.toLowerCase())
      : replacements;

    return jsonResponse({
      success: true,
      replacements: filtered,
      count: filtered.length,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { domain, selector, originalText, replacementText, pastedCode, replaceType, enabled, id } = body;

    if (!domain) {
      return jsonResponse({ success: false, error: 'Target domain is required' }, 400);
    }
    if (!originalText && !selector && !pastedCode) {
      return jsonResponse({ success: false, error: 'Please provide either pasted code, original text, or a CSS selector' }, 400);
    }

    const saved = await saveReplacement({
      id,
      domain,
      selector,
      originalText,
      replacementText: replacementText || '',
      pastedCode,
      replaceType: replaceType || 'text',
      enabled: enabled !== undefined ? enabled : true,
    });

    // Notify all active extension instances via real-time SSE
    broadcastUpdate({
      type: 'replacement_update',
      action: 'save',
      domain: saved.domain,
      replacement: saved,
    });

    return jsonResponse({
      success: true,
      replacement: saved,
      message: `Live text replacement saved for ${saved.domain}`,
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
      return jsonResponse({ success: false, error: 'Missing replacement ID' }, 400);
    }

    await deleteReplacement(id);

    broadcastUpdate({
      type: 'replacement_update',
      action: 'delete',
      id,
    });

    return jsonResponse({
      success: true,
      message: 'Replacement rule deleted successfully',
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
      return jsonResponse({ success: false, error: 'Missing replacement ID' }, 400);
    }

    const updated = await toggleReplacement(id, enabled);

    broadcastUpdate({
      type: 'replacement_update',
      action: 'toggle',
      id,
      enabled: Boolean(enabled),
    });

    return jsonResponse({
      success: true,
      replacement: updated,
      message: `Replacement ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
