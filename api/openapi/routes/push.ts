/* Fork: the "push" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { representative } from '../validate.ts';
import { ErrorBody, Ok, PushSubscription } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const pushPublicKey = {
  method: 'get',
  path: '/api/push/public-key',
  operationId: 'pushPublicKey',
  tags: ['push'],
  summary: 'VAPID public key',
  description: 'The instance\'s Web-Push application server key (generated once at first boot), for `PushManager.subscribe({applicationServerKey})`. Public.',
  security: [],
  responses: {
      '200': {
        description: 'The key.',
        content: {
          'application/json': { schema: z.object({
              key: z.string().openapi({ description: 'base64url-encoded P-256 public key.' }).optional()
            }) }
        }
      }
    }
} satisfies RouteConfig;

export const pushSubscribe = {
  method: 'post',
  path: '/api/push/subscribe',
  operationId: 'pushSubscribe',
  tags: ['push'],
  summary: 'Register a Web-Push subscription',
  description: `Stores the browser's \`PushSubscription\` for this account. Only \`endpoint\` and
the two protocol keys are kept. The endpoint must be a public \`https://\` URL;
private/loopback/link-local addresses are refused (here and again at send
time, against DNS rebinding). At most 20 subscriptions per user; the oldest
are dropped first. Re-subscribing an existing endpoint replaces it and keeps
its original \`created\`. The client re-sends its subscription on every
signed-in boot, so a row the instance lost comes back on its own.
An endpoint stored for another account moves to the caller only when the
request carries that subscription's own keys (the same browser, signed into
another account); otherwise it is a 409 and the row stays where it was.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              subscription: PushSubscription,
              // Documented, not enforced: anything else is ignored, not refused (openapi/validate.ts).
              deviceId: representative(z.string().regex(new RegExp('^[A-Za-z0-9_-]{8,64}$')).openapi({
                description: 'A token the browser made up for itself (stored in its localStorage), so rest-timer pushes can be aimed at the device that started the rest. Optional; anything that is not a short token is ignored, and a re-send of an endpoint without one keeps the id its row already has.'
              })).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Stored.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '400': {
        description: 'Malformed subscription, or an endpoint that isn\'t acceptable.',
        content: {
          'application/json': { schema: ErrorBody, examples: {
              malformed: { value: { error: 'invalid subscription' } },
              private: { value: { error: 'endpoint must not point at a private address' } }
            } }
        }
      },
      '401': R.Unauthorized,
      '409': {
        description: 'The endpoint is stored for another account and the request does not carry that subscription\'s keys.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'this subscription belongs to another account' } }
        }
      }
    }
} satisfies RouteConfig;

export const pushStatus = {
  method: 'get',
  path: '/api/push/status',
  operationId: 'pushStatus',
  tags: ['push'],
  summary: 'Does the server hold this subscription?',
  description: 'Whether the caller\'s account has a stored subscription with exactly this `endpoint`. The browser\'s `PushManager.getSubscription()` says nothing about the server\'s side: a row pruned after a dead send (404/410/403) leaves the browser subscribed to nowhere. So the client asks here before showing the notifications switch as on, and re-registers when the answer is no. A stored subscription also names the `deviceId` it is stored with, and the client re-registers when that is not its own: a row stored without one (from before device ids) sends that device\'s rest-timer alerts to every subscription of the account.',
  request: {
      query: z.object({
        endpoint: z.string().openapi({ format: 'uri' })
      })
    },
  responses: {
      '200': {
        description: 'The answer.',
        content: {
          'application/json': { schema: z.object({
              subscribed: z.boolean(),
              deviceId: z.string().nullable().openapi({
                description: 'Present when `subscribed` is true: the device id the subscription is stored with, `null` when it has none.'
              }).optional()
            }), examples: {
              stored: { value: { subscribed: true, deviceId: '3f9c1d2e7b0a4c6d9e8f1a2b3c4d5e6f' } },
              storedWithoutDevice: { value: { subscribed: true, deviceId: null } },
              notStored: { value: { subscribed: false } }
            } }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const pushUnsubscribe = {
  method: 'post',
  path: '/api/push/unsubscribe',
  operationId: 'pushUnsubscribe',
  tags: ['push'],
  summary: 'Remove a Web-Push subscription',
  description: 'Removes the caller\'s subscription with the given endpoint. Idempotent.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              endpoint: z.string().openapi({ format: 'uri' })
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Removed (or was never there).',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const pushTest = {
  method: 'post',
  path: '/api/push/test',
  operationId: 'pushTest',
  tags: ['push'],
  summary: 'Send a test notification',
  description: 'Sends a test push to all of the caller\'s subscriptions (localized with the `lang` in their synced state). Returns 200 even if delivery to individual endpoints fails; dead endpoints (404/410, and 403 for a subscription made against a VAPID key the instance no longer has) are pruned as a side effect.',
  responses: {
      '429': R.err('Too many test pushes (`locked`, with `retryAfter` and the Retry-After header).'),
      '200': {
        description: 'Sends attempted.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const pushRestTimer = {
  method: 'post',
  path: '/api/push/rest-timer',
  operationId: 'pushRestTimer',
  tags: ['push'],
  summary: 'Schedule a server-side rest-timer push',
  description: `Schedules one push after \`seconds\` (a number or numeric string ≥ 1, clamped to
3600). One pending timer per
device, keyed by \`deviceId\`, the same token the subscription was registered with; a
new call from the same device replaces it, and the push goes only to that
device's subscriptions. Without a \`deviceId\` there is one timer per account
and the push goes to every subscription, as before. The client schedules this
on rest start/extend and cancels on skip or on-screen completion. The push
only actually fires when the tab was backgrounded/suspended and never got to
cancel it. Timers live in memory: an API restart drops them.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              seconds: z.union([z.number().min(1).max(3600), z.string()]).openapi({ description: 'A number, or a numeric string, ≥ 1; anything else is a 400 (`seconds required`).' }),
              deviceId: z.string().regex(new RegExp('^[A-Za-z0-9_-]{8,64}$')).openapi({ description: 'The browser\'s own token, see `POST /api/push/subscribe`. Optional.' }).optional(),
              next: z.string().max(120).openapi({
                description: 'The set waiting after the rest, in the person\'s language ("Bench press, 80 kg × 8"). It becomes the push\'s body, one line of plain text cut at 120 characters. Optional; without it the body is the general "Time for your next set."'
              }).optional()
            }), example: { seconds: 90, deviceId: '3f9c1d2e7b0a4c6d9e8f1a2b3c4d5e6f', next: 'Bench press, 80 kg × 8' } }
        }
      }
    },
  responses: {
      '429': R.err('Too many rest timers (`locked`, with `retryAfter` and the Retry-After header).'),
      '200': {
        description: 'Timer scheduled.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '400': {
        description: '`seconds` missing, not numeric, or below 1. Nothing is scheduled.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'seconds required' } }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const pushRestTimerCancel = {
  method: 'post',
  path: '/api/push/rest-timer/cancel',
  operationId: 'pushRestTimerCancel',
  tags: ['push'],
  summary: 'Cancel the pending rest-timer push',
  description: 'Cancels the caller\'s scheduled rest-timer push, if any. With a `deviceId` only that device\'s timer; without one, every pending timer of the account. Idempotent.',
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              deviceId: z.string().regex(new RegExp('^[A-Za-z0-9_-]{8,64}$')).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Cancelled (or nothing was pending).',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;
