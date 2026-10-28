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
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    const client = registerClientHeartbeat({
      clientId,
      email,
      domain,
      currentUrl,
      userAgent,
      ip,
    });

    const activeRule = domain ? findMatchingRule(domain, clientId) : null;

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
