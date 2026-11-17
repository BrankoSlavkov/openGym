/* Fork: requests checked against the OpenAPI route definitions, and (opt-in) responses too.
 *
 * Bodies are checked where a handler reads them (server.ts readBody), not before the handler runs:
 * a handler decides who may call it before it reads anything, so a signed-out caller with a bad
 * body still gets its 401, and nobody's unread body is read on their behalf. The query string is
 * checked before the handler, after the route's guard (origin check, sign-in throttle).
 *
 * What is enforced is the shape: a value that is there but of the wrong JSON type, or not one of
 * the values an enum or literal allows. What is left to the handler is the rules and their wording:
 * a missing field (absent or null), a length, a size, a pattern or a format. Those answers are the handler's own on
 * purpose (a missing password is a wrong password, counted toward the sign-in pause and audited;
 * "password must be at least 10 characters" is what the app shows), and the spec still documents
 * every one of them, so a generated client's types say what is required.
 *
 * The answer to a request whose shape the spec does not allow is a 400:
 *   { error: 'invalid request: <first problem>', code: 'invalid-request', issues: [{ in, path, message }] }
 *
 * The schemas validate and do not transform: a handler gets the body exactly as it was sent,
 * extra fields included (object schemas ignore keys they do not name).
 *
 * OPENAPI_RESPONSES=check (OPENAPI_REPORT=<file> to collect them in one file; `bun run openapi:check`
 * runs the whole test suite that way) logs every JSON answer that does not match its route's response schema
 * for that status, and every field the schema does not name (`openapi: ...` lines). That keeps the
 * types the frontend's Orval client is generated from honest. Off by default: it costs a parse per
 * answer.
 */
import fs from 'node:fs';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';

type Issue = { in: 'body' | 'query'; path: string; message: string };

export class RequestInvalid extends Error {
  readonly status = 400;
  readonly issues: Issue[];
  constructor(issues: Issue[]) {
    const first = issues[0];
    super('invalid request' + (first ? `: ${first.path ? first.path + ': ' : ''}${first.message}` : ''));
    this.issues = issues;
  }
  get body() {
    return { error: this.message, code: 'invalid-request', issues: this.issues.slice(0, 20) };
  }
}

const isZod = (s: unknown): s is ZodType => !!s && typeof (s as ZodType).safeParse === 'function';

/* Schemas that describe without binding: the app state document (State) above all, which the
 * server stores as sent and whose schema says so ("representative, not enforced"). Nothing inside
 * one is checked here; the handler checks what it relies on, in its own words. */
const REPRESENTATIVE = new WeakSet<object>();
export function representative<T extends ZodType>(schema: T): T {
  REPRESENTATIVE.add(schema);
  return schema;
}

type Def = { type?: string; shape?: Record<string, ZodType>; innerType?: ZodType; element?: ZodType };
const defOf = (s: ZodType): Def => (s as unknown as { _zod: { def: Def } })._zod?.def ?? {};

/** The paths in a body schema where a representative schema sits ('state', 'items.0.doc'...). */
function representativePaths(schema: ZodType, at: string[] = [], out: string[] = [], depth = 0): string[] {
  if (depth > 12) return out;
  if (REPRESENTATIVE.has(schema)) { out.push(at.join('.')); return out; }
  const d = defOf(schema);
  if (d.innerType) return representativePaths(d.innerType, at, out, depth + 1);    // optional, nullable, default
  if (d.type === 'object' && d.shape) for (const [k, v] of Object.entries(d.shape)) representativePaths(v, [...at, k], out, depth + 1);
  return out;
}
const pathsCache = new WeakMap<object, string[]>();
const representativeOf = (schema: ZodType) => {
  if (!pathsCache.has(schema)) pathsCache.set(schema, representativePaths(schema));
  return pathsCache.get(schema)!;
};
const under = (path: PropertyKey[], prefixes: string[]) => {
  const p = path.map(String).join('.');
  return prefixes.some(x => x === '' || p === x || p.startsWith(x + '.'));
};

/** The schema of a route's JSON body, if it declares one. */
export function jsonBodySchema(route: RouteConfig | undefined): ZodType | null {
  const media = route?.request?.body?.content?.['application/json'];
  const schema = media && 'schema' in media ? media.schema : null;
  return isZod(schema) ? schema : null;
}

type ZodIssueLike = { code?: string; path: PropertyKey[]; message: string };

function issuesOf(where: Issue['in'], error: { issues: ZodIssueLike[] }): Issue[] {
  return error.issues.map(i => ({ in: where, path: i.path.map(String).join('.'), message: i.message }));
}

const valueAt = (v: unknown, path: PropertyKey[]) =>
  path.reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<PropertyKey, unknown>)[k] : undefined), v);

// The rules a handler answers itself, in its own words (see the top of this file).
const HANDLER_RULES = new Set(['too_small', 'too_big', 'invalid_format', 'not_multiple_of']);

/** The issues that are about the request's shape; the rest are the handler's to answer. */
function shapeIssues(issues: ZodIssueLike[], input: unknown, skip: string[] = []): ZodIssueLike[] {
  return issues.filter(i => !HANDLER_RULES.has(i.code ?? '') && valueAt(input, i.path) != null && !under(i.path, skip));
}

/** Throws RequestInvalid when the body's shape does not match. */
export function checkBody(schema: ZodType, body: unknown): void {
  const r = schema.safeParse(body);
  if (r.success) return;
  const issues = shapeIssues(r.error.issues as ZodIssueLike[], body, representativeOf(schema));
  if (issues.length) throw new RequestInvalid(issuesOf('body', { issues }));
}

/** Throws RequestInvalid when the query string's shape does not match the route's query schema. */
export function checkQuery(route: RouteConfig | undefined, url: string | undefined): void {
  const schema = route?.request?.query;
  if (!isZod(schema)) return;
  const query = Object.fromEntries(new URL(url || '/', 'http://x').searchParams);
  const r = schema.safeParse(query);
  if (r.success) return;
  const issues = shapeIssues(r.error.issues as ZodIssueLike[], query);
  if (issues.length) throw new RequestInvalid(issuesOf('query', { issues }));
}

/* ---------- responses (OPENAPI_RESPONSES=check) ---------- */

export const CHECK_RESPONSES = process.env.OPENAPI_RESPONSES === 'check';

/** One `openapi:` line: to OPENAPI_REPORT (a file, appended) when set, else the log. */
export function report(line: string): void {
  const file = process.env.OPENAPI_REPORT;
  if (file) fs.appendFileSync(file, line + '\n');
  else console.warn('openapi: ' + line);
}

const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Fields of `sent` that parsing dropped: the ones the schema does not name. */
function undocumented(sent: unknown, parsed: unknown, at = '', out: string[] = []): string[] {
  if (out.length >= 10) return out;
  if (plain(sent) && plain(parsed)) {
    for (const k of Object.keys(sent)) {
      const p = at ? `${at}.${k}` : k;
      if (!(k in parsed)) out.push(p);
      else undocumented(sent[k], parsed[k], p, out);
    }
  } else if (Array.isArray(sent) && Array.isArray(parsed)) {
    for (let i = 0; i < Math.min(sent.length, parsed.length, 3); i++) undocumented(sent[i], parsed[i], `${at}[${i}]`, out);
  }
  return out;
}

/** What is wrong with a JSON answer, by the route's definition; [] when nothing is. */
export function responseProblems(route: RouteConfig, status: number, body: unknown): string[] {
  const r = route.responses[String(status)] ?? route.responses.default;
  if (!r) return [`status ${status} is not documented`];
  if ('$ref' in r) return [];
  const media = r.content?.['application/json'];
  const schema = media && 'schema' in media ? media.schema : null;
  if (!isZod(schema)) return r.content ? [`status ${status} documents no JSON schema`] : [`status ${status} documents no body`];
  const parsed = schema.safeParse(body);
  if (!parsed.success) return issuesOf('body', parsed.error).slice(0, 5).map(i => `${i.path || '(root)'}: ${i.message}`);
  return undocumented(body, parsed.data).map(p => `${p}: not in the schema`);
}
