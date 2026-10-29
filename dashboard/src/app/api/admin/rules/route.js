import { jsonResponse, handleOptions } from '@/lib/cors';
import { getRules, createRule, updateRule, deleteRule } from '@/lib/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const rules = await getRules();
    return jsonResponse({
      success: true,
      rules,
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

    const newRule = await createRule({
      name,
      domain,
      enabled,
      priority,
      targetClientId,
      overlay,
    });

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

    const updated = await updateRule(id, updates);
    if (!updated) {
      return jsonResponse({ success: false, error: 'Rule not found' }, 404);
    }

    return jsonResponse({ success: true, rule: updated });
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

    await deleteRule(id);
    return jsonResponse({ success: true, deletedId: id });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
