/* Fork: TypeScript types derived from the OpenAPI definitions, for the api's own code.
 *
 *   import type { Schemas, JsonBody, JsonResponse } from './openapi/types.ts';
 *   type State = Schemas['State'];
 *   type Body = JsonBody<typeof putData>;                 // PUT /api/data's request body
 *   type Answer = JsonResponse<typeof putData, 200>;      // its 200 answer
 *
 * The frontend gets the same types from Orval, generated from api/openapi.json. Both come from one
 * place, the zod schemas in openapi/, so a field added there reaches both. */
import type { z } from 'zod';
import type * as S from './schemas.ts';

/** Every shared schema's type, by its name in the document (ErrorBody is 'Error' there). */
export type Schemas = { [K in keyof typeof S as K extends 'ErrorBody' ? 'Error' : K]: z.infer<(typeof S)[K]> };

type JsonOf<C> = C extends { content: { 'application/json': { schema: infer T } } } ? (T extends z.ZodType ? z.infer<T> : unknown) : never;

/** A route definition's JSON request body. */
export type JsonBody<R> = R extends { request: { body: infer B } } ? JsonOf<B> : never;

/** A route definition's JSON answer for one status. */
export type JsonResponse<R, Status extends number | `${number}`> = R extends { responses: infer Rs }
  ? `${Status}` extends keyof Rs ? JsonOf<Rs[`${Status}`]> : never
  : never;

/** A route definition's query parameters. */
export type Query<R> = R extends { request: { query: infer Q } } ? (Q extends z.ZodType ? z.infer<Q> : never) : never;

/** A route definition's path parameters. */
export type Params<R> = R extends { request: { params: infer P } } ? (P extends z.ZodType ? z.infer<P> : never) : never;
