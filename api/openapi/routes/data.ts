/* Fork: the "data" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { representative } from '../validate.ts';
import { ErrorBody, LiveSession, State } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const getData = {
  method: 'get',
  path: '/api/data',
  operationId: 'getData',
  tags: ['data'],
  summary: 'Pull the account\'s app state',
  description: 'Returns the caller\'s entire app state as one JSON blob, or `{"state": null}` if nothing has been synced yet, together with `rev`, the server\'s revision of that document (0 when there is none). A client keeps the `rev` it last read or wrote and sends it back as `baseRev` on the next push, which lets the server refuse a write over a document the client never saw (see the 409 on PUT).',
  responses: {
      '503': R.err('The profile\'s state file exists but cannot be read right now (`state unreadable`): an empty profile is never answered in its place.'),
      '200': {
        description: 'The stored state, or null, and its revision.',
        content: {
          'application/json': { schema: z.object({
              state: State.nullable().optional(),
              rev: z.number().int().openapi({ description: 'Server revision of the stored document; 0 when there is none.' }).optional()
            }) }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const putData = {
  method: 'put',
  path: '/api/data',
  operationId: 'putData',
  tags: ['data'],
  summary: 'Push the account\'s app state',
  description: `Replaces the stored state wholesale (atomic write; there is no merge on the
server). The \`active\` field (an in-progress workout) is stripped before
saving: a running session belongs to the device running it. Body limit 5 MiB.

With \`baseRev\` the write is conditional: it goes through only when \`baseRev\`
equals the document's current revision, and answers 409 with the current
document otherwise; the client merges the two and pushes again with the
revision it was given. Without \`baseRev\` the write is unconditional (clients
from before revisions, and deliberate replaces such as a backup import). The
server stamps the new revision into the document as \`_rev\`; a \`_rev\` sent by
the client is ignored.

The records of removals (\`deleted\`) and of edits (\`edited\`) never shrink: the
stored ones are joined into the write (a reset keeps its own). A writer that does
not stamp its own changes (no \`stamped: true\`; an API script, an older app) and
sends the current \`baseRev\` gets them stamped by the server, at the server's time:
every entry it removed (a workout, routine, custom exercise, weigh-in, card,
profile or favourite), every setting and plan day it changed (\`queue\`,
\`week.<day>\`, …), and every entry it edited (\`_ts\`, per field \`_f\`). That keeps a
planner's new week, or a routine it removed, from being undone by a phone that
reconnects later with an older change. A setting, plan day or entry field whose
stored stamp (\`edited\`, \`_f\`) is later than the one the writer sends back keeps the
stored value: the writer never saw that change, so send back the \`edited\` and \`_f\`
you read. A writer that sends no \`edited\` at all is not held to it. An entry the document holds while a
removal on record says it was deleted after its last edit is kept and marked as
added back.

Such a writer also cannot delete what it does not know: a field of the stored
document, of a stored routine, workout, custom exercise, card or profile, of a
routine's exercise, or of a logged exercise or set that its copy leaves out comes
back from the stored copy (an older app rebuilds an exercise from the fields it
knows, which dropped pyramid sets made on an updated device). Only the fields
v1.3.9 itself removes (a superset link, a note, a cleared set value, …) can be
removed this way. Send \`stamped: true\` to remove anything else.

Every accepted write also starts the grace period of each stored file (tag \`media\`)
the new state no longer references, and stops it for each one it references again.
That bookkeeping never changes the answer.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              state: State,
              // Documented, not enforced: a baseRev of another type never matches and is a 409, by design.
              baseRev: representative(z.number().int().nullable().openapi({
                description: 'The revision this client last read or wrote. Omit or null for an unconditional overwrite.'
              })).optional(),
              baseWid: z.string().openapi({
                description: 'The write id (`_wid`) of the document this client last read or wrote. With `baseRev`, a write over a different document at the same revision (the data directory went back in time and the number was reached again) answers 409.'
              }).optional(),
              stamped: z.boolean().openapi({
                description: 'True when the client stamps its own changes in `deleted`, `edited` and each entry\'s `_ts`/`_f`, as the app does. Omit it to have the server stamp what changed against the stored document.'
              }).optional()
            }) }
        }
      }
    },
  responses: {
      '503': R.err('The profile\'s state file exists but cannot be read right now (`state unreadable`): nothing is written over it.'),
      '200': {
        description: 'Saved.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              ts: z.number().nullable().openapi({ description: 'Echo of the pushed state\'s `_ts`, if present.' }).optional(),
              rev: z.number().int().openapi({
                description: 'The revision the write produced. For a writer that does not stamp, when the server put back something it left out or set back, the document is stored one revision further, so the writer\'s next check of the revision reads it again. `wid` is the stored document\'s either way.'
              }).optional(),
              wid: z.string().openapi({ description: 'The write id (`_wid`) of the stored document.' }).optional()
            }) }
        }
      },
      '400': {
        description: '`state` missing or not an object, `state` an array or an object with nothing of the profile in it (`_rev`/`_ts` do not count; both would empty the profile), or `workouts`/`routines` set to anything other than an array or null. Entries inside those two arrays that are not objects (`null`, numbers, nested arrays) are dropped before the write rather than refused, so a client with a damaged copy still syncs.',
        content: {
          'application/json': { schema: ErrorBody, examples: { missing: { value: { error: 'state required' } }, invalid: { value: { error: 'invalid state' } } } }
        }
      },
      '401': R.Unauthorized,
      '409': {
        description: '`baseRev` is not the current revision: another client wrote since this one last read. Carries the current document so the client can merge and retry.',
        content: {
          'application/json': { schema: z.object({
              error: z.literal('conflict').optional(),
              rev: z.number().int().optional(),
              state: State.nullable().optional()
            }) }
        }
      }
    }
} satisfies RouteConfig;

export const getDataRev = {
  method: 'get',
  path: '/api/data/rev',
  operationId: 'getDataRev',
  tags: ['data'],
  summary: 'Current revision of the caller\'s profile state',
  description: `The \`rev\` that \`GET /api/data\` would return, without the document. Signed-in clients poll
this while open and on every return to the foreground and fetch the document only when
the number changed.`,
  responses: {
      '200': {
        description: 'The current revision (0 when the profile has no state yet).',
        content: {
          'application/json': { schema: z.object({
              rev: z.number().int().optional(),
              wid: z.string().openapi({ description: 'The write id (`_wid`) of the stored document; absent before its first write.' }).optional()
            }) }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const getLive = {
  method: 'get',
  path: '/api/live',
  operationId: 'getLive',
  tags: ['data'],
  summary: 'The workout running now on any of the caller\'s devices',
  description: `The in-progress session (\`active\`), which \`PUT /api/data\` leaves out, kept on its own so a
workout started on one device can be carried on from another. \`at\` is the stamp of the
last write; \`active\` is null when none is running (or the last one was finished).`,
  responses: {
      '200': {
        description: 'The shared running workout.',
        content: {
          'application/json': { schema: LiveSession }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const putLive = {
  method: 'put',
  path: '/api/live',
  operationId: 'putLive',
  tags: ['data'],
  summary: 'Replace the shared running workout',
  description: `The newest stamp wins. A write whose \`at\` is not newer than the stored one is refused with
409 and the stored copy, which the device then takes as its own.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: LiveSession }
        }
      }
    },
  responses: {
      '200': {
        description: 'Stored.',
        content: {
          'application/json': { schema: z.object({
              at: z.number().optional()
            }) }
        }
      },
      '400': {
        description: 'A malformed body or a stamp too far in the future.'
      },
      '401': R.Unauthorized,
      '409': {
        description: 'A newer copy is stored; it is returned.',
        content: {
          'application/json': { schema: LiveSession }
        }
      }
    }
} satisfies RouteConfig;

export const nudgeCheck = {
  method: 'get',
  path: '/api/nudge-check',
  operationId: 'nudgeCheck',
  tags: ['data'],
  summary: 'Whether a day was trained or excused (the phone\'s background check)',
  description: `Asked by the phone app in the background before a missed-day nudge or a workout-day
reminder it scheduled on itself fires, so a day trained on another device is not
nudged. A few bytes instead of the whole document: \`done\` is true when a workout is
dated that day or the day carries a note; \`nudge\` is whether the server's copy of the
nudge rule would still nudge that day (false once it is done, or when the plan has no
session for it); \`rev\` is the profile's revision. Nothing of the workouts themselves.`,
  request: {
      query: z.object({
        date: z.string().openapi({ description: 'The day, YYYY-MM-DD, in the phone\'s own calendar.', format: 'date' })
      })
    },
  responses: {
      '200': {
        description: 'How that day stands.',
        content: {
          'application/json': { schema: z.object({
              date: z.string().openapi({ format: 'date' }).optional(),
              done: z.boolean().optional(),
              nudge: z.boolean().optional(),
              rev: z.number().int().optional()
            }), example: { date: '2026-09-14', done: true, nudge: false, rev: 7 } }
        }
      },
      '400': {
        description: '`date-invalid`: not a YYYY-MM-DD date.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'date must be YYYY-MM-DD', code: 'date-invalid' } }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;
