/* Fork: the "admin" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { AdminCoach, AdminUserDetail, AdminUserRow, AuditEvent, ErrorBody, Invite, OidcStatus, Ok } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const adminRecoveryCode = {
  method: 'post',
  path: '/api/admin/user/recovery',
  operationId: 'adminRecoveryCode',
  tags: ['admin', 'passkeys'],
  summary: 'Admin: make a one-time recovery code (#584)',
  description: `For someone who lost every way in, on any instance (with or without
\`PASSWORD_LOGIN\`). Returns a code (12 characters from the pairing alphabet, 60 bits),
shown once, stored only as a SHA-256, valid for 24 h. The person redeems it like a
device link (\`POST /api/device-link/options\` and \`/verify\`): the device they use gets a
new passkey for the profile and is signed in. Making it bumps the profile's session
version (every session, pending pairing code and device link ends); passkeys and the
password stay. A newer code replaces an older one.

Any admin may make one for a profile that is not an admin; only the owner for an
admin; nobody for the owner (403 \`owner\`: the owner uses the server command
\`node recover.js <name>\`), for oneself (400 \`self\`) or for a disabled profile (400
\`disabled\`). Audited as \`admin.recovery.create\`; a refusal for an admin as
\`admin.denied\`.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'The user id.' })
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The code, once.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              name: z.string().optional(),
              code: z.string().optional(),
              expires: z.number().openapi({ description: 'Expiry (ms).' }).optional()
            }), example: { ok: true, name: 'Ada', code: 'K7WQ-2MZP-4HXA', expires: 1790000000000 } }
        }
      },
      '400': {
        description: 'Oneself, or a disabled profile.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'enable the account first', code: 'disabled' } }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'Not an admin; an admin who is not the owner asking for an admin; or the target is the owner.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'the owner recovers with the server command (recover.js)', code: 'owner' } }
        }
      },
      '404': {
        description: 'No user with that id.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'no such user' } }
        }
      }
    }
} satisfies RouteConfig;

export const adminPasswordReset = {
  method: 'post',
  path: '/api/admin/user/password-reset',
  operationId: 'adminPasswordReset',
  tags: ['admin', 'password'],
  summary: 'Admin: issue a one-time password reset code',
  description: `Returns a code (12 characters from the pairing alphabet, 60 bits) that is shown
once, stored only as a SHA-256, valid for 24 h and good for one
\`POST /api/login/password-reset\`. Issuing it removes the profile's current password
and bumps its session version (every session and pending pairing code ends);
passkeys keep working. A newer code replaces an older one. Admin accounts are
refused; an admin sets their own password in Settings. Audited as
\`admin.password.reset\`.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'The user id.' })
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The code, once.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              name: z.string().openapi({ description: 'The name to redeem it with.' }).optional(),
              code: z.string().optional(),
              expires: z.number().openapi({ description: 'Expiry (ms).' }).optional()
            }), example: { ok: true, name: 'Ada', code: 'K7WQ-2MZP-4HXA', expires: 1790000000000 } }
        }
      },
      '400': {
        description: 'The target is an admin.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'an admin sets their own password in Settings' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden,
      '404': {
        description: 'No user with that id.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'no such user' } }
        }
      },
      '409': R.NameTaken
    }
} satisfies RouteConfig;

export const adminUsers = {
  method: 'get',
  path: '/api/admin/users',
  operationId: 'adminUsers',
  tags: ['admin'],
  summary: 'Admin: list all users',
  description: 'One row per user with workout counts, last sync, push status and live presence. `workouts` counts only the entries the drill-down can show. Admin only. Without `ADMIN_DATA_VIEW` there is no `lastWorkout` and `live` carries only `startedAt` (no routine, no progress); `data_view` says which.',
  responses: {
      '200': {
        description: 'All users.',
        content: {
          'application/json': { schema: z.object({
              users: z.array(AdminUserRow).optional(),
              invite_only: z.boolean().optional(),
              data_view: z.boolean().openapi({ description: 'Whether ADMIN_DATA_VIEW is on (rows then carry `lastWorkout` and the live progress).' }).optional(),
              trainers: z.literal(true).openapi({ description: 'Present (true) with TRAINERS on.' }).optional(),
              password_login: z.boolean().openapi({ description: 'Present (true) with PASSWORD_LOGIN=1.' }).optional(),
              now: z.number().openapi({ description: 'Server time (ms), for rendering relative times.' }).optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const adminUser = {
  method: 'get',
  path: '/api/admin/user',
  operationId: 'adminUser',
  tags: ['admin'],
  summary: 'Admin: one user in detail',
  description: 'Drill-down for one user. Admin only. Since 1.4.5 it answers operational numbers only (`counts`, `bytes`, `lastSync`, `hasPush`, roles with TRAINERS on) and `data_view: false`. Only with `ADMIN_DATA_VIEW=on` does it add the full workout history (newest first), the body-weight log and the routines, with `data_view: true`; every such look is written to the activity log (`admin.data-view`) and to the member\'s own sharing log. Anything in `routines`, `bodyweight` or `workouts` that is not an object is left out, and a list that is not an array reads as empty: PUT /api/data drops those entries now, but a state file written before it did still has them and this route has to answer for it. A workout\'s `media` (its photos and videos) is left out: they are the owner\'s own.',
  request: {
      query: z.object({
        id: z.string().openapi({ description: 'The user id.' })
      })
    },
  responses: {
      '200': {
        description: 'The user\'s detail.',
        content: {
          'application/json': { schema: AdminUserDetail }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden,
      '404': {
        description: 'No user with that id.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'no such user' } }
        }
      }
    }
} satisfies RouteConfig;

export const adminUserDisable = {
  method: 'post',
  path: '/api/admin/user/disable',
  operationId: 'adminUserDisable',
  tags: ['admin'],
  summary: 'Admin: disable or re-enable a user',
  description: `Sets the \`disabled\` flag. A disabled account is locked out everywhere at once
(every existing session stops resolving) and dropped from live presence.
Admins cannot be disabled. Audited.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'The user id.' }),
              disabled: z.boolean()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Flag updated.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              id: z.string().optional(),
              disabled: z.boolean().optional()
            }) }
        }
      },
      '400': {
        description: 'Target is an admin.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'cannot disable an admin' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden,
      '404': {
        description: 'No user with that id.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'no such user' } }
        }
      }
    }
} satisfies RouteConfig;

export const adminUserDelete = {
  method: 'post',
  path: '/api/admin/user/delete',
  operationId: 'adminUserDelete',
  tags: ['admin'],
  summary: 'Admin: delete a user and everything of theirs',
  description: `Removes the account for good: the user record, their passkeys, their push
subscriptions, their live presence, their training history file, their uploaded
photos and videos (\`DATA_DIR/uploads/<uid>/\`) and any Coach credential stored for
them. Not reversible; \`/api/admin/user/disable\` is the
reversible one. An admin cannot delete their own account, the last admin and
the owner cannot be deleted, and only the owner deletes another admin. Audited
by name, since the id stops meaning anything.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'The user id.' })
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The account and everything of theirs is gone.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              id: z.string().optional()
            }) }
        }
      },
      '400': {
        description: 'Your own account, the last admin, or the owner.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'you cannot delete your own account' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden,
      '404': {
        description: 'No user with that id.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'no such user' } }
        }
      }
    }
} satisfies RouteConfig;

export const adminUserRole = {
  method: 'post',
  path: '/api/admin/user/role',
  operationId: 'adminUserRole',
  tags: ['admin'],
  summary: 'Owner: make someone an admin, or remove the role',
  description: 'Owner only (403 for any other admin). Not on the owner themselves, not on an admin named in `ADMIN_UIDS` (the server would restore them on restart), and a disabled account is enabled before it can be promoted. Removing the role keeps the account and its data.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'The user id.' }),
              admin: z.boolean()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Changed.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              id: z.string().optional(),
              admin: z.boolean().optional()
            }) }
        }
      },
      '400': {
        description: 'The owner, an `ADMIN_UIDS` admin, a disabled account, or no boolean.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden,
      '404': {
        description: 'No user with that id.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const adminOwnerTransfer = {
  method: 'post',
  path: '/api/admin/owner',
  operationId: 'adminOwnerTransfer',
  tags: ['admin'],
  summary: 'Owner: hand the owner role to another admin',
  description: 'Owner only. The target must already be an enabled admin; the previous owner stays an admin.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'The user id.' })
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Handed over.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              id: z.string().optional()
            }) }
        }
      },
      '400': {
        description: 'Yourself, or not an enabled admin.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden,
      '404': {
        description: 'No user with that id.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const adminInvites = {
  method: 'get',
  path: '/api/admin/invites',
  operationId: 'adminInvites',
  tags: ['admin'],
  summary: 'Admin: list invite codes',
  description: 'All invite codes, with the redeeming user\'s name resolved for display.',
  responses: {
      '200': {
        description: 'All invites.',
        content: {
          'application/json': { schema: z.object({
              invites: z.array(Invite).optional(),
              invite_only: z.boolean().optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const adminInviteNew = {
  method: 'post',
  path: '/api/admin/invites/new',
  operationId: 'adminInviteNew',
  tags: ['admin'],
  summary: 'Admin: mint an invite code',
  description: 'Creates a fresh single-use invite code (16 hex chars = 64 bits; the code itself is the thing that isn\'t worth guessing; rate limiting is the reverse proxy\'s job). Audited.',
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              note: z.string().max(60).openapi({ description: 'Free-form label ("for Alex").' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The new invite.',
        content: {
          'application/json': { schema: z.object({
              invite: Invite.optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const adminInviteRevoke = {
  method: 'post',
  path: '/api/admin/invites/revoke',
  operationId: 'adminInviteRevoke',
  tags: ['admin'],
  summary: 'Admin: revoke an unused invite code',
  description: 'Deletes an unused code. A code that was already redeemed cannot be revoked.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              code: z.string()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Revoked.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '400': {
        description: 'The code was already used.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'already used, cannot revoke' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden,
      '404': {
        description: 'No such code.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'no such code' } }
        }
      }
    }
} satisfies RouteConfig;

export const adminAudit = {
  method: 'get',
  path: '/api/admin/audit',
  operationId: 'adminAudit',
  tags: ['admin'],
  summary: 'Admin: read the activity log',
  description: `The audit log (sign-ins, failed attempts, admin actions), newest first, paged
by event id (\`before\` cursor; offset paging would repeat rows as new events
land). Retention (\`AUDIT_MAX\` events / \`AUDIT_DAYS\` days) is applied on read
as well as on the hourly compaction. When \`AUDIT_LOG\` is off the route still
answers, with \`enabled: false\` and whatever was logged before.`,
  request: {
      query: z.object({
        limit: z.coerce.number().int().min(1).max(200).openapi({ description: 'Page size.', default: 100 }).optional(),
        before: z.coerce.number().int().openapi({ description: 'Only events with id < before (cursor from `nextBefore`).' }).optional(),
        cat: z.enum(['', 'auth', 'admin', 'fail']).openapi({
          description: 'Filter: `fail` keeps only failed events; any other value keeps events whose name starts with `<cat>.` (in practice `auth` or `admin`).'
        }).optional()
      })
    },
  responses: {
      '200': {
        description: 'One page of the log.',
        content: {
          'application/json': { schema: z.object({
              events: z.array(AuditEvent).optional(),
              total: z.number().int().openapi({ description: 'Rows matching the filter (after retention).' }).optional(),
              nextBefore: z.number().int().nullable().openapi({ description: 'Cursor for the next page; null on the last page.' }).optional(),
              enabled: z.boolean().openapi({ description: 'Whether audit logging is currently on (AUDIT_LOG).' }).optional(),
              ip_mode: z.enum(['off', 'net', 'full']).openapi({ description: 'How much of the caller IP is recorded (AUDIT_IP).' }).optional(),
              retention: z.object({
                max: z.number().int().openapi({ description: 'Event cap (0 = none).' }).optional(),
                days: z.number().int().openapi({ description: 'Age cap in days (0 = none).' }).optional()
              }).optional(),
              now: z.number().openapi({ description: 'Server time (ms).' }).optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const adminAuditClear = {
  method: 'post',
  path: '/api/admin/audit/clear',
  operationId: 'adminAuditClear',
  tags: ['admin'],
  summary: 'Owner: clear the activity log',
  description: 'Owner only, so no other admin can erase a trace of what they did. Deletes the log file. The clear is itself the first event of the fresh log, and event ids are never reset, so a wipe always leaves a visible id gap.',
  responses: {
      '200': {
        description: 'Cleared.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const adminOidc = {
  method: 'get',
  path: '/api/admin/oidc',
  operationId: 'adminOidc',
  tags: ['admin'],
  summary: 'OIDC status',
  description: 'What the server was told (issuer, client id, scopes, groups claim, allowed groups, the number of role-map rules, OIDC_ONLY, e-mail linking, logout) and what it found (the discovery document reached, keys in the set, the signing algorithms accepted, the last error). The client secret is never in it.',
  responses: {
      '200': {
        description: 'The status.',
        content: {
          'application/json': { schema: OidcStatus }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const adminOidcCheck = {
  method: 'post',
  path: '/api/admin/oidc/check',
  operationId: 'adminOidcCheck',
  tags: ['admin'],
  summary: 'Fetch the provider\'s discovery document and keys again',
  responses: {
      '200': {
        description: 'The status after the check.',
        content: {
          'application/json': { schema: OidcStatus }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const getAdminCoach = {
  method: 'get',
  path: '/api/admin/coach',
  operationId: 'getAdminCoach',
  tags: ['admin', 'coach'],
  summary: 'Admin: the Coach card',
  description: `Everything the admin screen renders in one round trip, including a live check of
the configured provider: for a runtime provider "is the runtime there", for an
HTTPS one the model list its stored key can see.
A runtime-backed provider is not run when the privilege drop cannot be
performed, exactly as a job would not be: \`runtime\` then reads unavailable, with
the same reason a job is refused with.

Counts and outcomes only: no intake answers, no payloads, no proposals, and never
a credential, only whether one is filed and what it is labelled.`,
  responses: {
      '200': {
        description: 'The card.',
        content: {
          'application/json': { schema: AdminCoach }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const postAdminCoachConfig = {
  method: 'post',
  path: '/api/admin/coach/config',
  operationId: 'postAdminCoachConfig',
  tags: ['admin', 'coach'],
  summary: 'Admin: change the Coach settings',
  description: `A patch: every field is optional and only what is sent is changed. Model,
endpoint and credential are all keyed by provider, so switching provider never
drops any of them.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              enabled: z.boolean().optional(),
              provider: z.string().openapi({ description: 'Must be one of the ids GET /api/admin/coach lists.' }).optional(),
              model: z.string().max(80).openapi({ description: 'For the provider being set (or the current one). Empty string clears it.' }).optional(),
              baseUrl: z.string().openapi({
                description: `Only for a provider with a configurable endpoint; validated before it is stored.
Empty means "back to the default", so it is refused for a provider that has none.`
              }).optional(),
              community: z.boolean().openapi({ description: 'Offer the cohort comparison on this instance.' }).optional(),
              caps: z.object({
                perProfileDaily: z.number().int().min(0).max(200).openapi({ description: '0 = no cap.' }).optional(),
                instanceDaily: z.number().int().min(0).max(5000).openapi({ description: '0 = no cap.' }).optional()
              }).optional(),
              maxMessageLen: z.number().int().min(200).max(4000).openapi({
                description: 'How long a chat message, refinement or review note can be. Clamped into the range; not a number keeps the current value.'
              }).optional()
            }), example: {
              enabled: true,
              provider: 'compatible',
              model: 'qwen3.8-27b',
              caps: { perProfileDaily: 10, instanceDaily: 0 }
            } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Saved.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '400': {
        description: `Unknown provider, an endpoint set on a provider that has a fixed one, a base URL that
did not validate, or an empty one for a provider with no default endpoint to fall back
to (\`compatible\`).`,
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'unknown provider' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const postAdminCoachTest = {
  method: 'post',
  path: '/api/admin/coach/test',
  operationId: 'postAdminCoachTest',
  tags: ['admin', 'coach'],
  summary: 'Admin: run one round trip against the provider',
  description: `Checks the runtime, then asks the model for one fixed JSON object and validates
the shape that comes back. That is the whole path a job takes, on nobody's profile.
A runtime-backed provider is refused, without spawning anything, when the
privilege drop cannot be performed, exactly as a job would be.

Always 200: the outcome is in the body, because "the provider refused" is an
answer to the question the button asks, not a failure of the request. An HTTPS
provider gets the same retries as a job: a 429, 500, 502, 503, 504 or 529 is
tried twice more, after pauses of 2 and 5 seconds, and only then reported. A
runtime provider is asked once.`,
  responses: {
      '200': {
        description: 'The result of the round trip.',
        content: {
          'application/json': { schema: z.object({
              ok: z.boolean().optional(),
              version: z.string().openapi({ description: 'What the runtime reported, when it could be asked.' }).optional(),
              error: z.string().openapi({ description: 'Present when `ok` is false. The provider\'s own words, trimmed.' }).optional()
            }), examples: {
              ok: { value: { ok: true, version: '1.2.3' } },
              refused: { value: { ok: false, error: '401 invalid x-api-key' } }
            } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const postAdminCoachChatgptStart = {
  method: 'post',
  path: '/api/admin/coach/chatgpt/start',
  operationId: 'postAdminCoachChatgptStart',
  tags: ['admin', 'coach'],
  summary: 'Coach: start Sign in with ChatGPT for plan usage (preview)',
  description: 'Only with `COACH_CHATGPT_PLAN=on` (404 otherwise). Returns the auth.openai.com address to open in the admin\'s own browser; the sign-in returns to a loopback address on that computer (`redirect`), whose full address is then posted to `/api/admin/coach/chatgpt/finish`. Plan usage for open-source apps per developers.openai.com/siwc (docs/AI_COACH.md).',
  responses: {
      '200': {
        description: '`url` to open, `redirect` it comes back to.'
      },
      '401': R.Unauthorized,
      '403': R.Forbidden,
      '404': {
        description: 'The preview is not switched on.'
      }
    }
} satisfies RouteConfig;

export const postAdminCoachChatgptFinish = {
  method: 'post',
  path: '/api/admin/coach/chatgpt/finish',
  operationId: 'postAdminCoachChatgptFinish',
  tags: ['admin', 'coach'],
  summary: 'Coach: finish Sign in with ChatGPT with the address the browser ended on',
  description: '`{ callback }`: the loopback address with `code` and `state`. The server exchanges the code (PKCE), verifies the ID token against OpenAI\'s keys, requires the plan-usage scope and files the session, encrypted, as the Coach\'s instance credential (a personal one: it binds to the first profile that uses it).',
  responses: {
      '200': {
        description: '`ok`, `account` (the ChatGPT email), `usage` (where to manage limits).'
      },
      '400': {
        description: 'Expired, another sign-in\'s address, or plan use not allowed.'
      },
      '502': {
        description: 'OpenAI did not complete the exchange.'
      }
    }
} satisfies RouteConfig;

export const postAdminCoachDiscover = {
  method: 'post',
  path: '/api/admin/coach/discover',
  operationId: 'postAdminCoachDiscover',
  tags: ['admin', 'coach'],
  summary: 'Admin: find a model server on this network',
  description: 'Asks a fixed list of nearby addresses (the `ollama`, `lmstudio` and `llama` compose services, the Docker host, this machine) on the Ollama, LM Studio and llama.cpp ports for their model list. The list never comes from the request.',
  responses: {
      '200': {
        description: 'What answered.',
        content: {
          'application/json': { schema: z.object({
              ok: z.boolean().optional(),
              found: z.array(z.object({
                base: z.string().optional(),
                kind: z.string().optional(),
                models: z.array(z.string()).optional()
              })).optional()
            }), example: { ok: true, found: [{ base: 'http://ollama:11434/v1', kind: 'Ollama', models: ['qwen3:4b'] }] } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const postAdminCoachModels = {
  method: 'post',
  path: '/api/admin/coach/models',
  operationId: 'postAdminCoachModels',
  tags: ['admin', 'coach'],
  summary: 'Admin: list the models the endpoint serves',
  description: 'So the card can offer a list rather than a text field that goes stale with every model release. HTTPS providers only; a provider that cannot be asked answers `ok: false` with an empty list rather than an error status.',
  responses: {
      '200': {
        description: 'The models, or why there are none.',
        content: {
          'application/json': { schema: z.object({
              ok: z.boolean().optional(),
              models: z.array(z.string()).optional(),
              error: z.string().optional()
            }), example: { ok: true, models: ['qwen3.8-27b', 'gpt-oss-120b'] } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const postAdminCoachConnect = {
  method: 'post',
  path: '/api/admin/coach/connect',
  operationId: 'postAdminCoachConnect',
  tags: ['admin', 'coach'],
  summary: 'Admin: file the provider credential',
  description: `The token is accepted once and never read back: it is encrypted with the
instance secret and leaves again only as an environment variable on a job's child
process. \`type\` has to match a variable the provider actually declares, so a key
for one provider cannot be filed under another and then silently go nowhere.

A key may be filed for a provider that is not the active one, so the chips can be
prepared before switching.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              provider: z.string().openapi({ description: 'Defaults to the active provider.' }).optional(),
              type: z.enum(['cli-token', 'oauth', 'apikey']),
              token: z.string().openapi({ description: 'Never returned by any route, ever.' }),
              account: z.string().max(120).openapi({ description: 'A label for whose account this is, shown on the card.' }).optional()
            }), example: { type: 'apikey', token: 'sk-…', account: 'team@example.com' } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Filed.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '400': {
        description: 'Unknown provider, a credential type that provider does not take, or no token.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'no token supplied' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const postAdminCoachDisconnect = {
  method: 'post',
  path: '/api/admin/coach/disconnect',
  operationId: 'postAdminCoachDisconnect',
  tags: ['admin', 'coach'],
  summary: 'Admin: remove the provider credential',
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              provider: z.string().openapi({ description: 'Defaults to the active provider.' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Removed.',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '400': {
        description: 'Unknown provider.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'unknown provider' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const adminGyms = {
  method: 'get',
  path: '/api/admin/gyms',
  operationId: 'adminGyms',
  tags: ['admin'],
  summary: 'Admin: gyms and roles',
  description: 'Every gym with its staff (names and roles) and counts, the free trainers, the number of active grants. Never member data. TRAINERS on only.',
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

export const adminGymNew = {
  method: 'post',
  path: '/api/admin/gyms/new',
  operationId: 'adminGymNew',
  tags: ['admin'],
  summary: 'Admin: create a gym',
  description: 'A gym with a name (up to 60) and a data protection contact (up to 200) shown on the consent screen.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              name: z.string().openapi({ description: 'Gym name' }).optional(),
              contact: z.string().openapi({ description: 'Who is responsible, how to reach them' }).optional()
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

export const adminGymUpdate = {
  method: 'post',
  path: '/api/admin/gyms/update',
  operationId: 'adminGymUpdate',
  tags: ['admin'],
  summary: 'Admin: change or disable a gym',
  description: 'A disabled gym pauses every grant through it, lead and trainers alike.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'Gym id' }).optional(),
              name: z.string().openapi({ description: 'New name' }).optional(),
              contact: z.string().openapi({ description: 'New contact' }).optional(),
              disabled: z.boolean().openapi({ description: 'Off or on' }).optional()
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

export const adminGymStaff = {
  method: 'post',
  path: '/api/admin/gyms/staff',
  operationId: 'adminGymStaff',
  tags: ['admin'],
  summary: 'Admin: give or take a gym role',
  description: 'Lead or trainer. Taking the trainer role away pauses that trainer\'s studio grants at once; giving it back resumes them.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              gymId: z.string().openapi({ description: 'Gym id' }).optional(),
              userId: z.string().openapi({ description: 'Profile id' }).optional(),
              role: z.string().openapi({ description: 'lead or trainer' }).optional(),
              on: z.boolean().openapi({ description: 'false to take it away' }).optional()
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

export const adminUserTrainer = {
  method: 'post',
  path: '/api/admin/user/trainer',
  operationId: 'adminUserTrainer',
  tags: ['admin'],
  summary: 'Admin: allow a free trainer',
  description: 'A trainer without a gym (a personal trainer). Taking it away pauses their private members at once.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string().openapi({ description: 'Profile id' }).optional(),
              free: z.boolean().openapi({ description: 'true to allow' }).optional()
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
