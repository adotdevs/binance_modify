import { jsonResponse, handleOptions } from '@/lib/cors';
import { getMessages, createMessage, deleteMessage } from '@/lib/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const messages = await getMessages();
    return jsonResponse({
      success: true,
      messages,
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

    const newMsg = await createMessage({
      targetClientId,
      title,
      body: msgBody,
      colorBg,
      colorText,
      colorTitle,
      height,
      customCss,
      customJs,
    });

    return jsonResponse({ success: true, message: newMsg }, 201);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return jsonResponse({ success: false, error: 'Missing message ID' }, 400);
    }

    await deleteMessage(id);
    return jsonResponse({ success: true, deletedId: id });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
