/* Fork: the "passkeys" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, OwnerProof, PasskeyList, SessionUser, WebAuthnRegistrationCredential, WebAuthnRegistrationOptions } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const listPasskeys = {
  method: 'get',
  path: '/api/account/passkeys',
  operationId: 'listPasskeys',
  tags: ['passkeys'],
  summary: 'This profile\'s passkeys',
  description: 'Every passkey that signs this profile in, without key material. `created` and `lastUsed` are null for a passkey made before they were recorded.',
  responses: {
      '200': {
        description: 'The list, and what it allows.',
        content: {
          'application/json': { schema: PasskeyList }
        }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const removePasskey = {
  method: 'delete',
  path: '/api/account/passkeys',
  operationId: 'removePasskey',
  tags: ['passkeys'],
  summary: 'Remove one passkey',
  description: `Refused while it is the profile's last way in: its only passkey, and no password
that can sign in (a password counts only while \`PASSWORD_LOGIN\` is on). Otherwise
the body carries the same proof adding one takes (\`OwnerProof\`): a session alone is
never enough, since a stolen cookie could otherwise choose which of the owner's
passkeys is left. Any of the profile's passkeys may confirm, the one being removed
included. The 404 and 409 refusals come before the proof is checked, and the
last-way-in rule is checked again after it. Audited as \`auth.passkey.remove\`. An
unused device code of the profile is dropped too, so one made with the removed
passkey cannot add another afterwards.

Sessions are not tied to the passkey that opened them, so a session it already
opened carries on; \`POST /api/logout/all\` ends those.`,
  request: {
      query: z.object({
        id: z.string().openapi({ description: 'The passkey\'s `id` from the list (its WebAuthn credential id).' })
      }),
      body: {
        required: true,
        content: {
          'application/json': { schema: OwnerProof }
        }
      }
    },
  responses: {
      '200': {
        description: 'Removed. The list as it is now.',
        content: {
          'application/json': { schema: PasskeyList.and(z.object({
                ok: z.literal(true).optional()
              })) }
        }
      },
      '401': R.Unauthorized,
      '403': R.ProofRefused,
      '404': {
        description: 'No passkey of this profile has that id.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'passkey not found', code: 'not-found' } }
        }
      },
      '409': {
        description: 'It is the profile\'s last way in.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'this passkey is the only way into this profile', code: 'last-way-in' } }
        }
      },
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const addPasskeyOptions = {
  method: 'post',
  path: '/api/account/passkeys/options',
  operationId: 'addPasskeyOptions',
  tags: ['passkeys'],
  summary: 'Add a passkey (step 1): prove it is you, get creation options',
  description: `A session alone is never enough to add a way in that outlives "sign out
everywhere". The body carries the same proof \`POST /api/account/password\` takes:
a passkey assertion made for this request (\`cid\` from \`POST /api/login/options\`,
\`credential\` signed by one of *this* profile's passkeys), or \`current\`, the
profile's password, only while \`PASSWORD_LOGIN\` is on. With it off, a password
kept from before is not checked at all and the answer is \`passkey-required\`, so a
password-only profile has to move onto a passkey while the flag is still on. Wrong
passwords count toward the sign-in pause.

The options use the profile's own user handle and list its passkeys in
\`excludeCredentials\`, so an authenticator that already holds one refuses. The
challenge is good for 5 minutes, for this profile, and only while the session
version is unchanged.`,
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
        description: 'Ceremony options.',
        content: {
          'application/json': { schema: z.object({
              cid: z.string().openapi({ description: 'One-shot challenge id for /api/account/passkeys/verify.' }).optional(),
              options: WebAuthnRegistrationOptions.optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '403': R.ProofRefused,
      '409': R.PasskeyLimit,
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const addPasskeyVerify = {
  method: 'post',
  path: '/api/account/passkeys/verify',
  operationId: 'addPasskeyVerify',
  tags: ['passkeys'],
  summary: 'Add a passkey (step 2): store the new one',
  description: 'Verifies the attestation against the challenge from step 1 and stores the passkey on this profile. Audited as `auth.passkey.add`, with the proof that allowed it.',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              cid: z.string(),
              credential: WebAuthnRegistrationCredential,
              name: z.string().max(40).openapi({ description: 'A label of the owner\'s choosing ("Work laptop").' }).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Added. The list as it is now.',
        content: {
          'application/json': { schema: PasskeyList.and(z.object({
                ok: z.literal(true).optional()
              })) }
        }
      },
      '400': {
        description: 'Challenge expired, replayed or made for another profile, or the attestation did not verify.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'challenge expired, try again', code: 'challenge-expired' } }
        }
      },
      '401': {
        description: 'Not signed in, including a session that was ended ("sign out everywhere", a new password) after step 1.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'not signed in' } }
        }
      },
      '409': {
        description: '`credential-exists` (that passkey is already registered) or `passkey-limit`.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'credential already registered', code: 'credential-exists' } }
        }
      }
    }
} satisfies RouteConfig;

export const renamePasskey = {
  method: 'post',
  path: '/api/account/passkeys/rename',
  operationId: 'renamePasskey',
  tags: ['passkeys'],
  summary: 'Name one passkey',
  description: 'An empty name clears it; the app then shows a numbered "Passkey n".',
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              id: z.string(),
              name: z.string().max(40).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Renamed. The list as it is now.',
        content: {
          'application/json': { schema: PasskeyList.and(z.object({
                ok: z.literal(true).optional()
              })) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'No passkey of this profile has that id.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'passkey not found', code: 'not-found' } }
        }
      }
    }
} satisfies RouteConfig;

export const createDeviceLink = {
  method: 'post',
  path: '/api/account/device-link',
  operationId: 'createDeviceLink',
  tags: ['passkeys'],
  summary: 'Make a one-time device link',
  description: `For adding another device of the same person: returns a code of 12 characters from
the pairing alphabet (60 bits), which the app also shows as a QR code of
\`<app>?link=<code>\`. The other device redeems it with \`/api/device-link/*\` by
creating a passkey of its own. The code is shown once, stored only as a SHA-256,
good for 10 minutes and for one passkey; a newer one replaces it, and signing out
everywhere, a new password, an admin reset or a disable drop it. Same proof as
adding a passkey. Audited as \`auth.link.create\`.`,
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
        description: 'The code, once.',
        content: {
          'application/json': { schema: z.object({
              code: z.string().optional(),
              expires: z.number().openapi({ description: 'Expiry (ms).' }).optional()
            }), example: { code: 'K7WQ-2MZP-4HXA', expires: 1790000000000 } }
        }
      },
      '401': R.Unauthorized,
      '403': R.ProofRefused,
      '409': R.PasskeyLimit,
      '429': R.TooManyRequests,
      '503': R.Busy
    }
} satisfies RouteConfig;

export const deviceLinkOptions = {
  method: 'post',
  path: '/api/device-link/options',
  operationId: 'deviceLinkOptions',
  tags: ['passkeys'],
  summary: 'Redeem a device link (step 1): check the code, get creation options',
  description: `Called on the other device, which has no session: the code is the credential.
Returns creation options for the profile the code belongs to, and that profile's
id and name. Does not use the code up, so a dismissed passkey prompt can be tried again.
Wrong codes count toward a per-address pause of link redemption (see
*Throttling*). **Not** CSRF-exempt.`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              code: z.string().openapi({ description: 'Case, spaces and dashes are ignored.' })
            }), example: { code: 'K7WQ-2MZP-4HXA' } }
        }
      }
    },
  responses: {
      '200': {
        description: 'Ceremony options.',
        content: {
          'application/json': { schema: z.object({
              cid: z.string().optional(),
              options: WebAuthnRegistrationOptions.optional(),
              id: z.string().openapi({
                description: 'The profile\'s id (also the options\' user handle). Names are not unique; this is what tells two profiles apart.'
              }).optional(),
              name: z.string().openapi({ description: 'The profile this device is being added to.' }).optional(),
              recovery: z.boolean().openapi({
                description: 'Present (true) when the code is a recovery code (POST /api/admin/user/recovery, recover.js).'
              }).optional()
            }) }
        }
      },
      '400': R.LinkInvalid,
      '409': R.PasskeyLimit,
      '429': R.TooManyRequests
    }
} satisfies RouteConfig;

export const deviceLinkVerify = {
  method: 'post',
  path: '/api/device-link/verify',
  operationId: 'deviceLinkVerify',
  tags: ['passkeys'],
  summary: 'Redeem a device link (step 2): store the passkey and sign this device in',
  description: `Verifies the attestation against the challenge from step 1 (which must have been
made for this very code), stores the passkey on the code's profile, burns the code
and sets the session cookie; the passkey just made is what signs the device in.
Of two requests racing with one code, one wins. Audited as \`auth.link.ok\` (a recovery
code as \`auth.recovery.ok\`), and every refusal as \`auth.link.fail\`. A recovery code
also works on a profile at the passkey limit: the passkey used longest ago is removed
to make room. **Not** CSRF-exempt.`,
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              code: z.string(),
              cid: z.string(),
              credential: WebAuthnRegistrationCredential,
              name: z.string().max(40).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Added and signed in.',
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
        description: '`link-invalid` (see below), a challenge that expired or was made for another code, or an attestation that did not verify.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'that code is wrong, used or expired', code: 'link-invalid' } }
        }
      },
      '409': {
        description: '`credential-exists` or `passkey-limit`.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'credential already registered', code: 'credential-exists' } }
        }
      },
      '429': R.TooManyRequests
    }
} satisfies RouteConfig;
