/* Fork: the "password" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, Invite, Ok, OwnerProof, SessionUser, WebAuthnAuthenticationCredential } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const loginPassword = {
  method: 'post',
  path: '/api/login/password',
  operationId: 'loginPassword',
  tags: ['password'],
  summary: 'Sign in with a profile name or e-mail and a password',
  description: `Only a profile that has set a password can sign in this way. The identifier is the
profile's display name or the e-mail address it added (\`POST /api/account/email\`),
compared trimmed, NFKC-normalised and case-insensitively. Send it as \`identifier\`
(what the app sends), \`name\` (the original field, still accepted) or \`email\`. In
\`identifier\` and \`name\`, a value with an \`@\` is looked up as an e-mail first and
then as a name; \`email\` is looked up only as an e-mail.
A wrong password, an unknown name and a name whose profile has no password all get
the same \`401\` after the same scrypt work, so neither the answer nor its timing says
which names exist. So does a password that was right when its check started but
was changed, reset or removed before the check finished. Five wrong passwords for an
account are free and the sixth pauses it, whichever identifier they named it by (see *Throttling*); passkey
sign-in is never paused by this. Sets the
same session cookie as \`/api/login/verify\`. **Not** CSRF-exempt.`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              identifier: z.string().openapi({ description: 'A profile name or an e-mail address.' }).optional(),
              name: z.string().openapi({ description: 'The original field: a profile name, or an e-mail address.' }).optional(),
              email: z.string().openapi({ description: 'An e-mail address only.' }).optional(),
              password: z.string().max(256)
            }).openapi({ description: 'One of `identifier`, `name` or `email`, and the password.' }), examples: {
              byName: { value: { identifier: 'Ada', password: 'correct horse battery staple' } },
              byEmail: { value: { identifier: 'ada@example.com', password: 'correct horse battery staple' } },
              legacy: { value: { name: 'Ada', password: 'correct horse battery staple' } }
            } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Signed in. The session cookie is set.',
        headers: {
          "Set-Cookie": { description: 'Session cookie (see /api/register/verify).', schema: { type: 'string' } }
        },
        content: {
          'application/json': { schema: z.object({
              user: SessionUser.optional()
            }) }
        }
      },
      '400': {
        description: 'Name or password missing.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'name and password required', code: 'missing' } }
        }
      },
      '401': {
        description: 'Wrong name or password. Deliberately one answer for every cause.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'wrong name or password', code: 'bad-credentials' } }
        }
      },
      '403': {
        description: 'The right password for a disabled account.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'this account has been disabled', code: 'disabled' } }
        }
      },
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const registerPassword = {
  method: 'post',
  path: '/api/register/password',
  operationId: 'registerPassword',
  tags: ['password'],
  summary: 'Create a profile with a name and password',
  description: `For browsers that cannot make a passkey (plain http on a LAN address, some Firefox
setups). Creates the profile and signs it in. The same invite rules as passkey
registration apply: on an invite-only instance the code is checked first, checked
again after hashing, and burned. The password must be 10–256 characters and not one
of the passwords guessing scripts try first; no two profiles with a password may
share a name. An optional \`email\` is stored as the profile's sign-in e-mail (see
\`POST /api/account/email\`); one that is not an address is refused with \`400
email-invalid\`, one that is in use with \`409 email-taken\`. Both are asked only after the
hash and the second invite check, so without a valid code it is never answered,
which counts against the caller's address like a wrong invite code. **Not**
CSRF-exempt.`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              name: z.string().max(40),
              password: z.string().min(10).max(256),
              code: z.string().openapi({ description: 'Invite code (INVITE_ONLY only).' }).optional(),
              email: z.string().max(254).openapi({ description: 'Optional sign-in e-mail.' }).optional()
            }), example: { name: 'Ada', password: 'correct horse battery staple', code: '3F9C21A07B54D688' } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Registered and signed in. The session cookie is set.',
        headers: {
          "Set-Cookie": { description: 'Session cookie (see /api/register/verify).', schema: { type: 'string' } }
        },
        content: {
          'application/json': { schema: z.object({
              user: SessionUser.optional()
            }) }
        }
      },
      '400': {
        description: 'The password breaks the policy with `too-short` (under 10 characters), `too-long` (over 256) or `too-common`; a field is `missing`; or `email-invalid`: the `email` given is not an e-mail address.',
        content: {
          'application/json': { schema: ErrorBody, examples: {
              policy: { value: { error: 'this password is too easy to guess', code: 'too-common' } },
              email: { value: { error: 'that is not an e-mail address', code: 'email-invalid' } }
            } }
        }
      },
      '403': {
        description: 'Invite-only and the code is missing, used or revoked.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'a valid invite code is required', code: 'invite' } }
        }
      },
      '409': {
        description: '`name-taken` (see NameTaken) or `email-taken`: the e-mail is in use by another profile.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'another profile already uses this e-mail address', code: 'email-taken' } }
        }
      },
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const redeemPasswordReset = {
  method: 'post',
  path: '/api/login/password-reset',
  operationId: 'redeemPasswordReset',
  tags: ['password'],
  summary: 'Set a new password with an admin\'s one-time reset code',
  description: `Redeems the code from \`POST /api/admin/user/password-reset\` (valid 24 h, single
use, stored only as a hash; dashes, spaces and case do not matter) and signs in.
A new password that breaks the policy is refused without using up the code. Every
other session of the account ends. Wrong codes count against the caller's address
only (see *Throttling*), never against the name, so they cannot keep a real code
from working. The profile is named by its name or its sign-in e-mail, in
\`identifier\`, \`name\` or \`email\` as at sign-in. **Not** CSRF-exempt.`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              identifier: z.string().openapi({ description: 'The profile name or its sign-in e-mail.' }).optional(),
              name: z.string().openapi({ description: 'The original field; an e-mail works here too.' }).optional(),
              email: z.string().optional(),
              code: z.string().openapi({ example: 'K7WQ-2MZP-4HXA' }),
              next: z.string().min(10).max(256)
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Password set and signed in. The session cookie is set.',
        headers: {
          "Set-Cookie": { description: 'Session cookie (see /api/register/verify).', schema: { type: 'string' } }
        },
        content: {
          'application/json': { schema: z.object({
              user: SessionUser.optional()
            }) }
        }
      },
      '400': {
        description: '`reset-invalid` (wrong, used or expired code; one answer for all), `missing`, or a password-policy code.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'that reset code is wrong or has expired', code: 'reset-invalid' } }
        }
      },
      '403': {
        description: 'The account has been disabled.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'this account has been disabled', code: 'disabled' } }
        }
      },
      '409': R.NameTaken,
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const getAccountPassword = {
  method: 'get',
  path: '/api/account/password',
  operationId: 'getAccountPassword',
  tags: ['password'],
  summary: 'Whether this profile has a password',
  responses: {
      '200': {
        description: 'The profile\'s password state.',
        content: {
          'application/json': { schema: z.object({
              set: z.boolean().optional(),
              setAt: z.string().nullable().openapi({ description: 'ISO timestamp.' }).optional(),
              passkeys: z.number().int().openapi({ description: 'How many passkeys the profile has; 0 means the password cannot be removed.' }).optional(),
              name: z.string().openapi({ description: 'The name to sign in with.' }).optional(),
              nameTaken: z.boolean().openapi({ description: 'Another profile already signs in with this name, so no password can be set here.' }).optional(),
              email: z.string().nullable().openapi({ description: 'The e-mail this profile may sign in with (POST /api/account/email), or null.' }).optional()
            }), example: {
              set: true,
              setAt: '2026-09-23T10:00:00.000Z',
              passkeys: 1,
              name: 'Ada',
              nameTaken: false,
              email: 'ada@example.com'
            } }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const setAccountPassword = {
  method: 'post',
  path: '/api/account/password',
  operationId: 'setAccountPassword',
  tags: ['password'],
  summary: 'Set or change this profile\'s password',
  description: `Proof first: \`current\` when the profile has a password, or a passkey assertion made
for this request (\`cid\` from \`POST /api/login/options\`, \`credential\` signed by one of
*this* profile's passkeys). The passkey is the only way to set a first password, and the way to
replace a forgotten one. A session alone is never enough. Wrong \`current\` values
count toward the same pause as wrong sign-ins. On success the session version is
bumped, which ends every other session and pending pairing code of the account; the
caller's own continues on a fresh cookie, or a fresh \`token\` for a Bearer caller.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              next: z.string().min(10).max(256),
              current: z.string().optional(),
              cid: z.string().optional(),
              credential: WebAuthnAuthenticationCredential.optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Saved. Other sessions have ended.',
        headers: {
          "Set-Cookie": {
            description: 'A fresh session cookie for this browser (cookie callers).',
            schema: { type: 'string' }
          }
        },
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              token: z.string().openapi({ description: 'Bearer callers only: the token to use from now on.' }).optional()
            }) }
        }
      },
      '400': R.PasswordPolicy,
      '401': R.Unauthorized,
      '403': {
        description: 'No acceptable proof: `current-required`, `current-wrong`, `passkey-required` (no password yet, so a passkey has to confirm), or `passkey` (the assertion did not verify or belongs to another profile).',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'your current password is not right', code: 'current-wrong' } }
        }
      },
      '409': R.NameTaken,
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const removeAccountPassword = {
  method: 'delete',
  path: '/api/account/password',
  operationId: 'removeAccountPassword',
  tags: ['password'],
  summary: 'Remove this profile\'s password',
  description: 'Refused while the profile has no passkey: the password would be its last way in. Otherwise the body carries the same proof setting one takes: `current`, the password itself, or a passkey assertion made for this request (`cid` from `POST /api/login/options`, `credential` signed by one of *this* profile\'s passkeys). A session alone is never enough: a stolen cookie must not take away the owner\'s way in where passkeys do not work. The last-way-in refusal comes before the proof is checked, and is checked again after it. Wrong `current` values count toward the same pause as wrong sign-ins. Existing sessions are left alone (`POST /api/logout/all` ends them). A profile without a password gets 200 as well, with no proof asked. Audited as `auth.password.remove`.',
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
        description: 'Removed (or there was none).',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized,
      '403': R.ProofRefused,
      '409': {
        description: 'The password is the profile\'s only way in.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'the password is the only way into this profile', code: 'last-way-in' } }
        }
      },
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const setAccountEmail = {
  method: 'post',
  path: '/api/account/email',
  operationId: 'setAccountEmail',
  tags: ['password'],
  summary: 'Set, change or remove the e-mail this profile may sign in with',
  description: `An e-mail address to type at \`POST /api/login/password\` instead of the profile
name. No mail is ever sent to it (there is no verification and no reset mail;
resets stay the admin's one-time code), so it is only an identifier. Stored
trimmed, NFKC-normalised and lower-cased; at most 254 characters; unique across
every profile, and never another password-holding profile's name. An empty or null
\`email\` removes it (as \`DELETE\` does).

The body carries the same proof as setting a password (see OwnerProof): a session
alone is never enough. Saving the address the profile already has answers 200 with
no proof asked. An address in use by another profile is refused only after the
proof, with \`409 email-taken\`, and counts against the caller's address and account
(20 free, then 30 s doubling to 15 min), so the answer never costs less than a
passkey prompt or a password check, and runs out after a few tries. It says an
address is in use somewhere on this instance, never by whom. Audited as
\`auth.email.set\` / \`auth.email.change\` with the address masked (\`a…@e…\`).`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: OwnerProof.and(z.object({
                email: z.string().max(254).nullable().optional()
              })), example: { email: 'ada@example.com', current: 'correct horse battery staple' } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Saved (or removed).',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              email: z.string().nullable().openapi({ description: 'The address as stored.' }).optional()
            }), example: { ok: true, email: 'ada@example.com' } }
        }
      },
      '400': {
        description: 'Not an e-mail address.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'that is not an e-mail address', code: 'email-invalid' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.ProofRefused,
      '409': {
        description: 'Another profile already uses this address.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'another profile already uses this e-mail address', code: 'email-taken' } }
        }
      },
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const removeAccountEmail = {
  method: 'delete',
  path: '/api/account/email',
  operationId: 'removeAccountEmail',
  tags: ['password'],
  summary: 'Remove the e-mail this profile may sign in with',
  description: 'The profile then signs in by its name only. Takes the same proof as setting one (OwnerProof); a profile without an e-mail gets 200 with none asked. Audited as `auth.email.remove`.',
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
        description: 'Removed (or there was none).',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              email: z.unknown().nullable().optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '403': R.ProofRefused,
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;
