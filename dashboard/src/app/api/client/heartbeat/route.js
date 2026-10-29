import { jsonResponse, handleOptions } from '@/lib/cors';
import { registerClientHeartbeat, findMatchingRule } from '@/lib/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { clientId, email, domain, currentUrl } = body;

    if (!clientId) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required field: clientId',
        },
        400
      );
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');
    let headerIp = cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : null);

    // Prefer client reported public IP or header IP, fallback to 127.0.0.1
    let ip = headerIp;
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      ip = body.ip || headerIp || '127.0.0.1';
    }
    const userAgent = request.headers.get('user-agent') || '';

    const client = await registerClientHeartbeat({
      clientId,
      email,
      domain,
      currentUrl,
      userAgent,
      ip,
    });

    const activeRule = domain ? await findMatchingRule(domain, clientId) : null;

    return jsonResponse({
      success: true,
      client,
      hasActiveRule: !!activeRule,
      activeRule: activeRule ? activeRule.name : null,
    });
  } catch (error) {
    console.error('Error in /api/client/heartbeat:', error);
    return jsonResponse(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      500
    );
  }
}
