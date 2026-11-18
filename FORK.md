# This fork

A personal, web-only, English-only build of [openGym](https://github.com/DuarteSantos8/openGym),
used in a browser on a laptop and a phone. It follows upstream: new features are merged in from
time to time, and our own changes are developed on top.

## Remotes

| Remote | Repository | Use |
|---|---|---|
| `origin` | github.com/BrankoSlavkov/openGym | This fork. Push here. |
| `upstream` | github.com/DuarteSantos8/openGym | Read-only source of new features. Push is disabled. |

## What is removed

The full list is [.fork/removed-paths](.fork/removed-paths). In short:

- the Android, iPhone, Apple Watch, Wear OS, Garmin and Zepp OS apps and their build scripts
- the Zepp OS server relay (`/api/watch/*`) and its settings page
- the 25 translation packs (`frontend/src/locales`) and the checks that compared them
- the website, `docs/`, Helm, Kubernetes, Nix, Cloudflare and upstream's GitHub workflows
- the Capacitor packages (phone-only)
- the gym reminder's map and place search (Leaflet, OpenStreetMap; phone-only), with stand-ins
  in `frontend/web-only/gym/` for the upstream files that still import them
- QR codes: drawing them (lean-qr: passkey device link, trainer codes, the connector address)
  and scanning them (jsQR, the camera sheet, Plan > Scan a QR code). Codes and links remain.
  This one edits upstream files (Passkeys, TrainerSheets, Assistants, Plan, the CSS), so a sync
  that touches those lines conflicts: keep the QR out.

Kept: the `api` and `web` containers, the optional `mcp` container, the AI Coach, integrations
and the exercise catalogue.

## How it follows upstream: porting, not merging

The fork is being restructured (Bun + Vite+, TanStack Router, TypeScript; see "Migration" below),
so upstream's commits no longer merge. They are **ported**: each upstream commit since the last
port is read, understood and re-implemented in our code.

- `.fork/upstream-base` is the last upstream commit we ported up to.
- `node scripts/upstream-changes.mjs` lists `base..upstream/main`, commit by commit, and says where
  every changed file lives here (same path, moved, removed, new, missing).
- `.fork/path-map` records files that moved beyond the `.js -> .ts(x)` rename.
- `.fork/removed-paths` lists what the fork deleted; changes there are skipped.
- The full procedure is the `port-upstream` skill (`.claude/skills/port-upstream/SKILL.md`):
  ask Claude Code to "port the latest upstream changes".

Conventions that keep ports small:

- **Phone code stays in shared files but never runs.** It sits behind `MOBILE`
  (`frontend/src/lib/mobile.js`), which is false in the web build. The Capacitor imports it names
  resolve to stand-ins in `frontend/web-only/` (wired in the Vite config by `webOnlyAlias`).
- **`t('…')` stays.** The string inside each call is the English text, so with no packs it just
  returns English. `LANGS` in `frontend/src/lib/i18n-core.js` lists English only.
- Exercise names and instructions in other languages (`catalogue/i18n`, generated files under
  `frontend/src/lib/exercise-names` etc.) are left in place. They are never loaded in English.
- Upstream tests for removed native features and locale packs are pruned from this fork.
- Put new fork-only code in new files where you can, rather than inside upstream files.

## Migration

Phases, each ending with green tests and a working image (branch `migrate/vite-plus-ts`):

0. Porting workflow (this section, the skill, the script). Upstream base `e4a68a9`.
1. Bun and Vite+ for the frontend (`vp dev`, `vp build`, `vp test`, `vp check`).
2. TypeScript base: `tsconfig`, type checks in `vp check`, JS and TS side by side (pilot:
   `lib/onerm.ts`).
3. TanStack Router in place of react-router-dom (done; see "Routing" below).
4. TypeScript conversion by layer: `lib/`, `store/`, `components/`, `views/`, then `sheets.jsx`.
5. The api on Bun and Hono, in TypeScript, with its OpenAPI 3.2 spec in code (below).

`mcp/` stays upstream-shaped JavaScript on Node. `api/` is TypeScript on Bun, routed by Hono; its
handlers keep upstream's shape so upstream's api commits stay portable.

### The api on Bun and Hono

- **Runtime:** Bun (`oven/bun` Alpine image, `bun.lock`, `bun server.ts`). Tests are upstream's
  `node:test` files run by Bun's runner: `cd api && bun run test` (`--parallel` gives each file its
  own process, which the tests rely on for their `DATA_DIR`).
- **TypeScript:** every file under `api/` is `.ts` and runs as is (Bun strips the types);
  `bun run typecheck` (tsc 7) has to stay at 0 errors. The baseline is **not strict** yet
  (`"strict": false`): the JavaScript's own loose shapes were typed where they are (option bags
  get `{ key?: any; [key: string]: any }`, grown objects `Record<string, any>`, trailing
  parameters optional), so that tightening can go file by file. New code is written to strict
  standards. `api/coach/core/` stays JavaScript: the frontend imports it as `.js`, and it converts
  with the frontend's phase 4 (`allowJs` is off, so its imports are untyped until then).
  `api/scripts/ts-convert.ts` renames an upstream file that arrives as `.js` and rewrites the paths
  that name it.
- **Router:** `api/http-app.ts` turns the route table into a Hono app. The table and the modules
  beside it keep upstream's shape, `'METHOD /path': async (req, res) => {}` with `{name}`
  parameters, and handlers still get node's `req`/`res` (through `@hono/node-server`). That is
  what keeps upstream's api commits portable: they touch handlers, and handlers did not change.
  A path parameter needs its pattern in `PARAMS` there (a new one is refused at start).
- **What changed in server.ts:** the dispatcher at the bottom, cut into `cors`, `routePathOf`,
  `guard` and `fail` for `createApi`; `json()` and `readBody()` gained the OpenAPI hooks below.
  An upstream commit that edits upstream's dispatcher block is ported into those functions by hand.
- **Hono-native routes:** wrap a handler in `native()` from `http-app.ts`; it gets the Hono context
  and returns a Response, behind the same guard and error answer (`openapi/serve.ts` does).
  Convert a route only when the fork needs to change it anyway.
- **Behaviour kept on purpose:** HEAD is still a 404 (Hono would answer it with the GET route),
  the path check and body deadline still run on the raw request before Hono, and preflights are
  answered for any target. New: a request whose Host header is not a valid host is a 400.
- **Gone:** undici. Bun's fetch has no 300-second headers timeout, so `coach/node-fetch.ts` is a
  plain fetch with an abort budget; the coach target carries Alpine's `nodejs` only for the Codex
  launcher.

### The OpenAPI spec (api/openapi/)

Upstream's hand-written `api/openapi.yaml` (3.1) was turned into code once and removed. The spec is
now zod (via `@hono/zod-openapi`), and the document is generated from it as **OpenAPI 3.2**
(`@asteasolutions/zod-to-openapi`'s 3.2 generator; `@hono/zod-openapi` writes 3.0/3.1 only).

- `schemas.ts`: the shared schemas (`#/components/schemas`; `ErrorBody` is the component `Error`,
  so it does not shadow the global). `routes/<tag>.ts`: one definition per route, with upstream's
  `operationId`s (three that had none were named the same way). `responses.ts`: shared answers.
  `document.ts`: adds the answers the shared machinery gives on any route (400 invalid request,
  403 origin refusal, 413, 415) and builds the document.
- **Served:** `GET /api/openapi.json`, and Swagger UI at `GET /api/docs` (from `swagger-ui-dist`,
  served by the api: the web container's CSP allows only same-origin scripts, and a LAN-only
  instance may have no internet). `bun run openapi` writes the same document to `api/openapi.json`;
  a test fails when that file is stale.
- **Orval:** the frontend client is to be generated from `api/openapi.json` (a file, so the
  frontend build needs no running api). Checked with Orval 8.46: a fetch client and every model,
  0 errors under strict TypeScript. Orval names the error model `Error`; rename it in the Orval
  config (`override.components.schemas`) if that clashes in the frontend.
- **Requests are validated** (`openapi/validate.ts`), the shape only: a value of the wrong JSON
  type, or outside an enum, is a 400 `{ error, code: 'invalid-request', issues }`. A missing or
  null field, and lengths, sizes, patterns and formats, stay the handler's to answer in its own
  words (a missing password is a wrong password, counted and audited). Bodies are checked where the
  handler reads them (`readBody`), after its own sign-in check; queries after the route's guard.
  `representative(schema)` marks a schema that documents without binding: the `State` document
  (the server stores it as sent), `baseRev` (another type is a 409 by design) and the push
  `deviceId` (junk is ignored, not refused).
- **Responses are checked in tests:** `bun run openapi:check` runs the suite with
  `OPENAPI_RESPONSES=check` and fails on any JSON answer its route does not describe (a status, a
  field, a type). It passes; keep it passing when a handler's answer changes. The bun-test stack
  runs with the check on and logs `openapi:` lines.
- **Types:** `openapi/types.ts` (`Schemas['State']`, `JsonBody<typeof putData>`,
  `JsonResponse<typeof getData, 200>`) for the api's own code.
- **Porting:** a change upstream makes to `api/openapi.yaml` is made in `api/openapi/` instead
  (then `bun run openapi`). A new upstream route needs a definition there, or
  `openapi-routes.test.ts` fails.

### Routing

`frontend/src/router/`: TanStack Router (hash history, `#/home` as before).

- `routes.ts` is the route table: path, the screen it shows (`view`) and who may see it (`gate`:
  a module, signed in, admin). App.jsx maps each view to its lazily loaded screen (`VIEWS`).
- App.jsx draws the page itself rather than through `<Outlet>`: during an edge swipe back the
  page underneath is drawn at its own location next to the current one (`Page`, `RoutePage`).
- `hooks.tsx` keeps react-router's call shapes, backed by TanStack: `useNavigate()` (`navigate('/x')`,
  `navigate(path, { replace, state })`, `navigate(-1)`), `useLocation()`, `useParams()`,
  `useSearchParams()`, `useNavigationType()`, `<Navigate>`. A view converted to TypeScript can use
  TanStack's typed `router.navigate({ to: '/plan/r/$id', params })` (`useAppRouterInstance()`).
- Only navigations made through these hooks, and the browser's back and forward, move the app; a
  raw `history.pushState` (a sheet's own entry, Modals.jsx) does not, as with react-router.
  History entries are numbered by `__TSR_index` (`lib/nav.js historyIndex()`).
- Tests wrap a screen in `<TestRouter initialEntries={['/plan/r/r1']}>` (`router/testing.tsx`) and
  mock `router/hooks.tsx` where they mocked `react-router-dom`.
- Porting an upstream route change: a `<Route>` added in upstream's App.jsx becomes a line in
  `routes.ts` plus its entry in `VIEWS`; `react-router-dom` imports become `router/hooks.tsx`.

### Converting a file to TypeScript

```bash
cd frontend
node scripts/ts-convert.mjs src/lib/foo.js src/lib/foo.test.js   # git mv + rewrite every import
vp check                                                         # types (strict), lint, format
vp fmt src/lib/foo.ts src/lib/foo.test.ts
vp test run src/lib/foo
```

- **Imports name the real file** (`./foo.ts`, not `./foo.js`). `api/` and `mcp/` load about 40
  `frontend/src/lib` modules under plain Node, which strips types (Node 22.18+) but resolves
  nothing; the codemod rewrites importers in `frontend/`, `api/` and `mcp/` for that reason.
- **Erasable syntax only** (`erasableSyntaxOnly`): no enums, namespaces or parameter properties.
  Use union types and `as const` objects. Type-only imports use `import type`.
- Shared document shapes live in `src/lib/domain-types.ts` and grow as code is converted. Keep
  fields optional: old backups and other devices carry older shapes.
- `tsconfig.json` is strict with `noUncheckedIndexedAccess`; JavaScript is in the program
  (`allowJs`) but not checked, so converted files see the JS they import as loosely typed.
- A converted file is formatted by Oxfmt (single quotes, no semicolons, 120 columns); the JS
  stays in upstream's hand-set style until its turn.
- Names that are plain strings rather than imports (`mcp/scripts/check-node-loadable.mjs`'s module
  list) are printed by the codemod; update them by hand.

## Running it

```bash
docker compose up -d --build
```

`docker-compose.override.yml` tags the images locally (`opengym-fork-*:local`), so Compose never
swaps in upstream's prebuilt images, which lack this fork's changes.

## Dependencies

Every `package.json` pins exact versions. To upgrade, set the new version and run `npm install`
in that folder; in `frontend/` and `api/` use `bun add --exact <pkg>@<version>` (Bun, `bun.lock`). Read the package's migration guide before a major version bump.
