import { jsonResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  return jsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Binance & Multi-Domain Remote Overlay API',
    version: '2.0.0',
  });
}
