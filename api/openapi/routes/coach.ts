/* Fork: the "coach" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { CoachCohort, CoachIntake, CoachStatus, Ok } from '../schemas.ts';
import * as R from '../responses.ts';
import { representative } from '../validate.ts';

void z;

export const getCoachDisclosure = {
  method: 'get',
  path: '/api/coach/disclosure',
  operationId: 'getCoachDisclosure',
  tags: ['coach'],
  summary: 'What the consent screen must say',
  description: `The categories of data a Coach job would send, and the provider it would go to,
read straight from the module that builds the payload, so the consent screen
cannot drift from what actually leaves the box.

Needs a session but *not* a connected Coach: the screen that collects consent
runs before there is anything to consent to.`,
  responses: {
      '200': {
        description: 'The disclosure.',
        content: {
          'application/json': { schema: z.object({
              provider: z.string().openapi({ description: 'Provider id, e.g. `anthropic`.' }).optional(),
              providerLabel: z.string().optional(),
              host: z.string().nullable().openapi({
                description: 'Host the provider\'s requests go to (an HTTPS provider\'s base URL, host and port only), or null for a runtime provider. The app asks the user once per provider and host before the first request.'
              }).optional(),
              categories: z.array(z.enum(['plan', 'training', 'bodyweight', 'profile', 'prefs'])).openapi({ description: 'The data categories a job may send. Nothing else ever is.' }).optional(),
              version: z.number().int().openapi({ description: 'Disclosure version the consent is recorded against.' }).optional()
            }), example: {
              provider: 'anthropic',
              providerLabel: 'Claude',
              host: 'api.anthropic.com',
              categories: ['plan', 'training', 'bodyweight', 'profile', 'prefs'],
              version: 1
            } }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const getCoachStatus = {
  method: 'get',
  path: '/api/coach/status',
  operationId: 'getCoachStatus',
  tags: ['coach'],
  summary: 'The running job, the waiting proposal and today\'s budget',
  description: `What the Coach screen polls. Also the only place a proposal past its 14-day
expiry is retired. A phone that stays closed never polls, so nothing else
would notice.

On an instance with no Coach the answer is \`503\` with \`code: off\`, on every
version. The app does not poll there: the \`coach\` key of \`GET /api/config\`
already says there is none.`,
  responses: {
      '200': {
        description: 'This profile\'s Coach state.',
        content: {
          'application/json': { schema: CoachStatus }
        }
      },
      '401': R.Unauthorized,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const postCoachPlan = {
  method: 'post',
  path: '/api/coach/plan',
  operationId: 'postCoachPlan',
  tags: ['coach'],
  summary: 'Ask for a training plan',
  description: `Queues a \`create\` job. With \`intake\` it builds a plan from the answers given on
the intake screen; with \`refine\` it reworks the proposal already waiting, in the
words of the person reading it. The answer is 202 and a job id; the result
arrives through \`GET /api/coach/status\`.`,
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              intake: CoachIntake.optional(),
              refine: z.string().max(4000).openapi({
                description: `A change asked for in plain words, applied to the proposal now waiting. Cut to
the instance's \`maxMessageLen\` (1000 unless the admin changed it; 200–4000).`
              }).optional(),
              lang: z.string().regex(new RegExp('^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$')).openapi({
                description: `The language the app is showing, which the Coach writes in. Absent or not a
language tag, the profile's stored \`lang\` is used.`
              }).optional()
            }), example: {
              intake: { goal: 'muscle', experience: 'novice', daysPerWeek: 3, equipment: ['dumbbell', 'barbell'] }
            } }
        }
      }
    },
  responses: {
      '202': R.CoachJobQueued,
      '401': R.Unauthorized,
      '403': R.CoachRefused,
      '409': R.CoachRefused,
      '429': R.CoachRefused,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const postCoachReview = {
  method: 'post',
  path: '/api/coach/review',
  operationId: 'postCoachReview',
  tags: ['coach'],
  summary: 'Ask for a review of the training since the last one',
  description: `Queues a \`review\` job, the same job the weekly cadence queues on its own. The
answer is either a change-set to accept or reject, or "nothing to change" with
the reason, both delivered through \`GET /api/coach/status\`.`,
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              note: z.string().max(4000).openapi({
                description: `Anything the profile wants the Coach to know this time round. Cut to the
instance's \`maxMessageLen\` (1000 unless the admin changed it; 200–4000).`
              }).optional(),
              vitals: representative(z.record(z.string(), z.unknown()).nullable()).openapi({ description: 'Device health summary shared for this request only; ignored if it is not an object.' }).optional(),
              lang: z.string().regex(new RegExp('^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$')).openapi({
                description: `The language the app is showing, which the Coach writes in. Absent or not a
language tag, the profile's stored \`lang\` is used.`
              }).optional()
            }) }
        }
      }
    },
  responses: {
      '202': R.CoachJobQueued,
      '401': R.Unauthorized,
      '403': R.CoachRefused,
      '409': R.CoachRefused,
      '429': R.CoachRefused,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const postCoachAsk = {
  method: 'post',
  path: '/api/coach/ask',
  operationId: 'postCoachAsk',
  tags: ['coach'],
  summary: 'Ask the Coach a question',
  description: `Queues an \`ask\` job: a question from the chat, answered in plain text. It changes
nothing; the answer arrives as a pending proposal of kind \`ask\` with an \`answer\`
string, which the client writes into the chat and resolves. The running session,
which the server never holds, may ride along as \`today\`; the payload builder bounds
it like a logged workout.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              text: z.string().openapi({ description: 'The question. Cut at the instance\'s message length.' }),
              today: z.record(z.string(), z.unknown()).openapi({ description: 'The session running on the device (`entries` with their sets), or absent.' }).optional(),
              vitals: representative(z.record(z.string(), z.unknown()).nullable()).openapi({ description: 'Device health summary shared for this request only; ignored if it is not an object.' }).optional(),
              routines: representative(z.array(z.record(z.string(), z.unknown())).nullable()).openapi({ description: 'Matching routine-library candidates. The server retains at most eight.' }).optional(),
              lang: z.string().regex(new RegExp('^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$')).openapi({ description: 'The language the app is showing, which the Coach answers in.' }).optional()
            }) }
        }
      }
    },
  responses: {
      '202': R.CoachJobQueued,
      '400': {
        description: 'No question in the body (`code` is `invalid`).'
      },
      '401': R.Unauthorized,
      '403': R.CoachRefused,
      '409': R.CoachRefused,
      '429': R.CoachRefused,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const postCoachAdapt = {
  method: 'post',
  path: '/api/coach/adapt',
  operationId: 'postCoachAdapt',
  tags: ['coach'],
  summary: 'Ask the Coach about an exercise mid-workout',
  description: `Queues an \`adapt\` job: one exercise of the workout running on the device, and why it
needs a rethink (pain, a busy rack, short on time, feeling great, tired). The answer is a
pending proposal of kind \`adapt\` with up to six \`changes\` to the unfinished part of that
session (swap, sets, reps, weight, add, skip, move, rest), each naming the exercise by its
index in \`today\`. Logged sets are never changed. The client applies the ticked ones to its
own running session and resolves the proposal; the server never holds the session.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              today: z.record(z.string(), z.unknown()).openapi({ description: 'The session running on the device (`entries` with their sets).' }),
              entry: z.number().int().min(0).openapi({ description: 'The index in `today.entries` of the exercise asked about.' }),
              reason: z.enum(['pain', 'busy', 'short', 'great', 'tired', 'other']).optional(),
              text: z.string().openapi({ description: 'What the lifter typed, optional. Cut at the instance\'s message length.' }).optional(),
              activeId: z.string().openapi({ description: 'The running session\'s id, handed back on the proposal.' }).optional(),
              lang: z.string().regex(new RegExp('^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$')).openapi({ description: 'The language the app is showing, which the Coach answers in.' }).optional()
            }) }
        }
      }
    },
  responses: {
      '202': R.CoachJobQueued,
      '400': {
        description: 'No running workout, or no exercise of it named (`code` is `invalid`).'
      },
      '401': R.Unauthorized,
      '403': R.CoachRefused,
      '409': R.CoachRefused,
      '429': R.CoachRefused,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const postCoachDebrief = {
  method: 'post',
  path: '/api/coach/debrief',
  operationId: 'postCoachDebrief',
  tags: ['coach'],
  summary: 'Ask for a read of one session',
  description: `Queues a \`debrief\` job: one workout, read closely. It changes nothing; the card
it produces is kept in the profile's log. With no \`workoutId\` the most recent
session is read.`,
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              workoutId: z.string().max(40).nullable().openapi({ description: 'The workout to read; null or absent means the latest.' }).optional(),
              lang: z.string().regex(new RegExp('^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$')).openapi({
                description: `The language the app is showing, which the Coach writes in. Absent or not a
language tag, the profile's stored \`lang\` is used.`
              }).optional()
            }) }
        }
      }
    },
  responses: {
      '202': R.CoachJobQueued,
      '401': R.Unauthorized,
      '403': R.CoachRefused,
      '409': R.CoachRefused,
      '429': R.CoachRefused,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const postCoachResolve = {
  method: 'post',
  path: '/api/coach/pending/resolve',
  operationId: 'postCoachResolve',
  tags: ['coach'],
  summary: 'Apply or discard the waiting proposal',
  description: `The client applies the accepted changes to its own state and syncs them through
\`PUT /api/data\`; this only records the decision and clears the proposal. Sending
it when nothing is waiting is a no-op, not an error.`,
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              accepted: z.array(z.string()).openapi({ description: 'Ids of the changes the person kept.' }).optional(),
              rejected: z.array(z.string()).openapi({ description: 'Ids of the changes they turned down.' }).optional(),
              dismissed: z.boolean().openapi({ description: 'True when the whole proposal was thrown away unread.' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Recorded; the proposal is cleared.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const getCoachCohort = {
  method: 'get',
  path: '/api/coach/cohort',
  operationId: 'getCoachCohort',
  tags: ['coach'],
  summary: 'How this profile sits against the others who opted in',
  description: `Medians only, and only when at least three profiles on the instance share. Nothing
at all for a profile that does not share itself, or on an instance where the admin
has not switched the comparison on. Each of those is a 200 saying which it is.`,
  responses: {
      '200': {
        description: 'The comparison, or the reason there isn\'t one.',
        content: {
          'application/json': { schema: CoachCohort }
        }
      },
      '401': R.Unauthorized,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const postCoachCohortShare = {
  method: 'post',
  path: '/api/coach/cohort/share',
  operationId: 'postCoachCohortShare',
  tags: ['coach'],
  summary: 'Opt this profile in or out of the comparison',
  description: 'Held server-side rather than in the synced state: this flag decides whether the profile\'s numbers reach other people, and a stale device syncing an older copy must not be able to turn it back on.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              share: z.boolean().optional()
            }), example: { share: true } }
        }
      }
    },
  responses: {
      '200': {
        description: 'The flag as it now stands.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              sharing: z.boolean().optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '503': R.CoachOff
    }
} satisfies RouteConfig;

export const getCoachAccount = {
  method: 'get',
  path: '/api/coach/account',
  operationId: 'getCoachAccount',
  tags: ['coach'],
  summary: 'Whose provider account this profile would spend',
  description: 'Its own route because both the Coach screen and the admin card have to state it, and neither should be inferring it from settings. In instance mode a personal credential binds to the first profile that spends it; every other profile is refused outright rather than warned, and `reason` says so.',
  responses: {
      '200': {
        description: 'The account this profile\'s jobs would run on.',
        content: {
          'application/json': { schema: z.object({
              mode: z.enum(['instance', 'profile']).optional(),
              provider: z.string().optional(),
              providerLabel: z.string().optional(),
              account: z.string().nullable().openapi({ description: 'What the admin labelled the credential, when there is one.' }).optional(),
              connected: z.boolean().optional(),
              reason: z.string().nullable().openapi({ description: 'Why not, when `connected` is false (e.g. `shared-account`).' }).optional(),
              message: z.string().nullable().openapi({ description: 'The refusal in the app\'s own voice, ready to show.' }).optional()
            }) }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const postCoachForget = {
  method: 'post',
  path: '/api/coach/forget',
  operationId: 'postCoachForget',
  tags: ['coach'],
  summary: 'Drop everything the server holds for this profile',
  description: `Consent withdrawn, or the Coach switched off for this profile: the job record,
the waiting proposal, the history and the sharing flag go at once, without waiting
for a sync to carry the news. A job already running is cancelled where the adapter
allows it and writes nothing back either way.

Today's job count is the one thing that survives. It is the spending record the
daily cap reads, and forgetting must not hand out a fresh cap.

Needs a session only: a profile must be able to be forgotten on an instance whose
Coach has since been switched off.`,
  responses: {
      '200': {
        description: 'Forgotten.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;
