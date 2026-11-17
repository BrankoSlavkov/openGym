/* Fork: the "auth" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, Invite, Ok, OwnerProof, SessionUser, WebAuthnAuthenticationCredential, WebAuthnAuthenticationOptions, WebAuthnRegistrationCredential, WebAuthnRegistrationOptions } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const getMe = {
  method: 'get',
  path: '/api/me',
  operationId: 'getMe',
  tags: ['auth'],
  summary: 'Who am I?',
  description: `Resolves the current session to a user. A paired phone (bearer token) whose token is
past half of \`SESSION_DAYS\` also receives a fresh \`token\` to use from now on; it carries
the account's current session version, so "sign out everywhere" revokes it like the old
one. Cookie sessions never get one.

Without a session the answer is \`401\`, on every version. The web app reads
\`signed_in\` in \`GET /api/config\` first and does not ask here when that is \`false\`,
so a guest's start logs no failed request.`,
  responses: {
      '200': {
        description: 'A valid session.',
        content: {
          'application/json': { schema: z.object({
              user: SessionUser.optional(),
              token: z.string().openapi({ description: 'Bearer sessions past half their lifetime only: the renewed token.' }).optional()
            }) }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const registerOptions = {
  method: 'post',
  path: '/api/register/options',
  operationId: 'registerOptions',
  tags: ['auth'],
  summary: 'Start passkey registration (WebAuthn ceremony, step 1)',
  description: `Returns \`PublicKeyCredentialCreationOptions\` (from
\`@simplewebauthn/server\`'s \`generateRegistrationOptions\`) plus a challenge id
\`cid\`. The client passes \`options\` to
\`navigator.credentials.create()\` (or \`@simplewebauthn/browser\`'s
\`startRegistration\`) and sends the result to \`/api/register/verify\` together
with the \`cid\`. Challenges are one-shot and expire after 5 minutes.

No session required.`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              name: z.string().max(40).openapi({ description: 'Display name for the new profile (trimmed, max 40 chars).' }),
              code: z.string().openapi({
                description: 'Invite code, required (and validated) only when the instance runs with INVITE_ONLY. Compared case-insensitively.'
              }).optional()
            }), example: { name: 'Ada', code: '3F9C21A07B54D688' } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Ceremony options.',
        content: {
          'application/json': { schema: z.object({
              cid: z.string().openapi({ description: 'One-shot challenge id, echo it back to /api/register/verify.' }).optional(),
              options: WebAuthnRegistrationOptions.optional()
            }) }
        }
      },
      '400': {
        description: '`name` missing/empty.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'name required' } }
        }
      },
      '403': {
        description: 'Instance is invite-only and the code is missing, used, or revoked.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'a valid invite code is required', code: 'invite' } }
        }
      }
    }
} satisfies RouteConfig;

export const registerVerify = {
  method: 'post',
  path: '/api/register/verify',
  operationId: 'registerVerify',
  tags: ['auth'],
  summary: 'Finish passkey registration (WebAuthn ceremony, step 2)',
  description: `Verifies the authenticator's attestation response against the stored
challenge (\`verifyRegistrationResponse\`), creates the user + credential, and
signs the caller in (sets the session cookie). On an invite-only instance the
invite is re-checked and burned here.`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              cid: z.string().openapi({ description: 'The challenge id from /api/register/options.' }),
              credential: WebAuthnRegistrationCredential
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Registered and signed in. The session cookie is set.',
        headers: {
          "Set-Cookie": {
            description: 'Session cookie (`__Host-gymsid` on HTTPS deployments, `gymsid` over plain http). HttpOnly, SameSite=Lax, Max-Age = SESSION_DAYS.',
            schema: { type: 'string' }
          }
        },
        content: {
          'application/json': { schema: z.object({
              user: SessionUser.optional()
            }) }
        }
      },
      '400': {
        description: 'Challenge expired/replayed, or the attestation did not verify (wrong origin/RP ID, malformed response…). The message is human-readable.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'challenge expired, try again', code: 'challenge-expired' } }
        }
      },
      '403': {
        description: 'Invite-only and the code became invalid since step 1.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'invite code is no longer valid, ask for a new one', code: 'invite' } }
        }
      },
      '409': {
        description: 'This credential id is already registered.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'credential already registered' } }
        }
      }
    }
} satisfies RouteConfig;

export const loginOptions = {
  method: 'post',
  path: '/api/login/options',
  operationId: 'loginOptions',
  tags: ['auth'],
  summary: 'Start passkey login (WebAuthn ceremony, step 1)',
  description: `Returns \`PublicKeyCredentialRequestOptions\`
(\`generateAuthenticationOptions\` with an empty \`allowCredentials\`; discoverable
credentials / resident keys are required at registration, so the browser offers
the user their passkeys itself) plus a one-shot challenge id \`cid\`.
Takes no request body.`,
  security: [],
  responses: {
      '401': R.err('A Bearer that does not verify and no cookie beside it (`not signed in`).'),
      '200': {
        description: 'Ceremony options.',
        content: {
          'application/json': { schema: z.object({
              cid: z.string().optional(),
              options: WebAuthnAuthenticationOptions.optional()
            }) }
        }
      }
    }
} satisfies RouteConfig;

export const loginVerify = {
  method: 'post',
  path: '/api/login/verify',
  operationId: 'loginVerify',
  tags: ['auth'],
  summary: 'Finish passkey login (WebAuthn ceremony, step 2)',
  description: `Verifies the assertion (\`verifyAuthenticationResponse\`), updates the signature
counter, and signs the caller in (sets the session cookie).`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              cid: z.string().openapi({ description: 'The challenge id from /api/login/options.' }),
              credential: WebAuthnAuthenticationCredential
            }) }
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
        description: 'Challenge expired/replayed, or the assertion did not verify.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'not verified' } }
        }
      },
      '403': {
        description: 'The account has been disabled by an admin.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'this account has been disabled', code: 'disabled' } }
        }
      },
      '404': {
        description: 'The passkey\'s credential id is unknown to this instance.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'unknown passkey, create a profile first', code: 'unknown-credential' } }
        }
      },
      '500': {
        description: 'Credential exists but its user record is missing (corrupt db).',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'user missing' } }
        }
      }
    }
} satisfies RouteConfig;

export const logout = {
  method: 'post',
  path: '/api/logout',
  operationId: 'logout',
  tags: ['auth'],
  summary: 'Sign out (this device)',
  description: 'Clears the session cookie. Always succeeds: an invalid or missing session is a no-op. The token itself stays cryptographically valid until it expires; use /api/logout/all to revoke tokens.',
  security: [],
  responses: {
      '200': {
        description: 'Cookie cleared.',
        headers: { "Set-Cookie": { description: 'Expires the session cookie(s).', schema: { type: 'string' } } },
        content: {
          'application/json': { schema: z.object({
              ok: z.boolean().optional(),
              provider_logout: z.string().openapi({
                description: 'With OIDC_LOGOUT=1, for a profile linked to the identity provider whose discovery document has an end_session_endpoint: where the browser goes next to end the provider\'s session too (RP-initiated logout).',
                format: 'uri'
              }).optional()
            }) }
        }
      }
    }
} satisfies RouteConfig;

export const logoutAll = {
  method: 'post',
  path: '/api/logout/all',
  operationId: 'logoutAll',
  tags: ['auth'],
  summary: 'Sign out everywhere',
  description: `Bumps the account's session version, which invalidates **every** cookie and
Bearer token ever issued for it, on every device, including a copy someone
walked off with. Passkeys are untouched; signing back in works immediately.
Also clears the caller's own cookie. Unredeemed pairing codes for the account
are voided too.`,
  responses: {
      '200': {
        description: 'All sessions revoked.',
        headers: {
          "Set-Cookie": { description: 'Expires the caller\'s session cookie(s).', schema: { type: 'string' } }
        },
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const accountDelete = {
  method: 'post',
  path: '/api/account/delete',
  operationId: 'accountDelete',
  tags: ['auth'],
  summary: 'Delete your own account and everything of yours',
  description: `The signed-in account removes itself for good, with the same clean-up as
\`/api/admin/user/delete\`: the user record, their passkeys, their push
subscriptions, their live presence, their training history file, their
uploaded photos and videos (\`DATA_DIR/uploads/<uid>/\`) and any Coach credential
stored for them. Not reversible. The body carries the account's name, typed back
by its owner, and the same proof as setting a password (see OwnerProof): a
passkey assertion made for this request, or the current password while
\`PASSWORD_LOGIN\` is on. A paired phone (Bearer token) cannot hold a passkey for
the server, so for a profile with no password that counts the pairing itself is
the proof (audited as \`device\`; the app asks the phone's own screen lock first);
a profile with one sends the current password from the phone too. Cookie
sessions always need the proof. The name and the last-admin rule are checked
before the proof is asked. The last admin is refused while any other profile remains (the
instance would be left with nobody to run it); the only profile on an instance
may delete itself. Clears the caller's cookie; every other session and Bearer
token of the account stops working with it. Audited as \`auth.account.delete\`,
with the name and the proof it was made with (\`passkey\`, \`password\`, \`device\`); a refused proof as
\`auth.proof.fail\` with \`act: account-delete\`.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: OwnerProof.and(z.object({
                name: z.string().openapi({ description: 'The account name, exactly (surrounding spaces are ignored).' })
              })), example: { name: 'Ada', current: 'correct horse battery staple' } }
        }
      }
    },
  responses: {
      '200': {
        description: 'The account and everything of theirs is gone.',
        headers: {
          "Set-Cookie": { description: 'Expires the caller\'s session cookie(s).', schema: { type: 'string' } }
        },
        content: {
          'application/json': { schema: Ok }
        }
      },
      '400': {
        description: '`confirm-name`: the name is missing or is not this account\'s.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'type the account name to confirm', code: 'confirm-name' } }
        }
      },
      '401': R.Unauthorized,
      '403': R.ProofRefused,
      '409': {
        description: '`last-admin`: the only admin, with other profiles still on the instance.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'the last admin cannot leave while other profiles remain', code: 'last-admin' } }
        }
      },
      '429': R.TooManyRequests
    }
} satisfies RouteConfig;
