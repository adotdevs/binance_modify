aximport { jsonResponse, handleOptions } from '@/lib/cors';
import { getBroadcastSettings, updateBroadcastSettings, getMessages } from '@/lib/db';
import { broadcastUpdate } from '@/lib/events';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const settings = await getBroadcastSettings();
    const allMessages = await getMessages();
    const broadcasts = allMessages.filter(
      (m) => m.isActive && (!m.targetClientId || m.targetClientId === 'broadcast' || m.targetClientId === 'all')
    );

    return jsonResponse({
      success: true,
      broadcastsEnabled: settings.broadcastsEnabled !== false,
      broadcasts,
      totalActiveBroadcasts: broadcasts.length,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    let enabled = true;

    if (body.action === 'disable_all') {
      enabled = false;
    } else if (body.action === 'enable_all') {
      enabled = true;
    } else if (body.broadcastsEnabled !== undefined) {
      enabled = Boolean(body.broadcastsEnabled);
    }

    const updated = await updateBroadcastSettings({ broadcastsEnabled: enabled });

    // Instantly notify all connected clients via SSE stream
    broadcastUpdate({
      type: 'broadcasts_toggled',
      broadcastsEnabled: updated.broadcastsEnabled,
    });

    return jsonResponse({
      success: true,
      broadcastsEnabled: updated.broadcastsEnabled,
      message: updated.broadcastsEnabled
        ? 'Broadcasts are now ENABLED (sent to all clients)'
        : 'Broadcasts are now DISABLED (only direct client alerts will show)',
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
