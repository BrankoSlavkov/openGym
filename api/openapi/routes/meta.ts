/* Fork: the "meta" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, MediaConfig } from '../schemas.ts';

void z;

export const getHealth = {
  method: 'get',
  path: '/api/health',
  operationId: 'getHealth',
  tags: ['meta'],
  summary: 'Health check',
  description: `Always public. Also reports how many user accounts exist.

The check writes: it creates and removes one empty file under \`DATA_DIR\`,
because a server whose data directory is full or read-only has every write
path broken while the port still answers. It is a 503 when that fails — the
container healthcheck (\`wget --spider\`) reads the status and nothing else.

The probe runs at most once every five seconds and the answer in between is
the last one, so a poll can be that stale. The route is unauthenticated, and
one disk write per request is not something to leave open to anyone.`,
  security: [],
  responses: {
      '200': {
        description: 'The server is up and its data directory is writable.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(true).optional(),
              users: z.number().int().openapi({ description: 'Number of registered user accounts.' }).optional(),
              writable: z.literal(true).optional()
            }), example: { ok: true, users: 7, writable: true } }
        }
      },
      '503': {
        description: 'The data directory could not be written — a full disk, or a mount that came back read-only. Nothing that stores anything will work until it is fixed; the reason is in the container log.',
        content: {
          'application/json': { schema: z.object({
              ok: z.literal(false).optional(),
              writable: z.literal(false).optional()
            }), example: { ok: false, writable: false } }
        }
      }
    }
} satisfies RouteConfig;

export const getConfig = {
  method: 'get',
  path: '/api/config',
  operationId: 'getConfig',
  tags: ['meta'],
  summary: 'Instance configuration',
  description: `The flags the login screen needs before anyone is signed in. Both reflect
environment variables on the server (\`INVITE_ONLY\`, \`ALLOW_GUEST\`), and so does
\`password_login\`, which is there only when \`PASSWORD_LOGIN=1\`, and \`default_lang\`,
which is there only when \`DEFAULT_LANG\` is set.

\`media\` is there unless the instance runs with \`MEDIA_UPLOADS=0\`, for everybody: the
caps are not a secret, and its absence is how the app knows this server does not
store photos and videos at all.

A caller with a valid session also gets a \`coach\` key: the block when the
instance has the AI Coach switched on **and** a provider connected, and \`null\`
when it has not. A caller with no session gets no key at all. The block names
the provider this instance talks to, which is the same fact
\`GET /api/coach/disclosure\` will not hand out unauthenticated.

The key is always present for a session, \`null\` included, so a client that
caches this answer can tell "no Coach on this instance" from "you were not
signed in when you asked" and knows whether asking again would change it.`,
  security: [],
  responses: {
      '200': {
        description: 'Instance flags, plus the Coach block for a signed-in caller.',
        content: {
          'application/json': { schema: z.object({
              invite_only: z.boolean().openapi({ description: 'When true, registration requires a valid invite code.' }).optional(),
              allow_guest: z.boolean().openapi({
                description: 'When false, the client hides "continue without account". Guest mode is purely client-side and never calls this API.'
              }).optional(),
              signed_in: z.boolean().openapi({
                description: 'Whether this request carried a session `GET /api/me` would accept (cookie or Bearer). The cookie is HttpOnly, so this is how the app learns that nobody is signed in without asking `GET /api/me` and logging its 401. Since v1.4.5; absent on an older server, where the app asks as before.'
              }).optional(),
              coach: z.object({
                enabled: z.literal(true).optional(),
                provider: z.string().openapi({ description: 'Provider id, e.g. `anthropic`, `compatible`, `fixture`.' }).optional(),
                providerLabel: z.string().openapi({ description: 'Human-readable provider name.' }).optional(),
                authMode: z.enum(['instance', 'profile']).openapi({ description: 'Whose credential the jobs spend.' }).optional(),
                community: z.boolean().openapi({ description: 'Whether "compare with others" is offered on this instance.' }).optional(),
                web: z.boolean().openapi({ description: 'Whether the Coach may search the web for this instance.' }).optional()
              }).nullable().openapi({
                description: 'Present for a signed-in caller and absent otherwise; `null` when this instance has no Coach enabled and connected. Every Coach entry point in the client hangs off the block being there.'
              }).optional(),
              password_login: z.literal(true).openapi({
                description: 'Present (and true) only when the instance runs with PASSWORD_LOGIN=1; the client then offers name-and-password sign-in next to passkeys.'
              }).optional(),
              oidc: z.object({
                label: z.string().openapi({ example: 'Authentik' }).optional(),
                only: z.literal(true).optional()
              }).openapi({
                description: 'Present only when sign-in with an identity provider is configured. `label` names the provider on the button; `only` is there (true) with OIDC_ONLY=1.'
              }).optional(),
              default_lang: z.string().openapi({
                description: 'Present only when the instance runs with DEFAULT_LANG set: the language tag the sign-in screen, and every profile that has never picked a language in Settings, starts in. A profile\'s own choice always wins; a tag the app has no translation for is ignored.',
                example: 'pt-BR'
              }).optional(),
              media: MediaConfig.optional(),
              api_tokens: z.literal(true).openapi({ description: 'A signed-in caller on an instance with API_TOKENS: scoped tokens can be made (Settings → API tokens).' }).optional(),
              mcp: z.literal(true).openapi({ description: 'With api_tokens: the MCP server is served beside the app (/mcp).' }).optional(),
              shared: z.record(z.string(), z.unknown()).openapi({ description: 'A signed-in caller on an instance with the community library: its settings and the consent text in force.' }).optional(),
              trainers: z.object({
                on: z.literal(true),
                leadAccess: z.string(),
                roles: z.record(z.string(), z.unknown())
              }).openapi({ description: 'A signed-in caller on an instance with TRAINERS: the lead-trainer access mode and the caller\'s roles.' }).optional(),
              integrations: z.object({
                providers: z.array(z.string()).openapi({ example: ['webhook'] }).optional(),
                lan: z.literal(true).optional()
              }).openapi({
                description: 'Present for a signed-in caller when the server runs with INTEGRATIONS: the provider ids it offers, and `lan: true` with INTEGRATIONS_ALLOW_LAN=1.'
              }).optional()
            }), examples: {
              anonymous: { value: { invite_only: true, allow_guest: false } },
              signedInNoCoach: { value: { invite_only: true, allow_guest: false, coach: null } },
              signedIn: {
                value: {
                  invite_only: true,
                  allow_guest: false,
                  coach: {
                    enabled: true,
                    provider: 'compatible',
                    providerLabel: 'OpenAI-compatible endpoint',
                    authMode: 'instance',
                    community: false
                  }
                }
              },
              passwordLogin: { value: { invite_only: true, allow_guest: false, password_login: true } },
              media: {
                value: {
                  invite_only: false,
                  allow_guest: true,
                  media: {
                    imageMB: 2,
                    gifMB: 8,
                    videoMB: 100,
                    videoSec: 60,
                    audioMB: 2,
                    quotaMB: 200,
                    workouts: true,
                    sounds: true,
                    avatar: true
                  }
                }
              }
            } }
        }
      }
    }
} satisfies RouteConfig;

// Fork: the routes that publish this document (openapi/serve.ts).
export const getOpenApiDocument = {
  method: 'get',
  path: '/api/openapi.json',
  operationId: 'getOpenApiDocument',
  tags: ['meta'],
  summary: 'This OpenAPI document',
  description: 'The OpenAPI 3.2 description of every route, generated from the route definitions in api/openapi/. The frontend\'s Orval client is generated from it (api/openapi.json holds the same document).',
  security: [],
  responses: {
    '200': { description: 'The document.', content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } } }
  }
} satisfies RouteConfig;

export const getApiDocs = {
  method: 'get',
  path: '/api/docs',
  operationId: 'getApiDocs',
  tags: ['meta'],
  summary: 'Interactive API documentation',
  description: 'Swagger UI over GET /api/openapi.json, served by the api itself (no CDN, nothing inline).',
  security: [],
  responses: {
    '200': { description: 'The page.', content: { 'text/html': { schema: z.string() } } }
  }
} satisfies RouteConfig;

export const getApiDocsFile = {
  method: 'get',
  path: '/api/docs/{file}',
  operationId: 'getApiDocsFile',
  tags: ['meta'],
  summary: 'A file of the documentation page',
  description: 'Swagger UI\'s stylesheet, script and icon, and the script that starts it.',
  security: [],
  request: {
    params: z.object({ file: z.string().regex(/^[a-z0-9-]+\.(?:css|js|png)$/).openapi({ example: 'swagger-ui.css' }) })
  },
  responses: {
    '200': { description: 'The file.' },
    '404': { description: 'No such file.', content: { 'application/json': { schema: ErrorBody } } }
  }
} satisfies RouteConfig;
