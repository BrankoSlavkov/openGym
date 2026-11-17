/* Fork: the "tokens" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ApiToken, CalendarFeed, ErrorBody, TokenScopes } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const tokensList = {
  method: 'get',
  path: '/api/tokens',
  operationId: 'tokensList',
  tags: ['tokens'],
  summary: 'The profile\'s scoped tokens',
  description: 'Never the token itself, only a few characters of it (`hint`) to tell them apart.',
  responses: {
      '200': {
        description: 'The tokens, what a token can hold, and whether /mcp is served here.',
        content: {
          'application/json': { schema: z.object({
              tokens: z.array(ApiToken).optional(),
              categories: z.array(z.object({
                id: z.string().optional(),
                max: z.string().optional()
              })).optional(),
              days: z.array(z.number().int()).optional(),
              defaultDays: z.number().int().optional(),
              mcp: z.boolean().optional()
            }) }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const tokensCreate = {
  method: 'post',
  path: '/api/tokens',
  operationId: 'tokensCreate',
  tags: ['tokens'],
  summary: 'Make a scoped token',
  description: 'The answer is the only time the token is shown. At most 10 per profile; a token that may see nothing is refused. `days` is one of 7, 30, 90, 365 or 0 (until revoked).',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              name: z.string().max(40).optional(),
              scopes: TokenScopes.optional(),
              days: z.number().int().optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The new token (once), its id and the updated list.',
        content: {
          'application/json': { schema: z.object({
              token: z.string().openapi({ example: 'ogt_...' }).optional(),
              id: z.string().optional(),
              tokens: z.array(ApiToken).optional()
            }) }
        }
      },
      '400': {
        description: 'Nothing granted (`nothing-granted`) or bad `days` (`bad-days`).'
      },
      '401': R.Unauthorized,
      '409': {
        description: 'Ten tokens already (`too-many`).'
      }
    }
} satisfies RouteConfig;

export const tokensRevoke = {
  method: 'post',
  path: '/api/tokens/revoke',
  operationId: 'tokensRevoke',
  tags: ['tokens'],
  summary: 'Revoke one token, or every token',
  description: 'Without an `id`, every token of the profile. It stops working on the next request.',
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              id: z.string().optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'How many went, and the list.',
        content: {
          'application/json': { schema: z.object({
              ok: z.boolean().optional(),
              revoked: z.number().int().optional(),
              tokens: z.array(ApiToken).optional()
            }) }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const calendarGet = {
  method: 'get',
  path: '/api/calendar',
  operationId: 'calendarGet',
  tags: ['tokens'],
  summary: 'The profile\'s calendar feed, if it has one',
  description: 'The private ICS address (docs/CALENDAR.md), whether it shows finished workouts, and when a calendar last fetched it.',
  responses: {
      '200': {
        description: 'The feed, or `on false`.',
        content: {
          'application/json': { schema: CalendarFeed }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const calendarSet = {
  method: 'post',
  path: '/api/calendar',
  operationId: 'calendarSet',
  tags: ['tokens'],
  summary: 'Turn the calendar feed on, change what it shows, or make a new address',
  description: 'With a feed already on, `done` changes what it shows and the address stays. `renew` (or no feed yet) makes a new address and ends the old one.',
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              done: z.boolean().openapi({ description: 'Also show finished workouts' }).optional(),
              renew: z.boolean().optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The feed.',
        content: {
          'application/json': { schema: CalendarFeed }
        }
      },
      '401': R.Unauthorized,
      '409': {
        description: 'The profile has as many tokens as it may hold.'
      }
    }
} satisfies RouteConfig;

export const calendarRevoke = {
  method: 'post',
  path: '/api/calendar/revoke',
  operationId: 'calendarRevoke',
  tags: ['tokens'],
  summary: 'Turn the calendar feed off',
  description: 'Its address stops working at once.',
  responses: {
      '200': {
        description: 'Off.',
        content: {
          'application/json': { schema: CalendarFeed }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const calendarFeed = {
  method: 'get',
  path: '/api/calendar/{token}.ics',
  operationId: 'calendarFeed',
  tags: ['tokens'],
  summary: 'The calendar feed (iCalendar)',
  description: 'For a calendar app to subscribe to. The token in the path is the feed\'s own; no other token, cookie or header is read. Planned sessions as all-day events from a week back to eight weeks ahead, and with `done` the workouts of the last 90 days.',
  security: [],
  request: {
      params: z.object({
        token: z.string().regex(new RegExp('^ogt_[A-Za-z0-9_-]{43}$'))
      })
    },
  responses: {
      '200': {
        description: 'The feed.',
        content: {
          'text/calendar': { schema: z.string() }
        }
      },
      '404': {
        description: 'No such feed (never was'
      },
      '429': {
        description: 'Fetched too often.'
      }
    }
} satisfies RouteConfig;

export const tokenMe = {
  method: 'get',
  path: '/api/token/me',
  operationId: 'tokenMe',
  tags: ['tokens'],
  summary: 'Whose token this is and what it may do',
  security: [{ tokenAuth: [] }],
  responses: {
      '200': {
        description: 'The profile (id, name) and the token (id, name, scopes, expiry).',
        content: {
          'application/json': { schema: z.object({
              user: z.object({
                id: z.string().optional(),
                name: z.string().optional()
              }).optional(),
              token: z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                scopes: TokenScopes.optional(),
                exp: z.number().int().nullable().optional()
              }).optional()
            }) }
        }
      },
      '401': R.TokenRefused,
      '429': {
        description: 'Too many reads with this token this minute (`TOKEN_READS_PER_MIN`'
      }
    }
} satisfies RouteConfig;

export const tokenData = {
  method: 'get',
  path: '/api/token/data',
  operationId: 'tokenData',
  tags: ['tokens'],
  summary: 'The part of the profile the token may read',
  description: 'The document\'s keys of every category the token holds at `view` or more, plus the profile\'s settings (units, week start, progression defaults). Never photos, the Coach\'s conversation, the live workout or linked services. Each category read is noted once a day in the profile\'s sharing log.',
  security: [{ tokenAuth: [] }],
  responses: {
      '200': {
        description: 'The scoped document (null before the profile first synced) and its revision.',
        content: {
          'application/json': { schema: z.object({
              state: z.record(z.string(), z.unknown()).nullable().optional(),
              rev: z.number().int().optional(),
              wid: z.string().optional()
            }) }
        }
      },
      '401': R.TokenRefused,
      '429': {
        description: 'Too many reads with this token this minute.'
      }
    }
} satisfies RouteConfig;

export const tokenDataPut = {
  method: 'put',
  path: '/api/token/data',
  operationId: 'tokenDataPut',
  tags: ['tokens'],
  summary: 'Change what the token may change',
  description: 'Over the exact revision read (`baseRev`, required: no blind writes). Every key sent that the token holds at `apply` is written; a key it may only see has to come back unchanged and is ignored; any other key is a 403 `scope`. The rest of the profile stays as stored, and the change is stamped like any API client\'s (sync-stamps.js), so every device merges it. A changed revision is a 409 with the current scoped document. Writes are counted per token (`TOKEN_WRITES_PER_HOUR`, 60).',
  security: [{ tokenAuth: [] }],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              state: z.record(z.string(), z.unknown()),
              baseRev: z.number().int(),
              baseWid: z.string().optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Saved (or `unchanged`), with the new revision.',
        content: {
          'application/json': { schema: z.object({
              ok: z.boolean().optional(),
              unchanged: z.boolean().optional(),
              rev: z.number().int().optional(),
              wid: z.string().optional(),
              ts: z.number().nullable().openapi({ description: 'The saved document\'s `_ts`.' }).optional()
            }) }
        }
      },
      '400': {
        description: 'No state, no `baseRev` (`base-rev`), or an invalid document.'
      },
      '401': R.TokenRefused,
      '403': {
        description: 'A key outside what the token may change (`scope`).'
      },
      '409': {
        description: 'The revision moved (body has `state` and `rev`), or the profile never synced (`not-synced`).',
        content: { 'application/json': { schema: ErrorBody.extend({
          state: z.record(z.string(), z.unknown()).openapi({ description: 'The current document, as this token may see it.' }).optional(),
          wid: z.string().optional()
        }) } }
      },
      '429': {
        description: 'Too many writes with this token this hour.'
      }
    }
} satisfies RouteConfig;

export const tokenDataRev = {
  method: 'get',
  path: '/api/token/data/rev',
  operationId: 'tokenDataRev',
  tags: ['tokens'],
  summary: 'Just the revision, to read the document only when it moved',
  security: [{ tokenAuth: [] }],
  responses: {
      '200': {
        description: 'The revision and write id.',
        content: {
          'application/json': { schema: z.object({
              rev: z.number().int().optional(),
              wid: z.string().optional()
            }) }
        }
      },
      '401': R.TokenRefused
    }
} satisfies RouteConfig;
