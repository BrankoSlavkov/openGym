/* Fork: every route, gathered.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import * as meta from './meta.ts';
import * as auth from './auth.ts';
import * as oidc from './oidc.ts';
import * as pairing from './pairing.ts';
import * as tokens from './tokens.ts';
import * as password from './password.ts';
import * as admin from './admin.ts';
import * as passkeys from './passkeys.ts';
import * as data from './data.ts';
import * as media from './media.ts';
import * as shared from './shared.ts';
import * as push from './push.ts';
import * as integrations from './integrations.ts';
import * as activity from './activity.ts';
import * as coach from './coach.ts';
import * as mcp from './mcp.ts';
import * as trainers from './trainers.ts';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

/** Every route of the api, in the order the document lists them. */
export const ROUTES: RouteConfig[] = [
  ...Object.values(meta),
  ...Object.values(auth),
  ...Object.values(oidc),
  ...Object.values(pairing),
  ...Object.values(tokens),
  ...Object.values(password),
  ...Object.values(admin),
  ...Object.values(passkeys),
  ...Object.values(data),
  ...Object.values(media),
  ...Object.values(shared),
  ...Object.values(push),
  ...Object.values(integrations),
  ...Object.values(activity),
  ...Object.values(coach),
  ...Object.values(mcp),
  ...Object.values(trainers)
];
