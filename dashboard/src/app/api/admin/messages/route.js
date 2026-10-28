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
      messages: db.messages || [],
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { targetClientId, title, body: msgBody, colorBg, colorText, colorTitle, height, customCss, customJs } = body;

    if (!title || !msgBody) {
      return jsonResponse({ success: false, error: 'Title and Body are required' }, 400);
    }

    const db = getDb();
    const newMsg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      targetClientId: targetClientId || null, // null for global broadcast
      title,
      body: msgBody,
      colorBg: colorBg || '#0b0e11',
      colorText: colorText || '#eaecef',
      colorTitle: colorTitle || '#f0b90b',
      height: height || '45',
      customCss: customCss || '',
      customJs: customJs || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.messages = db.messages || [];
    db.messages.unshift(newMsg);
    saveDb(db);

    return jsonResponse({ success: true, message: newMsg }, 201);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    const db = getDb();
    const msg = (db.messages || []).find((m) => m.id === id);
    if (!msg) {
      return jsonResponse({ success: false, error: 'Message not found' }, 404);
    }

    if (isActive !== undefined) {
      msg.isActive = isActive;
    }
    saveDb(db);

    return jsonResponse({ success: true, message: msg });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const db = getDb();
    db.messages = (db.messages || []).filter((m) => m.id !== id);
    saveDb(db);

    return jsonResponse({ success: true, deletedId: id });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
