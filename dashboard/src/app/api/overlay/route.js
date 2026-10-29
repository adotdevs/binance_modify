import { jsonResponse, handleOptions } from '@/lib/cors';
import { findMatchingRule } from '@/lib/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') || '';
    const clientId = searchParams.get('clientId') || searchParams.get('client_id') || null;

    if (!domain) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required query parameter "domain"',
        },
        400
      );
    }

    const matchedRule = await findMatchingRule(domain, clientId);

    if (matchedRule) {
      return jsonResponse({
        success: true,
        matched: true,
        domain,
        clientId,
        rule: matchedRule,
        overlay: {
          ...matchedRule.overlay,
          enabled: matchedRule.enabled !== false,
        },
        updatedAt: matchedRule.updatedAt,
      });
    }

    return jsonResponse({
      success: true,
      matched: false,
      domain,
      clientId,
      message: `No active overlay rule matched domain: ${domain}`,
    });
  } catch (error) {
    console.error('Error in /api/overlay:', error);
    return jsonResponse(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      500
    );
  }
}
