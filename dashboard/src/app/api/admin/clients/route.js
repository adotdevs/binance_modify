import { jsonResponse, handleOptions } from '@/lib/cors';
import { getDb, saveDb } from '@/lib/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const db = getDb();
    const now = Date.now();

    // Mark status based on last seen within 2 minutes
    const clients = (db.clients || []).map((c) => {
      const lastSeenTime = new Date(c.lastSeen).getTime();
      const isOnline = now - lastSeenTime < 2 * 60 * 1000;
      return {
        ...c,
        status: isOnline ? 'online' : 'offline',
        secondsAgo: Math.round((now - lastSeenTime) / 1000),
      };
    });

    return jsonResponse({
      success: true,
      clients,
      stats: {
        totalClients: clients.length,
        onlineClients: clients.filter((c) => c.status === 'online').length,
        totalRequests: db.stats?.totalRequests || 0,
        rulesCount: (db.rules || []).length,
      },
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const db = getDb();
    if (clientId) {
      db.clients = (db.clients || []).filter((c) => c.clientId !== clientId);
    } else {
      db.clients = [];
    }
    saveDb(db);

    return jsonResponse({ success: true, message: 'Clients updated' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
