/* Fork: the "activity" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { Ok, Presence, Routine, Workout } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const postActivity = {
  method: 'post',
  path: '/api/activity',
  operationId: 'postActivity',
  tags: ['activity'],
  summary: 'Live-workout presence heartbeat',
  description: `The client pings this every ~20 s while a workout is on screen; the admin
dashboard reads who is training right now. Purely ephemeral, in-memory, never
persisted; entries expire 70 s after the last ping. \`{"active": false}\` is the
"left" signal: with \`reason\` \`navigated\` or \`closed\`, or with no reason, it
drops the caller's entry immediately. With \`reason: hidden\` (the page went to
the background) it marks the entry away instead, and the entry stops being
listed 45 s after that mark unless a heartbeat arrives first; a heartbeat
clears the mark. The 70 s expiry applies either way.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              active: z.boolean().openapi({ description: 'false ends the presence (see `reason`); true (with the fields below) updates it.' }).optional(),
              reason: z.enum(['navigated', 'closed', 'hidden']).openapi({
                description: 'Why the client sent `active: false`: `navigated` (an in-app route change), `closed` (the page is going away) or `hidden` (the page went to the background). `navigated` and `closed` drop the entry at once, as no reason does; `hidden` marks it away rather than dropping it. Ignored with `active: true`.'
              }).optional(),
              name: z.string().max(60).openapi({ description: 'Routine/workout name being trained.' }).optional(),
              exIdx: z.number().int().openapi({ description: 'Current exercise index (0-based).' }).optional(),
              exTotal: z.number().int().openapi({ description: 'Exercises in the workout.' }).optional(),
              setsDone: z.number().int().optional(),
              setsTotal: z.number().int().optional(),
              startedAt: z.number().openapi({ description: 'Workout start, ms since epoch (defaults to now).' }).optional()
            }), example: {
              active: true,
              name: 'Push Day',
              exIdx: 2,
              exTotal: 5,
              setsDone: 7,
              setsTotal: 16,
              startedAt: 1756500000000
            } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Presence updated.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;
