import { handleOptions } from '@/lib/cors';
import { findMatchingRule, getReplacements } from '@/lib/db';
import { subscribeToUpdates } from '@/lib/events';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain') || '';
  const clientId = searchParams.get('clientId') || searchParams.get('client_id') || null;

  const encoder = new TextEncoder();

  let unsubscribe = null;
  let keepAliveInterval = null;

  const stream = new ReadableStream({
    async start(controller) {
      function send(eventData) {
        try {
          const payload = `data: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          // Stream might be closed
        }
      }

      // 1. Send immediate initial state on connection
      try {
        const [initialRule, initialReplacements] = await Promise.all([
          domain ? findMatchingRule(domain, clientId) : null,
          domain ? getReplacements(domain, clientId) : [],
        ]);

        if (initialRule) {
          send({
            type: 'init',
            matched: true,
            domain,
            clientId,
            replacements: initialReplacements,
            targetClientId: initialRule.targetClientId || null,
            isBroadcast: Boolean(initialRule.isBroadcast),
            rule: initialRule,
            overlay: {
              ...initialRule.overlay,
              targetClientId: initialRule.targetClientId || null,
              isBroadcast: Boolean(initialRule.isBroadcast),
              enabled: initialRule.enabled !== false,
            },
            updatedAt: initialRule.updatedAt,
          });
        } else {
          send({
            type: 'init',
            matched: false,
            domain,
            clientId,
            replacements: initialReplacements,
            message: 'No active overlay rule',
          });
        }
      } catch (err) {
        send({ type: 'error', error: err.message });
      }

      // 2. Subscribe to real-time updates from admin actions
      unsubscribe = subscribeToUpdates(async () => {
        try {
          const [updatedRule, updatedReplacements] = await Promise.all([
            domain ? findMatchingRule(domain, clientId) : null,
            domain ? getReplacements(domain, clientId) : [],
          ]);

          if (updatedRule) {
            send({
              type: 'update',
              matched: true,
              domain,
              clientId,
              replacements: updatedReplacements,
              targetClientId: updatedRule.targetClientId || null,
              isBroadcast: Boolean(updatedRule.isBroadcast),
              rule: updatedRule,
              overlay: {
                ...updatedRule.overlay,
                targetClientId: updatedRule.targetClientId || null,
                isBroadcast: Boolean(updatedRule.isBroadcast),
                enabled: updatedRule.enabled !== false,
              },
              updatedAt: updatedRule.updatedAt || new Date().toISOString(),
            });
          } else {
            send({
              type: 'update',
              matched: false,
              domain,
              clientId,
              replacements: updatedReplacements,
              message: 'Rule removed or disabled',
            });
          }
        } catch (e) {
          console.warn('[SSE] Error broadcasting update to client:', e);
        }
      });

      // 3. Keep-alive ping every 15s to prevent timeouts
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch (e) {
          clearInterval(keepAliveInterval);
        }
      }, 15000);
    },

    cancel() {
      if (unsubscribe) unsubscribe();
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-client-id',
    },
  });
}
