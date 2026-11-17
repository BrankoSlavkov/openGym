/* Fork: the api's OpenAPI 3.2 document, built from the route definitions in routes/ (FORK.md,
 * "The api on Bun and Hono"). Served at GET /api/openapi.json, browsable at GET /api/docs, and
 * written to api/openapi.json (`bun run openapi`) for the frontend's Orval client.
 *
 * @hono/zod-openapi writes 3.0 and 3.1 only; the 3.2 generator comes from the library it is built
 * on (@asteasolutions/zod-to-openapi), fed the same route definitions.
 */
import { OpenAPIRegistry, OpenApiGeneratorV32, zodToOpenAPIRegistry, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';
import { INFO, SECURITY, SECURITY_SCHEMES, SERVERS, TAGS } from './meta.ts';
import { ROUTES } from './routes/index.ts';
import * as SCHEMAS from './schemas.ts';

export const OPENAPI_VERSION = '3.2.0';

/** 'GET /api/media/{hash}', the key the route table (server.ts) uses for the same route. */
export const routeKey = (r: Pick<RouteConfig, 'method' | 'path'>) => `${r.method.toUpperCase()} ${r.path}`;

const errorJson = (description: string) => ({ description, content: { 'application/json': { schema: SCHEMAS.ErrorBody } } });

/* The answers the shared machinery gives on any route, before or around its handler (server.ts
 * guard and readBody, openapi/validate.ts). Added to a route's definition where it does not
 * document that status itself, so a generated client knows every status it can meet. */
const COMMON = {
  invalid: errorJson('The request\'s shape does not match this definition (`invalid-request`, with `issues`), or its JSON does not parse.'),
  origin: errorJson('A cross-origin request from a browser (`origin-mismatch`, with `expected`): the page is not on this server\'s ORIGIN.'),
  tooLarge: errorJson('The body is larger than the server takes (5 MB for JSON).'),
  notJson: errorJson('The body is not `application/json`.'),
  noBody: 'An error. Every error answer is JSON in this one shape.'
};

/** A route's definition with the common answers it does not document itself. */
export function withCommonResponses(route: RouteConfig): RouteConfig {
  const responses = { ...route.responses };
  const json = !!route.request?.body?.content?.['application/json'];
  const add = (status: string, r: (typeof route.responses)[string]) => { if (!responses[status]) responses[status] = r; };
  if (json || route.request?.query) add('400', COMMON.invalid);
  if (route.method !== 'get') add('403', COMMON.origin);
  if (json) { add('413', COMMON.tooLarge); add('415', COMMON.notJson); }
  // An error documented without a body still answers with one: json() is the only way out.
  for (const [status, r] of Object.entries(responses)) {
    if (+status >= 400 && !('$ref' in r) && !r.content) responses[status] = { ...r, ...errorJson(r.description || COMMON.noBody) };
  }
  return { ...route, responses };
}

/** Every route definition, with the common answers, in document order. */
export const API_ROUTES: readonly RouteConfig[] = ROUTES.map(withCommonResponses);

/** Every route definition by its route-table key. */
export const ROUTE_BY_KEY: ReadonlyMap<string, RouteConfig> = new Map(API_ROUTES.map(r => [routeKey(r), r]));

let cached: ReturnType<OpenApiGeneratorV32['generateDocument']> | null = null;

/** The document. Built once: the definitions are code, they do not change while the server runs. */
export function openApiDocument() {
  if (cached) return cached;
  const registry = new OpenAPIRegistry();
  for (const [name, scheme] of Object.entries(SECURITY_SCHEMES)) registry.registerComponent('securitySchemes', name, scheme as never);
  // Every shared schema is a component, referenced or not, so a client generator sees them all,
  // under the name it gives itself (.openapi('Error') on ErrorBody), not its variable's.
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const refId = (zodToOpenAPIRegistry.get(schema as ZodType) as { _internal?: { refId?: string } } | undefined)?._internal?.refId;
    registry.register(refId ?? name, schema as ZodType);
  }
  for (const route of API_ROUTES) registry.registerPath(route);
  cached = new OpenApiGeneratorV32(registry.definitions).generateDocument({
    openapi: OPENAPI_VERSION,
    info: INFO as never,
    servers: SERVERS,
    tags: TAGS,
    security: SECURITY
  });
  return cached;
}
