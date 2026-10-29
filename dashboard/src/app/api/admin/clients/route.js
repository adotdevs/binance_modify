import { jsonResponse, handleOptions } from '@/lib/cors';
import { getClients, getStats, deleteClient } from '@/lib/db';
import { checkMongoConnection } from '@/lib/mongodb';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  try {
    const [clients, stats, mongo] = await Promise.all([
      getClients(),
      getStats(),
      checkMongoConnection(),
    ]);

    const onlineCount = clients.filter((c) => c.isOnline || c.status === 'online').length;

    return jsonResponse({
      success: true,
      clients,
      onlineClients: onlineCount,
      totalClients: clients.length,
      stats: {
        ...stats,
        totalClients: clients.length,
        onlineClients: onlineCount,
        mongoConnected: mongo.connected,
        mongoDbName: mongo.dbName,
        mongoUri: mongo.uri,
      },
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || searchParams.get('id');

    if (!clientId) {
      return jsonResponse({ success: false, error: 'Missing required parameter: clientId' }, 400);
    }

    await deleteClient(clientId);
    return jsonResponse({
      success: true,
      message: `Client ${clientId} successfully deleted`,
      deletedClientId: clientId,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

