/* Fork: the api's router is Hono (FORK.md, "The api on Bun and Hono").
 *
 * The route table in server.js and the modules beside it stays upstream-shaped: one
 * `'METHOD /path': async (req, res) => {}` per route, `{name}` for a path parameter. Keeping it
 * that way is what keeps upstream's api commits portable. This file turns that table into a Hono
 * app and gives node's own req and res to each handler (c.env.incoming / c.env.outgoing from
 * @hono/node-server), so a handler reads its body and writes its answer exactly as before.
 *
 * A route converted to Hono proper is wrapped in `native()`: it gets the Hono context and returns
 * a Response. Both kinds sit in the same table and pass the same guard and error handling.
 *
 * What stays outside Hono, in server.js: the body deadline and the path check (they need the raw
 * socket and the raw target, before any parsing). What is here: CORS and preflight, routing and
 * path parameters, the per-route guard, the error answer and the 404.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Hono, type Context } from 'hono';
import type { ZodType } from 'zod';
import { ROUTE_BY_KEY } from './openapi/document.ts';
import { RequestInvalid, checkQuery, jsonBodySchema, CHECK_RESPONSES, report } from './openapi/validate.ts';
import { getRequestListener, RequestError } from '@hono/node-server';
import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response';

/* The one pattern each path parameter may match, and the property of req a handler reads it
   from (the names server.js's dispatcher used before this file). A parameter not listed here is
   a mistake in the table, refused at start. */
export const PARAMS: Record<string, { re: string; prop: 'mediaHash' | 'itemId' | 'calToken' | 'targetUid' | 'docFile' }> = {
  hash: { re: '[0-9a-f]{64}', prop: 'mediaHash' },
  id: { re: 's_[a-z2-7]{16}', prop: 'itemId' },
  token: { re: 'ogt_[A-Za-z0-9_-]{43}', prop: 'calToken' },
  uid: { re: '[A-Za-z0-9_-]{1,64}', prop: 'targetUid' },
  // openapi/serve.ts DOC_FILE_RE: Swagger UI's files under /api/docs/
  file: { re: '[a-z0-9-]+\\.(?:css|js|png)', prop: 'docFile' }
};

const PARAM_RE = /\{(\w+)\}([^/]*)/g;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** '/api/calendar/{token}.ics' -> '/api/calendar/:token{ogt_[A-Za-z0-9_-]{43}\.ics}' */
export function honoPath(template: string): string {
  return template.replace(PARAM_RE, (_, name: string, suffix: string) => {
    const p = PARAMS[name];
    if (!p) throw new Error(`no pattern for {${name}} in ${template}`);
    return `:${name}{${p.re}${escapeRe(suffix)}}`;
  });
}

const NATIVE = Symbol('native');

/** node's request as the handlers see it: the path parameters and the routed path ride on it. */
export type ApiRequest = IncomingMessage & {
  routePath?: string;
  mediaHash?: string;
  itemId?: string;
  calToken?: string;
  targetUid?: string;
  docFile?: string;
  /** The route's table key, 'GET /api/media/{hash}'. */
  routeKey?: string;
  /** The route's JSON body schema: readBody checks what it parses against it (openapi/validate.ts). */
  bodySchema?: ZodType | null;
  [key: string]: unknown;
};
export type Env = { Bindings: { incoming: ApiRequest; outgoing: ServerResponse } };
export type ApiContext = Context<Env>;
/** A route written for node's req and res, as upstream writes them. */
export type LegacyHandler = (req: ApiRequest, res: ServerResponse) => unknown;
/** A route written for Hono: (c, key) => Response. */
export type NativeHandler = ((c: ApiContext, key: string) => Response | Promise<Response>) & { [NATIVE]: true };
export type Handler = LegacyHandler | NativeHandler;
export type Routes = Record<string, Handler>;

/** Marks a handler written for Hono: (c, key) => Response. */
export const native = (fn: (c: ApiContext, key: string) => Response | Promise<Response>): NativeHandler =>
  Object.assign(fn, { [NATIVE]: true as const });
const isNative = (h: Handler): h is NativeHandler => NATIVE in h;

export type ApiOptions = {
  routes: Routes;
  /** true when it answered (the preflight); sets the CORS headers otherwise */
  cors: (req: ApiRequest, res: ServerResponse) => boolean;
  /** true to let the handler run; false when it already answered */
  guard: (key: string, req: ApiRequest, res: ServerResponse) => boolean | Promise<boolean>;
  /** writes the answer for an error a handler threw */
  fail: (key: string, error: unknown, res: ServerResponse) => void;
  /** writes the 404 */
  notFound: (res: ServerResponse) => void;
  /** the Response for a request Hono cannot build (an unusable Host header) */
  badRequest: () => Response;
  /** the Response for anything else that escaped (a 500) */
  crashed: (error: unknown) => Response;
};

/**
 * The request listener for node:http. The path routed on is req.routePath, which the caller sets
 * after its own checks.
 */
export function createApi({ routes, cors, guard, fail, notFound, badRequest, crashed }: ApiOptions) {
  const app = new Hono<Env>({ getPath: (_req, opts) => (opts?.env as Env['Bindings'] | undefined)?.incoming.routePath ?? '/' });

  app.use('*', async (c, next) => {
    if (cors(c.env.incoming, c.env.outgoing)) return RESPONSE_ALREADY_SENT;
    await next();
  });

  app.notFound(c => { notFound(c.env.outgoing); return RESPONSE_ALREADY_SENT; });

  for (const [key, handler] of Object.entries(routes)) {
    const sp = key.indexOf(' ');
    const method = key.slice(0, sp), template = key.slice(sp + 1);
    const params = [...template.matchAll(PARAM_RE)].map(([, name = '', suffix = '']) => {
      const p = PARAMS[name];
      if (!p) throw new Error(`no pattern for {${name}} in ${template}`);
      return { name, suffix, prop: p.prop };
    });
    // Its OpenAPI definition (openapi/routes/): what the request is checked against.
    const def = ROUTE_BY_KEY.get(key);
    app.on(method, honoPath(template), async c => {
      const { incoming: req, outgoing: res } = c.env;
      // Hono answers HEAD with the GET route. The table never did, and still does not.
      if (req.method !== method) { notFound(res); return RESPONSE_ALREADY_SENT; }
      for (const p of params) {
        const v = c.req.param(p.name) ?? '';
        req[p.prop] = p.suffix ? v.slice(0, -p.suffix.length) : v;
      }
      req.routeKey = key;
      (res as ServerResponse & { routeKey?: string }).routeKey = key;
      req.bodySchema = jsonBodySchema(def);
      try {
        if (!(await guard(key, req, res))) return RESPONSE_ALREADY_SENT;
        checkQuery(def, req.url);
        if (isNative(handler)) return await handler(c, key);
        await handler(req, res);
      } catch (e) {
        if (e instanceof RequestInvalid) {
          if (CHECK_RESPONSES) report(`${key} request refused: ${JSON.stringify(e.issues)}`);
          if (!res.headersSent) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(e.body));
          }
        } else fail(key, e, res);
      }
      return RESPONSE_ALREADY_SENT;
    });
  }

  // autoCleanupIncoming off: the handlers read (or leave) their bodies themselves, and
  // server.js's body deadline is what ends a body nobody reads. overrideGlobalObjects off: the
  // runtime's own Request and Response stay the globals the coach's fetch code uses.
  return getRequestListener(app.fetch, {
    hostname: 'localhost',
    autoCleanupIncoming: false,
    overrideGlobalObjects: false,
    errorHandler: async e => (e instanceof RequestError ? badRequest() : crashed(e))
  });
}
