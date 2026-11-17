/* Fork: the "mcp" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import * as R from '../responses.ts';

void z;

export const getOauthServerMetadata = {
  method: 'get',
  path: '/.well-known/oauth-authorization-server',
  operationId: 'getOauthServerMetadata',
  tags: ['mcp'],
  summary: 'MCP connector: authorization server metadata (RFC 8414)',
  description: 'Only with `MCP=on`. Under `BASE_PATH` also at `/.well-known/oauth-authorization-server<BASE_PATH>` (path insertion). Advertises DCR, Client ID Metadata Documents, refresh tokens (`offline_access`), revocation and the `iss` response parameter (RFC 9207).',
  responses: {
      '200': {
        description: 'Issuer, endpoints, S256, public clients, the scopes.',
        content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } }
      }
    }
} satisfies RouteConfig;

export const getOauthServerMetadataOidc = {
  method: 'get',
  path: '/.well-known/openid-configuration',
  operationId: 'getOauthServerMetadataOidc',
  tags: ['mcp'],
  summary: 'MCP connector: the same metadata under its OpenID Connect discovery name',
  description: 'The MCP spec\'s clients look here after RFC 8414; under `BASE_PATH` this is the address below the prefix (`<BASE_PATH>/.well-known/openid-configuration`). openGym issues no ID tokens.',
  responses: {
      '200': {
        description: 'As `/.well-known/oauth-authorization-server`.',
        content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } }
      }
    }
} satisfies RouteConfig;

export const getOauthResourceMetadata = {
  method: 'get',
  path: '/.well-known/oauth-protected-resource',
  operationId: 'getOauthResourceMetadata',
  tags: ['mcp'],
  summary: 'MCP connector: protected resource metadata (RFC 9728)',
  description: 'The document the mcp container\'s 401 points at. `resource` is `<ORIGIN>/mcp`.',
  responses: {
      '200': {
        description: '`resource`, `authorization_servers`, `scopes_supported`.',
        content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } }
      }
    }
} satisfies RouteConfig;

export const getOauthResourceMetadataMcp = {
  method: 'get',
  path: '/.well-known/oauth-protected-resource/mcp',
  operationId: 'getOauthResourceMetadataMcp',
  tags: ['mcp'],
  summary: 'MCP connector: the same document at the path-suffixed address',
  responses: {
      '200': {
        description: 'As above.',
        content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } }
      }
    }
} satisfies RouteConfig;

export const postOauthRegister = {
  method: 'post',
  path: '/api/oauth/register',
  operationId: 'postOauthRegister',
  tags: ['mcp'],
  summary: 'MCP connector: register an OAuth client (RFC 7591)',
  description: 'Only with `MCP=on`. Public clients (no secret), redirect URIs https or loopback only. Used by Claude and ChatGPT when they add openGym as a custom connector (docs/MCP_REMOTE.md).',
  responses: {
      '429': R.err('Too many registrations from this address (`locked`, with `retryAfter`).'),
      '201': {
        description: 'The client: `client_id`, `redirect_uris`, `token_endpoint_auth_method: none`.',
        content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } }
      },
      '400': {
        description: 'Bad redirect URIs.'
      }
    }
} satisfies RouteConfig;

export const getOauthAuthorize = {
  method: 'get',
  path: '/api/oauth/authorize',
  operationId: 'getOauthAuthorize',
  tags: ['mcp'],
  summary: 'MCP connector: start the sign-in',
  description: 'Checks the client, the redirect URI and the PKCE S256 challenge, then redirects to the app\'s consent page. An error goes back to the client\'s redirect URI when it is a known one.',
  responses: {
      '429': R.err('Too many sign-ins from this address (`locked`, with `retryAfter`).'),
      '302': {
        description: 'To the consent page, or back to the client with an error.'
      },
      '400': {
        description: 'Unknown client or redirect URI.'
      }
    }
} satisfies RouteConfig;

export const getOauthRequest = {
  method: 'get',
  path: '/api/oauth/request',
  operationId: 'getOauthRequest',
  tags: ['mcp'],
  summary: 'MCP connector: what the consent page shows',
  responses: {
      '200': {
        description: 'The assistant, where it sends you back, the scopes asked for.',
        content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Expired.'
      }
    }
} satisfies RouteConfig;

export const postOauthApprove = {
  method: 'post',
  path: '/api/oauth/approve',
  operationId: 'postOauthApprove',
  tags: ['mcp'],
  summary: 'MCP connector: approve, making a scoped token',
  responses: {
      '200': {
        description: '`redirect`: back to the assistant with a one-time code.',
        content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } }
      },
      '401': R.Unauthorized
    }
} satisfies RouteConfig;

export const postOauthDeny = {
  method: 'post',
  path: '/api/oauth/deny',
  operationId: 'postOauthDeny',
  tags: ['mcp'],
  summary: 'MCP connector: decline',
  responses: {
      '200': {
        description: '`redirect`: back to the assistant with access_denied.'
      }
    }
} satisfies RouteConfig;

export const postOauthToken = {
  method: 'post',
  path: '/api/oauth/token',
  operationId: 'postOauthToken',
  tags: ['mcp'],
  summary: 'MCP connector: trade the code for the token',
  description: '`application/x-www-form-urlencoded`, `grant_type=authorization_code`, the code, the `code_verifier`, `client_id` and `redirect_uri`. The code works once, for ten minutes. A client that asked for `offline_access` (or registered the `refresh_token` grant) also gets a `refresh_token`; its access token then lives a day. `grant_type=refresh_token` rotates both; a refresh token used again after the grace minute ends the connection.',
  responses: {
      '200': {
        description: '`access_token` (an ogt_ token), `token_type: Bearer`, `scope`, `expires_in`, `refresh_token` when asked for.'
      },
      '400': {
        description: '`invalid_grant` and friends.'
      }
    }
} satisfies RouteConfig;

export const postOauthRevoke = {
  method: 'post',
  path: '/api/oauth/revoke',
  operationId: 'postOauthRevoke',
  tags: ['mcp'],
  summary: 'MCP connector: end a connection (RFC 7009)',
  description: '`token=` an access or refresh token of a connector. The token row goes, as if revoked in Settings → API tokens. Always 200.',
  responses: {
      '200': {
        description: 'Done, or nothing to do.'
      }
    }
} satisfies RouteConfig;
