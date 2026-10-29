import { jsonResponse, handleOptions } from '@/lib/cors';
import { findMatchingRule, getReplacements } from '@/lib/db';

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

    const [matchedRule, replacements] = await Promise.all([
      findMatchingRule(domain, clientId),
      getReplacements(domain),
    ]);

    if (matchedRule) {
      return jsonResponse({
        success: true,
        matched: true,
        domain,
        clientId,
        replacements,
        targetClientId: matchedRule.targetClientId || null,
        isBroadcast: Boolean(matchedRule.isBroadcast),
        rule: matchedRule,
        overlay: {
          ...matchedRule.overlay,
          targetClientId: matchedRule.targetClientId || null,
          isBroadcast: Boolean(matchedRule.isBroadcast),
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
      replacements,
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
