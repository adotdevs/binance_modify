import { jsonResponse, handleOptions } from '@/lib/cors';
import { getClients, getStats } from '@/lib/db';
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

    return jsonResponse({
      success: true,
      clients,
      stats: {
        ...stats,
        totalClients: clients.length,
        onlineClients: clients.filter((c) => c.status === 'online').length,
        mongoConnected: mongo.connected,
        mongoDbName: mongo.dbName,
        mongoUri: mongo.uri,
      },
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}
