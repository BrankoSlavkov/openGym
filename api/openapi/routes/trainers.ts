/* Fork: the "trainers" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const sharingOverview = {
  method: 'get',
  path: '/api/sharing',
  operationId: 'sharingOverview',
  tags: ['trainers'],
  summary: 'The member: my connections and gyms',
  description: 'Every trainer connection (pending or active) with its scopes, whether it is paused (`left-gym`, `gym-off`, `not-trainer`) and its gym lead row; the gyms joined; the current consent text with version and hash; the lead mode (`row`, `mirror`, `none`).',
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingCode = {
  method: 'post',
  path: '/api/sharing/code',
  operationId: 'sharingCode',
  tags: ['trainers'],
  summary: 'The member: read a trainer code',
  description: 'Who the code belongs to, which gym (name, data protection contact, leads), the default scopes for the consent screen and the lead row, and the consent text. Creates nothing. Wrong codes count per address and account (10 free, then a pause that doubles).',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              code: z.string().openapi({ description: 'TR-XXXXX-XXXXX, any case, spaces and dashes optional' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingConnect = {
  method: 'post',
  path: '/api/sharing/connect',
  operationId: 'sharingConnect',
  tags: ['trainers'],
  summary: 'The member: say yes to a trainer',
  description: 'Creates a pending grant (the trainer confirms it), a consent record per row, and with a studio trainer the studio membership and the gym lead row (never more than view). Levels per category are off, view, suggest, apply; each category has its own ceiling.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              code: z.string().openapi({ description: 'The trainer code' }).optional(),
              scopes: z.record(z.string(), z.unknown()).openapi({ description: '{ category: level }' }).optional(),
              leadScopes: z.record(z.string(), z.unknown()).openapi({ description: 'The lead row; only narrows the pre-fill' }).optional(),
              consent: z.record(z.string(), z.unknown()).openapi({
                description: '{ v, hash } of the consent text shown (GET /api/sharing). A stale one is 409 consent-outdated with the current text.'
              }).optional(),
              lang: z.string().openapi({ description: 'Language the consent was read in' }).optional()
            }) }
        }
      }
    },
  responses: {
      '409': R.err('The connection cannot be made in the state things are in (an `OrgError` code says which).'),
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingDecline = {
  method: 'post',
  path: '/api/sharing/decline',
  operationId: 'sharingDecline',
  tags: ['trainers'],
  summary: 'The member: not now',
  description: 'Nothing is created and the code stays usable; the member\'s own log notes it.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              code: z.string().openapi({ description: 'The trainer code' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingUpdate = {
  method: 'post',
  path: '/api/sharing/update',
  operationId: 'sharingUpdate',
  tags: ['trainers'],
  summary: 'The member: change what one connection shares',
  description: 'New scopes for a trainer row (its lead row follows down, never up) or for a lead row (only narrower than the trainer\'s). A new consent record replaces the old one.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'Grant id' }).optional(),
              scopes: z.record(z.string(), z.unknown()).openapi({ description: '{ category: level }' }).optional(),
              consent: z.record(z.string(), z.unknown()).openapi({
                description: '{ v, hash } of the consent text shown (GET /api/sharing). A stale one is 409 consent-outdated with the current text.'
              }).optional(),
              lang: z.string().openapi({ description: 'Language' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingDisconnect = {
  method: 'post',
  path: '/api/sharing/disconnect',
  operationId: 'sharingDisconnect',
  tags: ['trainers'],
  summary: 'The member: end a connection',
  description: 'Ends the grant (and a trainer grant\'s lead row) at once. The trainer loses access on their next request.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'Grant id' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingLeave = {
  method: 'post',
  path: '/api/sharing/leave',
  operationId: 'sharingLeave',
  tags: ['trainers'],
  summary: 'The member: leave a gym',
  description: 'Ends the membership, the lead row and every studio trainer grant of that gym. Private trainers stay.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              gymId: z.string().openapi({ description: 'Gym id' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingLog = {
  method: 'get',
  path: '/api/sharing/log',
  operationId: 'sharingLog',
  tags: ['trainers'],
  summary: 'The member: my sharing log',
  description: 'Newest first: connections, changes, ends, gym joins, admin looks (ADMIN_DATA_VIEW) and trainer looks folded per day and category. Only the member reads it.',
  request: {
      query: z.object({
        before: z.coerce.number().openapi({ description: 'Page: entries older than this `at`' }).optional(),
        limit: z.coerce.number().int().openapi({ description: '1 to 200, default 100' }).optional()
      })
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingExport = {
  method: 'get',
  path: '/api/sharing/export',
  operationId: 'sharingExport',
  tags: ['trainers'],
  summary: 'The member: everything about my sharing',
  description: 'Memberships, grants, consent records (version, hash, language, scopes) and the full log, as an attachment. Account deletion removes all of it.',
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerOverview = {
  method: 'get',
  path: '/api/trainer',
  operationId: 'trainerOverview',
  tags: ['trainers'],
  summary: 'The trainer: roles, codes, requests, members',
  description: 'The gyms the caller trains in, whether they may invite as a free trainer, their live codes, pending requests (member name and the scopes offered) and connected members with the level each category grants right now. Never any member data.',
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerCode = {
  method: 'post',
  path: '/api/trainer/codes',
  operationId: 'trainerCode',
  tags: ['trainers'],
  summary: 'The trainer: new invite code',
  description: 'A code (shown once, only its hash is stored) and a link for the QR. Studio codes need a trainer role in that gym, others free-trainer status. 20 a day.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              gymId: z.string().openapi({ description: 'Optional gym id' }).optional(),
              maxUses: z.number().int().openapi({ description: '1 to 200, default 1' }).optional(),
              days: z.number().int().openapi({ description: '1 to 30, default 7' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerCodeRevoke = {
  method: 'post',
  path: '/api/trainer/codes/revoke',
  operationId: 'trainerCodeRevoke',
  tags: ['trainers'],
  summary: 'The trainer: revoke a code',
  description: 'The code stops working; connections made with it stay.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'Code id' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerAnswer = {
  method: 'post',
  path: '/api/trainer/requests/answer',
  operationId: 'trainerAnswer',
  tags: ['trainers'],
  summary: 'The trainer: confirm or decline a request',
  description: 'Confirming activates the grant and its lead row; declining ends both.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'Grant id' }).optional(),
              accept: z.boolean().openapi({ description: 'true to confirm' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerDisconnect = {
  method: 'post',
  path: '/api/trainer/disconnect',
  operationId: 'trainerDisconnect',
  tags: ['trainers'],
  summary: 'The trainer: end a connection',
  description: 'Same as the member ending it.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'Grant id' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`) or too many wrong codes (`code-paused`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerMembers = {
  method: 'get',
  path: '/api/trainer/members',
  operationId: 'trainerMembers',
  tags: ['trainers'],
  summary: 'The trainer: the member list',
  description: 'Every member connected to this trainer, with what each shares and, where key numbers are shared, the last workout, the streak (weeks), this week\'s sessions against the plan and flags: `missed` (planned days without a workout in the last 7), `pr` (records in the last 7 days), `inactive` (no workout for `inactive` days, default 7), `weight` (a change of 1 or more over two weeks, needs body weight), `pending` (suggestions not answered yet). A flag only appears when its category is shared. Each listed member\'s sharing log notes the look.',
  request: {
      query: z.object({
        today: z.string().openapi({ description: 'Client date (YYYY-MM-DD), used when within a day of the server' }).optional(),
        inactive: z.string().openapi({ description: 'Days without a workout before the inactive flag (2 to 60)' }).optional()
      })
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerMember = {
  method: 'get',
  path: '/api/trainer/member',
  operationId: 'trainerMember',
  tags: ['trainers'],
  summary: 'The trainer or gym lead: one member',
  description: 'The projection of one member: only the categories they share with this person (`shared`), never the document. Workouts come without media and, unless notes are shared, without notes; paged newest first by `before`. Plus this person\'s own comments, suggestions and changes. 404 for a member this person was never connected to, 403 `not-shared` once a connection ended.',
  request: {
      query: z.object({
        id: z.string().openapi({ description: 'Member id' }).optional(),
        before: z.string().openapi({ description: 'Workouts before this date (YYYY-MM-DD)' }).optional(),
        limit: z.string().openapi({ description: 'Workouts per page (1 to 100, default 20)' }).optional(),
        today: z.string().openapi({ description: 'Client date (YYYY-MM-DD)' }).optional()
      })
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerMemberPhoto = {
  method: 'get',
  path: '/api/trainer/member/photo',
  operationId: 'trainerMemberPhoto',
  tags: ['trainers'],
  summary: 'The trainer or gym lead: one progress photo of a member',
  description: 'The bytes of one progress photo (a still filed under a day or on a workout, `photos.items` of the member projection), only while the member shares `photos` with this person; the grant is checked for every file. Sent with the same headers as `GET /api/media/{hash}`. Form videos, custom exercise pictures, sounds and the profile picture are never served here. 403 `level` with photos not shared, 404 for a stranger or a file outside the category. Budget `trainer.photo`.',
  request: {
      query: z.object({
        id: z.string().openapi({ description: 'Member id' }).optional(),
        hash: z.string().openapi({ description: 'The photo (lowercase sha256)' }).optional()
      })
    },
  responses: {
      '200': {
        description: 'The file.',
        content: {
          'image/jpeg': { schema: z.string().openapi({ format: 'binary' }) },
          'image/png': { schema: z.string().openapi({ format: 'binary' }) },
          'image/webp': { schema: z.string().openapi({ format: 'binary' }) }
        }
      },
      '400': {
        description: 'Not a sha256 (`bad-request`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Photos not shared with this person (`level`), or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerOps = {
  method: 'post',
  path: '/api/trainer/ops',
  operationId: 'trainerOps',
  tags: ['trainers'],
  summary: 'The trainer: change a member\'s data',
  description: 'Whitelisted ops (`routine.put`, `routine.remove`, `week.set`, `bodyweight.put`, `measurement.put`, `workout.add`, `workout.edit`), each checked against its category: applied at once where the member allows changes (written through the same sync stamps as PUT /api/data, every entry labelled `_by`, undoable by the member for 30 days), sent as one suggestion to the member\'s inbox where they allow suggestions, refused otherwise.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              memberId: z.string().optional(),
              ops: z.array(z.record(z.string(), z.unknown())).optional(),
              message: z.string().max(300).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerAssign = {
  method: 'post',
  path: '/api/trainer/assign',
  operationId: 'trainerAssign',
  tags: ['trainers'],
  summary: 'The trainer: assign one of their routines',
  description: 'Copies one of the trainer\'s own routines (with the custom exercises it needs, without media) to up to 50 members, optionally onto a weekday (`day`, 0 is Sunday). Per member the outcome is `applied`, `suggested` or `skipped` with a reason. The copy carries `origin` (kind trainer, sourceId); assigning it again replaces that copy.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              memberIds: z.array(z.string()).max(50).optional(),
              routineId: z.string().optional(),
              day: z.number().int().min(0).max(6).optional(),
              message: z.string().max(300).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerComment = {
  method: 'post',
  path: '/api/trainer/comment',
  operationId: 'trainerComment',
  tags: ['trainers'],
  summary: 'The trainer: comment on a workout',
  description: 'Needs workouts at See. The comment goes to the member\'s inbox (and a push), never into their training data.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              memberId: z.string().optional(),
              workoutId: z.string().optional(),
              text: z.string().max(1000).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const trainerLeaveGym = {
  method: 'post',
  path: '/api/trainer/leave-gym',
  operationId: 'trainerLeaveGym',
  tags: ['trainers'],
  summary: 'The trainer: stop working at a gym',
  description: 'Ends the trainer role at that gym. The trainer\'s members there are paused and get the offer to stay connected privately for 30 days.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              gymId: z.string().optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const gymOverview = {
  method: 'get',
  path: '/api/gym',
  operationId: 'gymOverview',
  tags: ['trainers'],
  summary: 'The gym lead: the gym',
  description: 'The gym\'s trainers (with member counts) and its members, each with their trainers and, where the member\'s own lead row shares key numbers, the summary. Never more than view.',
  request: {
      query: z.object({
        id: z.string().openapi({ description: 'Gym id' }).optional(),
        today: z.string().openapi({ description: 'Client date (YYYY-MM-DD)' }).optional()
      })
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const gymCode = {
  method: 'post',
  path: '/api/gym/code',
  operationId: 'gymCode',
  tags: ['trainers'],
  summary: 'The gym lead: a join code',
  description: 'A `GY-…` code (default 50 uses, 30 days) and the link that opens it. Members who use it join the gym and set their lead row; there is no trainer in it.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              gymId: z.string().optional(),
              maxUses: z.number().int().min(1).max(200).optional(),
              days: z.number().int().min(1).max(30).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const gymStaff = {
  method: 'post',
  path: '/api/gym/staff',
  operationId: 'gymStaff',
  tags: ['trainers'],
  summary: 'The gym lead: add or remove a trainer',
  description: 'By account id. Removing one pauses their gym members and sends each the private offer.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              gymId: z.string().optional(),
              user: z.string().openapi({ description: 'Account id' }).optional(),
              on: z.boolean().optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingInbox = {
  method: 'get',
  path: '/api/sharing/inbox',
  operationId: 'sharingInbox',
  tags: ['trainers'],
  summary: 'The member: inbox and trainer changes',
  description: 'Suggestions, comments, notices (a new connection, changed sharing, a gym joined, a trainer\'s change) and offers to stay with a trainer privately, newest first; plus every change a trainer made, with `canUndo`.',
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingInboxAnswer = {
  method: 'post',
  path: '/api/sharing/inbox/answer',
  operationId: 'sharingInboxAnswer',
  tags: ['trainers'],
  summary: 'The member: answer an inbox item',
  description: 'A suggestion: `accept` applies it (labelled with the trainer, undoable), otherwise it is declined; 410 when the connection ended. An offer: `accept` with the current consent makes a private connection, otherwise the paused one ends. A notice or comment: dismissed.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().optional(),
              accept: z.boolean().optional(),
              consent: z.record(z.string(), z.unknown()).optional(),
              lang: z.string().optional()
            }) }
        }
      }
    },
  responses: {
      '410': R.err('The connection ended (`expired`), or the item is no longer open (`not-open`, with its `status`).'),
      '409': R.err('They cannot train people privately on this server (`not-free`).'),
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingInboxSeen = {
  method: 'post',
  path: '/api/sharing/inbox/seen',
  operationId: 'sharingInboxSeen',
  tags: ['trainers'],
  summary: 'The member: mark inbox items seen',
  description: 'Without `ids`, all of them.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              ids: z.array(z.string()).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingUndo = {
  method: 'post',
  path: '/api/sharing/undo',
  operationId: 'sharingUndo',
  tags: ['trainers'],
  summary: 'The member: undo a trainer\'s change',
  description: 'Puts the entries back as they were, as the member\'s own newest change, so it wins on every device. 409 `changed-since` when the member changed them after the trainer did (send again with `force`), 409 `already-undone`, 410 after 30 days.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().optional(),
              force: z.boolean().optional()
            }) }
        }
      }
    },
  responses: {
      '410': R.err('Too old to undo (`too-old`).'),
      '409': R.err('Already undone (`already-undone`), or changed since (`changed-since`): send again with force to undo anyway.'),
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not allowed at this level, or the connection ended (`not-shared`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const sharingPreview = {
  method: 'get',
  path: '/api/sharing/preview',
  operationId: 'sharingPreview',
  tags: ['trainers'],
  summary: 'The member: see what a connection sees',
  description: 'The same projection the trainer or gym lead of that grant gets, so the preview cannot drift from the truth.',
  request: {
      query: z.object({
        grant: z.string().openapi({ description: 'Grant id' }).optional()
      })
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not found, or `trainers-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Over the account budget (`rate-limited`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;
