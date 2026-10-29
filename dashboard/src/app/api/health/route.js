import { jsonResponse, handleOptions } from '@/lib/cors';
import { checkMongoConnection } from '@/lib/mongodb';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const mongoStatus = await checkMongoConnection();

  return jsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Remote Overlay & Script Injection API',
    version: '2.1.0',
    database: {
      provider: 'MongoDB',
      connected: mongoStatus.connected,
      dbName: mongoStatus.dbName,
      uri: mongoStatus.uri,
      error: mongoStatus.error || null,
    },
  });
}
