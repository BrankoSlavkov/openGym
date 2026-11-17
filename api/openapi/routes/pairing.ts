/* Fork: the "pairing" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, OwnerProof, SessionUser } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const pairCreate = {
  method: 'post',
  path: '/api/pair/create',
  operationId: 'pairCreate',
  tags: ['pairing'],
  summary: 'Mint a pairing code for the mobile app',
  description: `Called from an already signed-in browser tab (Settings → "Pair the mobile
app"). Returns an 8-character code (alphabet without 0/O/1/I) the phone
redeems within 5 minutes via /api/pair/redeem. One-shot. One live code per
profile: minting a new one retires the previous one. Same proof as a device
link (a passkey assertion made for this request, or the current password while
password sign-in is on), since the phone token a code turns into is renewed for
as long as it is used. Audited as \`auth.pair.create\`.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: OwnerProof }
        }
      }
    },
  responses: {
      '200': {
        description: 'A fresh pairing code.',
        content: {
          'application/json': { schema: z.object({
              code: z.string().openapi({ description: '8 chars from ABCDEFGHJKLMNPQRSTUVWXYZ23456789.' }).optional()
            }), example: { code: 'K7WQ2MZP' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.ProofRefused,
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const pairRedeem = {
  method: 'post',
  path: '/api/pair/redeem',
  operationId: 'pairRedeem',
  tags: ['pairing'],
  summary: 'Redeem a pairing code for a Bearer token',
  description: `Called from the mobile app with the code shown in the browser. No session
required: the code *is* the credential (one-shot, 5-minute TTL). Returns the
same HMAC-signed session token the cookie would carry; the app sends it as
\`Authorization: Bearer <token>\` from then on. CSRF-exempt.`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              code: z.string().openapi({ description: 'The pairing code (case-insensitive).' })
            }), example: { code: 'K7WQ2MZP' } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Paired.',
        content: {
          'application/json': { schema: z.object({
              token: z.string().openapi({ description: 'Signed session token, valid for SESSION_DAYS.' }).optional(),
              user: SessionUser.optional()
            }) }
        }
      },
      '400': {
        description: 'Code unknown, already used, expired, or the account behind it is gone or disabled (deliberately the same message for all of these).',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'invalid or expired code', code: 'pair-invalid' } }
        }
      }
    }
} satisfies RouteConfig;
