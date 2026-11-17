/* Fork: the "integrations" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, IntegrationConnection, IntegrationEvent, Ok } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const listIntegrations = {
  method: 'get',
  path: '/api/integrations',
  operationId: 'listIntegrations',
  tags: ['integrations'],
  summary: 'The integrations this server offers, and the caller\'s connections',
  description: `\`providers\` is what the admin switched on with \`INTEGRATIONS\` (empty when it is unset,
the default), \`connections\` the caller's own. A connection never carries a secret or
its full URL: \`info.url\` is masked. \`status\` is \`connected\`, \`paused\` or \`attention\`
(the last deliveries failed for good, or its sealed settings no longer open because
\`./data/secret\` changed); \`lastError\` says why in plain words.`,
  responses: {
      '200': {
        description: 'Providers and connections.',
        content: {
          'application/json': { schema: z.object({
              providers: z.array(z.object({
                id: z.string().openapi({ example: 'webhook' }).optional(),
                kind: z.enum(['webhook', 'apikey', 'oauth']).optional(),
                category: z.string().openapi({ example: 'automation' }).optional(),
                events: z.array(IntegrationEvent).optional(),
                max: z.number().int().openapi({ description: 'Connections of this kind a profile may have.' }).optional(),
                lan: z.boolean().openapi({
                  description: 'Present (true) when INTEGRATIONS_ALLOW_LAN=1: home-network receivers are allowed.'
                }).optional()
              })).optional(),
              connections: z.array(IntegrationConnection).optional()
            }) }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const connectIntegration = {
  method: 'post',
  path: '/api/integrations/connect',
  operationId: 'connectIntegration',
  tags: ['integrations'],
  summary: 'Add a connection (a webhook)',
  description: `For \`provider: webhook\`: \`url\` (https, or http to a home-network address when
\`INTEGRATIONS_ALLOW_LAN=1\`; never loopback, link-local or, by default, a private
address), an optional \`label\` (60 characters) and \`events\` (at least one; default
\`workout.finished\`). At most 10 webhooks a profile. The answer's \`reveal.secret\` is
the signing secret, **shown this once**: the server keeps it sealed and never sends
it again. Payloads and the signature: docs/INTEGRATIONS.md.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              provider: z.string().openapi({ example: 'webhook' }),
              url: z.string().max(2048).openapi({ example: 'https://ha.example.com/api/webhook/opengym-7f3a' }),
              label: z.string().max(60).optional(),
              events: z.array(IntegrationEvent).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Connected.',
        content: {
          'application/json': { schema: z.object({
              connection: IntegrationConnection.optional(),
              reveal: z.object({
                secret: z.string().openapi({ example: 'ogwh_EXAMPLE-not-a-real-secret-0000000' }).optional()
              }).optional()
            }) }
        }
      },
      '400': {
        description: 'The URL or the events were refused (`code`: `url`, `events`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '401': R.Unauthorized,
      '404': R.IntegrationsOff,
      '409': {
        description: 'Too many connections of this kind (`code`: `too-many`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': R.IntegrationsSlowDown
    }
} satisfies RouteConfig;

export const updateIntegration = {
  method: 'post',
  path: '/api/integrations/update',
  operationId: 'updateIntegration',
  tags: ['integrations'],
  summary: 'Rename a connection, change its events, pause or resume it',
  description: 'A new URL is a new webhook (and a new secret): disconnect and connect again. `paused: false` also clears a "Needs attention".',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string(),
              label: z.string().max(60).optional(),
              events: z.array(IntegrationEvent).optional(),
              paused: z.boolean().optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The connection as it is now.',
        content: {
          'application/json': { schema: z.object({
              connection: IntegrationConnection.optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '404': R.IntegrationsOff,
      '429': R.IntegrationsSlowDown
    }
} satisfies RouteConfig;

export const disconnectIntegration = {
  method: 'post',
  path: '/api/integrations/disconnect',
  operationId: 'disconnectIntegration',
  tags: ['integrations'],
  summary: 'Remove a connection',
  description: 'Forgets the connection, its sealed secrets, its log and anything still waiting to be sent to it. Nothing is called on the far side.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Gone.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized,
      '404': R.IntegrationsOff
    }
} satisfies RouteConfig;

export const testIntegration = {
  method: 'post',
  path: '/api/integrations/test',
  operationId: 'testIntegration',
  tags: ['integrations'],
  summary: 'Send a test event now',
  description: 'Delivers a made-up event of `type` (default: the connection\'s first event) straight away, marked `"test": true`, and answers how it went. Six a minute per profile.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string(),
              type: IntegrationEvent.optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The receiver\'s answer (`ok` false with `msg` when it failed).',
        content: {
          'application/json': { schema: z.object({
              ok: z.boolean().optional(),
              status: z.number().int().nullable().openapi({ description: 'The receiver\'s HTTP status.' }).optional(),
              ms: z.number().int().nullable().optional(),
              msg: z.string().nullable().optional(),
              connection: IntegrationConnection.optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '404': R.IntegrationsOff,
      '429': R.IntegrationsSlowDown
    }
} satisfies RouteConfig;

export const retryIntegration = {
  method: 'post',
  path: '/api/integrations/retry',
  operationId: 'retryIntegration',
  tags: ['integrations'],
  summary: 'Send the failed deliveries again',
  description: 'Deliveries the server gave up on (after eight attempts over about an hour, or at once for a refusal like a 404) go back into the queue from attempt one and are sent now.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'How many went back, and the connection afterwards.',
        content: {
          'application/json': { schema: z.object({
              requeued: z.number().int().optional(),
              connection: IntegrationConnection.optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '404': R.IntegrationsOff,
      '429': R.IntegrationsSlowDown
    }
} satisfies RouteConfig;

export const integrationsOauthStart = {
  method: 'get',
  path: '/api/integrations/oauth/start',
  operationId: 'integrationsOauthStart',
  tags: ['integrations'],
  summary: 'Start a sign-in with an OAuth service (Strava)',
  description: 'A browser navigation, not a fetch. Redirects to the service\'s consent page with a state bound to the signed-in profile (valid ten minutes, once), or back to Settings → Integrations with `error` when that is not possible.',
  request: {
      query: z.object({
        provider: z.enum(['strava'])
      })
    },
  responses: {
      '302': {
        description: 'To the service'
      }
    }
} satisfies RouteConfig;

export const integrationsOauthCallback = {
  method: 'get',
  path: '/api/integrations/oauth/callback',
  operationId: 'integrationsOauthCallback',
  tags: ['integrations'],
  summary: 'Where the OAuth service sends the person back',
  description: 'Checks the state (its profile, its time, used once; a browser that sends its session cookie has to be that profile), exchanges the code for tokens (sealed, never shown) and stores the connection, replacing an earlier one of the same service. Redirects to Settings → Integrations with `intg` and `connected=1`, or `error`.',
  request: {
      query: z.object({
        state: z.string().optional(),
        code: z.string().optional(),
        scope: z.string().optional(),
        error: z.string().optional()
      })
    },
  responses: {
      '302': {
        description: 'Back to the app.'
      }
    }
} satisfies RouteConfig;

export const integrationLog = {
  method: 'get',
  path: '/api/integrations/log',
  operationId: 'integrationLog',
  tags: ['integrations'],
  summary: 'A connection\'s activity log',
  description: 'The last 50 deliveries and tests, newest first, plus what is queued or failed.',
  request: {
      query: z.object({
        id: z.string()
      })
    },
  responses: {
      '200': {
        description: 'The log.',
        content: {
          'application/json': { schema: z.object({
              log: z.array(z.object({
                at: z.number().int().openapi({ description: 'Epoch ms.' }).optional(),
                ev: z.string().openapi({ description: 'An event type, `test` or `connected`.' }).optional(),
                ok: z.boolean().optional(),
                status: z.number().int().optional(),
                ms: z.number().int().optional(),
                msg: z.string().max(160).optional()
              })).max(50).optional(),
              queued: z.number().int().optional(),
              failed: z.number().int().optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '404': R.IntegrationsOff
    }
} satisfies RouteConfig;
