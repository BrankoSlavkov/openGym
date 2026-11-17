/* Fork: the "oidc" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, Ok, SessionUser } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const oidcStart = {
  method: 'get',
  path: '/api/oidc/start',
  operationId: 'oidcStart',
  tags: ['oidc'],
  summary: 'Leave for the identity provider',
  description: `A browser navigation, not a fetch. Answers 302 to the provider's authorization
endpoint with the authorization code flow, PKCE (S256), a fresh \`state\` and \`nonce\`,
and sets a 10-minute \`gymoidc\` cookie (\`__Host-gymoidc\` over https) that ties the
callback to this browser. \`mode\`: \`web\` (default), \`app\` (the phone app, see below),
\`link\` (Settings, with the \`ticket\` from POST /api/oidc/link, in the browser signed in
as that profile), or \`reauth\` (sign in at the provider again, \`prompt=login\`, so the
next change to a way in may use \`provider: true\` as its proof).

For \`mode=app\`, \`return\` must be exactly \`opengym://oidc\`, \`challenge\` the base64url
SHA-256 of a verifier only the app holds (43 characters), and \`astate\` the app's own
state, which comes back unchanged. Anything else is a 400, never a redirect.`,
  security: [],
  request: {
      query: z.object({
        mode: z.enum(['web', 'app', 'link', 'reauth']).optional(),
        ticket: z.string().optional(),
        return: z.string().openapi({ enum: ['opengym://oidc'], description: 'The app\'s return address; anything else is refused (code oidc-return).' }).optional(),
        challenge: z.string().regex(new RegExp('^[A-Za-z0-9_-]{43}$')).optional(),
        astate: z.string().regex(new RegExp('^[A-Za-z0-9_-]{16,128}$')).optional()
      })
    },
  responses: {
      '302': {
        description: 'To the provider; or, when the start itself fails, back to the app with `?oidc-error=<code>` (`throttled`, `provider`, `link-expired`).'
      },
      '400': {
        description: 'An unknown mode, or app parameters that are not allowed.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const oidcCallback = {
  method: 'get',
  path: '/api/oidc/callback',
  operationId: 'oidcCallback',
  tags: ['oidc'],
  summary: 'Come back from the identity provider',
  description: `The redirect URI to register at the provider: \`<ORIGIN>/api/oidc/callback\` (or
OIDC_REDIRECT_URI). Checks the \`state\` and the flow cookie, trades the code at the
token endpoint with the PKCE verifier, and verifies the ID token: the signature against
the provider's JWKS (RS*, PS*, ES*, EdDSA; never \`none\` or HS*), \`iss\`, \`aud\`/\`azp\`,
\`exp\`, \`iat\`, \`nbf\` and the \`nonce\`. Groups and the e-mail are read from userinfo when
the ID token has none.

Then: a profile linked to this identity signs in; otherwise, with OIDC_EMAIL_LINKING=1,
a profile whose sign-in e-mail matches a \`email_verified: true\` address is linked;
otherwise a new profile is made, if the groups let this person in (OIDC_ALLOWED_GROUPS,
or an \`access=\` rule in OIDC_ROLE_MAP) and FIRST_USER_ADMIN applies as for any sign-up.
Answers 302 to the app with \`?oidc=signed-in|linked|confirmed\` and a session cookie, or
\`?oidc-error=<code>\`: \`state\`, \`token\`, \`provider\`, \`cancelled\`, \`group\`, \`link-needed\`,
\`invite\`, \`disabled\`, \`taken\`, \`already-linked\`, \`wrong-account\`, \`link-expired\`,
\`throttled\`. In app mode, 302 to \`opengym://oidc?code=…&astate=…\` (or \`error=\`) and no
cookie. Rate-limited per address; wrong states and tokens count toward the address pause.`,
  security: [],
  request: {
      query: z.object({
        state: z.string().optional(),
        code: z.string().optional(),
        error: z.string().optional()
      })
    },
  responses: {
      '302': {
        description: 'Back to the app (see above).'
      }
    }
} satisfies RouteConfig;

export const oidcAppRedeem = {
  method: 'post',
  path: '/api/oidc/app/redeem',
  operationId: 'oidcAppRedeem',
  tags: ['oidc'],
  summary: 'Trade the phone app\'s one-time code for a Bearer token',
  description: 'The code from `opengym://oidc?code=…` and the verifier whose SHA-256 the app sent as `challenge`. One try per code, 2 minutes. Returns the same token POST /api/pair/redeem does. CSRF-exempt, like pair/redeem: the credential is in the body, and nothing comes back as a cookie.',
  security: [],
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              code: z.string(),
              verifier: z.string().min(43).max(128)
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Signed in.',
        content: {
          'application/json': { schema: z.object({
              token: z.string().optional(),
              user: SessionUser.optional()
            }) }
        }
      },
      '400': {
        description: 'Unknown, used or expired code, or the wrong verifier (`oidc-invalid`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': {
        description: 'Too many tries from this address.'
      }
    }
} satisfies RouteConfig;

export const oidcLink = {
  method: 'post',
  path: '/api/oidc/link',
  operationId: 'oidcLink',
  tags: ['oidc'],
  summary: 'Start linking the provider to this profile',
  description: 'Asks the same proof as adding a passkey (a passkey assertion with `cid` and `credential`, or the current password where that counts). Returns a one-time URL, good for two minutes and only in this signed-in browser, to navigate to.',
  request: {
      body: {
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The address to go to.',
        content: {
          'application/json': { schema: z.object({
              url: z.string().openapi({ example: '/api/oidc/start?mode=link&ticket=…' }).optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'The proof was missing or wrong.'
      },
      '409': {
        description: 'The profile is linked already (`already-linked`).'
      }
    }
} satisfies RouteConfig;

export const oidcUnlink = {
  method: 'post',
  path: '/api/oidc/unlink',
  operationId: 'oidcUnlink',
  tags: ['oidc'],
  summary: 'Unlink the provider from this profile',
  description: 'Never the last way in (`409 last-way-in`). The same proof as removing a passkey; `provider: true` counts within five minutes of a provider sign-in.',
  request: {
      body: {
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Unlinked (or was not linked).',
        content: {
          'application/json': { schema: Ok }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'The proof was missing or wrong (`reauth-required` for a stale provider proof).'
      },
      '409': {
        description: 'The provider is the only way in (`last-way-in`).'
      }
    }
} satisfies RouteConfig;
