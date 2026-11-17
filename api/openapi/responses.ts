/* Fork: the shared responses of the api (#/components/responses in upstream's yaml), inlined
 * into each route that names them.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { ResponseConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody } from './schemas.ts';

void z;

export const TokenRefused = {
  description: 'No token, an unknown, expired or revoked one, or its profile signed out everywhere or is disabled.',
  headers: { "WWW-Authenticate": { schema: { type: 'string' }, description: 'Bearer error="invalid_token"' } },
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'token not accepted', code: 'token-invalid' } }
  }
} satisfies ResponseConfig;

export const Unauthorized = {
  description: 'No session, expired/revoked session, or a disabled account.',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'not signed in' } }
  }
} satisfies ResponseConfig;

export const Forbidden = {
  description: 'Signed in, but not an admin. The attempt is recorded in the audit log.',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'forbidden' } }
  }
} satisfies ResponseConfig;

export const SharingOff = {
  description: 'The community library is off on this server (`sharing-off`, `LIBRARY` unset), or the item does not exist or is not one the caller may see (`not-found`).',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'the community library is off on this server', code: 'sharing-off' } }
  }
} satisfies ResponseConfig;

export const RateLimited = {
  description: 'Over a per-account budget (`rate-limited`); `Retry-After` says when to try again.',
  headers: { "Retry-After": { schema: { type: 'integer' } } },
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'slow down a little', code: 'rate-limited', retryAfter: 120 } }
  }
} satisfies ResponseConfig;

export const CoachOff = {
  description: 'The Coach is not set up on this instance (switched off, or no provider connected). Every Coach route answers this rather than pretending, so an unconfigured instance renders exactly the app it was before the feature existed. `code` is `off`, the class a job refused at enqueue for the same reason carries; the app shows its own line for it.',
  content: {
    'application/json': { schema: z.object({
        error: z.string().optional(),
        code: z.enum(['off']).optional()
      }), example: { error: 'the Coach is not set up on this instance', code: 'off' } }
  }
} satisfies ResponseConfig;

export const CoachJobQueued = {
  description: 'Queued. The job runs in the background; its outcome arrives through `GET /api/coach/status`, which the client polls.',
  content: {
    'application/json': { schema: z.object({
        job: z.object({
          id: z.string().openapi({ description: '16 hex characters.' }).optional()
        }).optional()
      }), example: { job: { id: '9f1c2d3e4a5b6c7d' } } }
  }
} satisfies ResponseConfig;

export const CoachRefused = {
  description: `The Coach will not take this job, and says which reason in \`code\`:

- \`busy\` (409): a job for this profile is already running.
- \`shared\` (409): instance mode, and the credential belongs to another profile.
- \`cap\` (429): this profile's or the instance's daily limit is spent.
- \`consent\` (403): no consent recorded for this profile.
- \`unprivileged\` (503): the privilege drop cannot be performed, so no job runs.

The message is the one to show; the raw provider detail never reaches the user.`,
  content: {
    'application/json': { schema: z.object({
        error: z.string().optional(),
        code: z.enum(['off', 'busy', 'cap', 'consent', 'shared', 'unprivileged']).optional()
      }), example: { error: 'the Coach is already thinking about your training', code: 'busy' } }
  }
} satisfies ResponseConfig;

export const IntegrationsOff = {
  description: '`code` `off`: the server runs without `INTEGRATIONS` (the default). `code` `missing`: no such connection on this profile (another profile\'s id is the same answer).',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'integrations are off on this server', code: 'off' } }
  }
} satisfies ResponseConfig;

export const IntegrationsSlowDown = {
  description: 'Connect, change or test tapped too often (20 a minute, tests 6). Try again after `Retry-After`.',
  headers: { "Retry-After": { description: 'Seconds to wait.', schema: { type: 'integer' } } },
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'slow down a little', code: 'rate', retryAfter: 9 } }
  }
} satisfies ResponseConfig;

export const TooManyRequests = {
  description: 'Paused by the sign-in throttle (see *Throttling* in the description). The request was not looked at; try again after `Retry-After` seconds.',
  headers: { "Retry-After": { description: 'Seconds until the pause ends.', schema: { type: 'integer' } } },
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'too many attempts, try again later', code: 'locked', retryAfter: 60 } }
  }
} satisfies ResponseConfig;

export const Busy = {
  description: 'Every password check slot and the short queue behind them are taken.',
  headers: { "Retry-After": { schema: { type: 'integer' } } },
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'the server is busy, try again in a moment', code: 'busy' } }
  }
} satisfies ResponseConfig;

export const PasswordPolicy = {
  description: 'The new password breaks the policy (`too-short` under 10 characters, `too-long` over 256, or `too-common`), or a field is `missing`.',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'this password is too easy to guess', code: 'too-common' } }
  }
} satisfies ResponseConfig;

export const NameTaken = {
  description: 'Another profile already signs in with this name, or holds it with a reset code that has not been used or expired yet.',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'another profile already signs in with this name', code: 'name-taken' } }
  }
} satisfies ResponseConfig;

export const ProofRefused = {
  description: 'No acceptable proof that the owner is here: `passkey-required` (no password that counts, because none is set or `PASSWORD_LOGIN` is off, so a passkey has to confirm), `passkey` (the assertion did not verify, belongs to another profile, or was made for another challenge, one handed out for another ceremony or one already used), `current-required` or `current-wrong`.',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'confirm with your passkey first', code: 'passkey-required' } }
  }
} satisfies ResponseConfig;

export const PasskeyLimit = {
  description: 'The profile already has the most passkeys it can have (20).',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'a profile can have at most 20 passkeys', code: 'passkey-limit' } }
  }
} satisfies ResponseConfig;

export const LinkInvalid = {
  description: 'The code is wrong, used, replaced or expired, or its profile is gone or disabled: one answer for all of them.',
  content: {
    'application/json': { schema: ErrorBody, example: { error: 'that code is wrong, used or expired', code: 'link-invalid' } }
  }
} satisfies ResponseConfig;

/** An error answer of this route, in the one error shape (Error). Fork: for statuses added by hand. */
export const err = (description: string) => ({ description, content: { 'application/json': { schema: ErrorBody } } }) satisfies ResponseConfig;
