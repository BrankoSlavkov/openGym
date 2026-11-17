/* Fork: the document's info, servers, tags and security schemes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
export const INFO = {
  title: 'openGym API',
  version: '1.4.5',
  summary: 'Passkey (WebAuthn) auth + per-user state storage for openGym',
  description: `The backend of [openGym](https://opengym.ch), a free, open-source
gym & body-weight tracker. A Bun server routed by Hono, JSON-file storage,
HMAC-signed session cookies. This document is generated from the route definitions in
\`api/openapi/\` and served at \`/api/openapi.json\`; \`/api/docs\` browses it.

### Authentication
Sign-in is by **passkey** (WebAuthn, via \`@simplewebauthn/server\`). A successful
\`register/verify\` or \`login/verify\` sets the session cookie; every authenticated
route then works with that cookie. The paired mobile app has no shared cookie jar,
so it redeems a short pairing code (\`/api/pair/redeem\`) for the *same* signed token
and sends it as \`Authorization: Bearer <token>\` instead.

An instance started with \`PASSWORD_LOGIN=1\` also offers **name-and-password
sign-in** (tag \`password\`): opt-in per profile, scrypt-hashed, throttled, with an
admin-issued one-time reset code instead of e-mail. A profile may also add an e-mail
address to sign in with instead of its name (\`/api/account/email\`); no mail is ever
sent to it. Its routes set exactly the same cookie. With the flag off (the default)
every one of them answers 404.

### Throttling
The \`password\` routes are counted per client address: at most 60 requests a minute
across them, and wrong answers (a password, a reset code, an invite code on password
signup, an e-mail address already in use) pause the address from the 21st on, for 30 s,
doubling up to 15 min. Wrong passwords also pause the *account* they were tried
against from the 6th on, for 1 min doubling up to 1 h (the same pause whether the account
was named by its name or its e-mail), and an identifier that names no account is
paused the same way, as typed. A password check counts from the moment it
starts, so checks sent at once get no more tries than checks sent one by one. A
paused caller gets \`429 {"error": …, "code": "locked", "retryAfter": <s>}\` with a
\`Retry-After\` header. Passkey sign-up and sign-in and the pairing routes are not
throttled (their failures reach the audit log at most ten a minute per address).
The two routes that redeem a one-time device link (tag \`passkeys\`) share
the per-address budget, and wrong codes pause the address for link redemption only,
from the 21st on, the way wrong reset codes do. Adding or removing a passkey in Settings
(\`POST /api/account/passkeys/options\`, \`DELETE /api/account/passkeys\`) and making a
device code (\`POST /api/account/device-link\`) spend the per-address budget too, and a
current password given there as proof counts like one given at sign-in.
The address is the socket's, or with \`TRUST_PROXY=1\` the one a trusted proxy put in
\`CF-Connecting-IP\` / the last \`X-Forwarded-For\` entry / \`X-Real-IP\`; IPv6 clients are
counted by /64. Counters live in memory and reset on restart.

### Sessions
The cookie/bearer value is \`<payload>.<hmac>\` where the payload is
\`<uid>:<expiry-ms>:<session-version>\`, signed with a per-instance secret
(HMAC-SHA256). Sessions last \`SESSION_DAYS\` (default 90). \`POST /api/logout/all\`
bumps the user's session version, which invalidates every token ever issued for
the account.

### CSRF
State-changing browser requests must come from the app's own origin. The server
checks \`Sec-Fetch-Site\` (falling back to \`Origin\` vs the configured \`ORIGIN\`);
a mismatch is refused with \`403 {"error":"cross-origin request refused","code":"origin-mismatch","expected":ORIGIN}\` on any
non-GET route, the passkey routes included. Exempt: \`pair/redeem\`, which the mobile
app calls from its own origin (the code in the body is the credential, and the token
comes back in the body, never as a cookie), and any request a Bearer token
authenticates by itself: a valid session token, with no session cookie beside it, on
any route but the sign-in ones — the four passkey routes, the password and reset-code
routes and the two device-link routes, which act on the credential in the body, never
on a Bearer. A cross-origin request whose Bearer does not buy the exemption is refused
before any handler runs: \`401 {"error":"not signed in"}\` when that Bearer does not
verify and is the only credential (a paired app whose token was revoked or expired),
the 403 otherwise.
The passkey routes were exempt before, on the grounds that the challenge id is a
credential; but it is bound to nothing else, so a hostile page could complete the
attacker's own passkey sign-in in the victim's browser (login CSRF) and the answer
set the victim's session to the attacker's account. The password routes are **not**
exempt for the same reason: a hostile page knows a valid name and password of its own.

### Environment-dependent behavior
- \`INVITE_ONLY=1\`: registration requires a valid invite code (minted by an admin).
- \`ALLOW_GUEST=0\`: hides the client-side "continue without account" mode; the
  server merely reports the flag via \`GET /api/config\` (guest mode never talks to
  this API at all).
- \`ADMIN_UIDS=<uid>,<uid>\`: user ids treated as admins (a \`"admin": true\` flag on
  the user record in \`db.json\` works too). Admins get the \`/api/admin/*\` routes.
  One admin is the owner: the record with \`"owner": true\`, else the first
  \`ADMIN_UIDS\` entry with a profile, else the oldest admin. Only the owner appoints
  and removes admins, deletes an admin, hands the role on and clears the audit log.
- \`FIRST_USER_ADMIN\` (default off; \`1\` turns it on): the first profile registered
  on an instance with no profiles gets that \`"admin": true\` flag and is the owner. Decided at
  registration only, never applied to an instance that already has profiles.
- \`AUDIT_LOG\` (default on), \`AUDIT_MAX\` (default 5000 events), \`AUDIT_DAYS\`
  (default 90), \`AUDIT_IP\` (\`off\` | \`net\` | \`full\`, default off) shape the audit
  log served by \`GET /api/admin/audit\`.
- \`PASSWORD_LOGIN=1\`: adds the \`password\` routes and \`password_login: true\` in
  \`GET /api/config\`. Off by default.
- \`OIDC_ISSUER\` + \`OIDC_CLIENT_ID\` (and usually \`OIDC_CLIENT_SECRET\`): adds the \`oidc\`
  routes and \`oidc\` in \`GET /api/config\`. \`OIDC_ONLY=1\` refuses passkey and password
  sign-ups, and passkey and password sign-ins for everyone but admins (\`403 oidc-only\`).
- \`DEFAULT_LANG\` (e.g. \`pt-BR\`; unset by default): \`default_lang\` in \`GET /api/config\`,
  the language of the sign-in screen and of every profile that never picked one.
- \`TRUST_PROXY=1\`: the throttle reads the client address from proxy headers (set by
  the bundled \`docker-compose.yml\`, where only the web container can reach the API).
- \`INTEGRATIONS\` (unset by default, e.g. \`webhook\`): the providers of the \`integrations\`
  routes, and the \`integrations\` block of \`GET /api/config\`. \`INTEGRATIONS_ALLOW_LAN=1\`
  lets a webhook reach the home network (http too), never loopback or link-local.
- \`MEDIA_UPLOADS\` (default on; \`0\` removes the \`media\` routes and the \`media\` block of
  \`GET /api/config\`), \`MEDIA_QUOTA_MB\` (200 per profile, \`0\` = no cap),
  \`MEDIA_IMAGE_MAX_MB\` (2), \`MEDIA_GIF_MAX_MB\` (8), \`MEDIA_VIDEO_MAX_MB\` (100),
  \`MEDIA_VIDEO_MAX_SEC\` (60), \`MEDIA_AUDIO_MAX_MB\` (2), \`MEDIA_GC_GRACE_DAYS\` (14), \`MEDIA_UPLOADS_PER_HOUR\` (600
  per profile), \`MEDIA_MIN_FREE_MB\` (512, \`0\` = no floor): photos and videos of custom
  exercises (tag \`media\`). Every MB here is 2^20 bytes.

### Conventions
- Every response body is JSON with \`Cache-Control: no-store\`. The one exception is
  \`GET /api/media/{hash}\`, which answers with the stored file itself
  (\`Cache-Control: private, no-store\`).
- Errors are always \`{"error": "<human-readable message>"}\`. The \`password\`, throttle and
  \`media\` routes add a stable \`code\` for the client to word in its own language.
- Unknown method+path pairs return \`404 {"error":"not found"}\`; an unhandled
  exception returns \`500 {"error":"server error"}\`.
- Every route that reads a request body requires \`Content-Type: application/json\`
  (a \`charset\` parameter is fine) and answers any other type with
  \`415 {"error":"content-type must be application/json"}\` — the types a form can
  send are the ones that skip the CORS preflight, which is how a cross-site form
  reached these routes. A request with no body needs no Content-Type. A body that does
  not parse, or parses to anything but an object (\`null\`, a string, an array), is
  \`400 {"error":"invalid json"}\` on every route that reads one; an empty body counts
  as \`{}\`. A body over 5 MiB is \`413 {"error":"body too large"}\`; the rest of the
  upload is discarded so the answer reaches the client.
- CORS: the request's \`Origin\` is reflected in \`Access-Control-Allow-Origin\`
  **without** \`Allow-Credentials\`, so cross-origin callers can only ever
  authenticate with a Bearer token, never with the cookie.`,
  license: { name: 'AGPL-3.0-or-later', identifier: 'AGPL-3.0-or-later' },
  contact: { name: 'openGym', url: 'https://gitlab.com/DuarteSantos8/opengym' }
};

export const SERVERS = [
  { url: '/', description: 'Same origin as the openGym web app (the normal deployment)' },
  { url: 'https://opengym.example.com', description: 'Your self-hosted instance' }
];

export const TAGS = [
  { name: 'meta', description: 'Health and public configuration' },
  { name: 'auth', description: 'Passkey (WebAuthn) registration and login, sessions' },
  { name: 'pairing', description: 'Mobile-app pairing (code from a signed-in browser tab)' },
  {
    name: 'oidc',
    description: 'Sign in with an identity provider (OpenID Connect), next to passkeys. Every route here is a 404 unless the server runs with `OIDC_ISSUER` and `OIDC_CLIENT_ID` (docs/SELF_HOSTING.md, "Sign in with your identity provider").'
  },
  {
    name: 'password',
    description: 'Optional name-and-password sign-in (`PASSWORD_LOGIN=1`). Every route here is a 404 while the flag is off.'
  },
  {
    name: 'passkeys',
    description: 'More than one passkey on a profile: list, add, rename, remove, plus one-time device links, which let another device of the same person add a passkey of its own.'
  },
  { name: 'data', description: 'Per-user state sync (the whole app state as one JSON blob)' },
  { name: 'push', description: 'Web Push (VAPID) subscriptions, rest-timer and test pushes' },
  { name: 'activity', description: 'Live-workout presence heartbeat' },
  {
    name: 'admin',
    description: 'Admin dashboard. Requires an admin session (`ADMIN_UIDS` or `admin:true`)'
  },
  {
    name: 'media',
    description: 'The photo, GIF or video of a user\'s own custom exercise, and the photos and videos attached to a logged workout. Stored per profile (one quota for both) and named by the SHA-256 of its bytes; the state only carries a `MediaRef`. Every route here is a 404 when the instance runs with `MEDIA_UPLOADS=0`.'
  },
  {
    name: 'coach',
    description: 'AI Coach: plans, reviews and debriefs. Every route here answers 503 unless the instance has the Coach switched on and a provider connected.'
  },
  {
    name: 'mcp',
    description: 'The MCP connector\'s OAuth sign-in (docs/MCP_REMOTE.md), for Claude, ChatGPT and other assistants that add openGym by URL. Only with `MCP=on`, otherwise 404. What it issues is an ordinary scoped API token, made when the person approves it on the consent screen.'
  },
  {
    name: 'trainers',
    description: 'Trainers, gym leads and studios (docs/TRAINERS.md). Off unless the server runs with `TRAINERS=on`; then every route here answers, otherwise 404 `trainers-off`. A member connects to a trainer with the trainer\'s code and a consent, decides per category what is shared, and can change or end it any time, effective on the next request. Every route spends a per-account budget (429 `rate-limited`, Retry-After).'
  },
  {
    name: 'shared',
    description: 'The community library (`LIBRARY=on`, off by default): things people chose to share with everyone on this server, each after its own consent, always shown with who shared it and when. Importing copies the item into your own profile. Reports, admin review (`SHARE_REVIEW=on`), removal and bans are all logged. The built-in exercise media can never be shared (blocked by SHA-256). Every route spends a per-account budget.'
  },
  {
    name: 'tokens',
    description: 'Scoped tokens (docs/API_TOKENS.md): a key a profile makes in Settings for one program, an AI client over MCP, a planner, a script, holding per category `off`, `view` or `apply`. Only its SHA-256 is stored. A token reaches the `/api/token/*` routes and nothing else, never more than its profile, and ends with "sign out everywhere". `API_TOKENS=off` makes every route here a 404.'
  },
  {
    name: 'integrations',
    description: 'Settings → Integrations: outbound webhooks now, more providers later. Off unless the server runs with `INTEGRATIONS` (e.g. `INTEGRATIONS=webhook`); then a profile can add its own connections. Secrets are sealed at rest and shown once. See docs/INTEGRATIONS.md.'
  }
];

export const SECURITY = [{ cookieAuth: [] }, { bearerAuth: [] }];

export const SECURITY_SCHEMES = {
  cookieAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: 'gymsid',
    description: `HMAC-signed session cookie, set by \`register/verify\` / \`login/verify\`.
On HTTPS deployments it is issued as **\`__Host-gymsid\`** (host-locked,
Secure); the unprefixed \`gymsid\` is what a plain-http \`localhost\` instance
uses, and is still accepted for pre-upgrade sessions. HttpOnly + SameSite=Lax;
browser clients never handle the value directly.`
  },
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    description: 'The same signed session token, carried as `Authorization: Bearer <token>` by the paired mobile app (obtained from `POST /api/pair/redeem`). Bearer requests skip the CSRF origin check; a browser never attaches this header on its own.'
  },
  tokenAuth: {
    type: 'http',
    scheme: 'bearer',
    description: 'A scoped token (`ogt_…`, Settings → API tokens), as `Authorization: Bearer ogt_…`. Only the `/api/token/*` routes accept it.'
  }
};
