---
name: port-upstream
description: Bring the latest upstream openGym changes into this fork by understanding and re-implementing them (not git merge). Use when the user asks to sync, fork, pull or port the latest upstream changes, or "get what upstream did since our last sync".
---

# Port upstream changes into the fork

This fork (FORK.md) has diverged from upstream (github.com/DuarteSantos8/openGym) in structure:
web-only, English-only, Bun + Vite+, TanStack Router, TypeScript (being converted in phases).
Upstream's commits can't be merged; they get **ported**: read each one, understand what it is for,
and implement the same behaviour in our code. `.fork/upstream-base` holds the last upstream commit
we ported up to. The job is always `base..upstream/main` (or a tag the user names).

## 1. See what changed

```bash
git status --short                          # must be clean; commit or ask first
git switch main && git pull --ff-only       # port on top of the current fork
git switch -c port/upstream-$(date +%Y-%m-%d)
node scripts/upstream-changes.mjs           # fetches upstream, lists base..upstream/main per commit
```

The report classifies every changed file: `same`, `moved` (with our path), `removed`,
`dropped`, `new`, `missing`. Commits marked `[skip: removed paths only]` need nothing.

Then read the commits that matter, oldest first:

```bash
node scripts/upstream-changes.mjs --no-fetch --diff <sha>   # one commit, removed paths filtered out
git show <sha> --stat                                       # message + full file list
git show <sha>:<path>                                       # a file as upstream has it after
```

Large ranges: read every commit message first and group commits by feature (upstream often lands a
feature, then several follow-up fixes). Port a feature once, in its final form
(`--diff` with no sha gives the whole range at once, which is better for a feature that was
reworked several times).

## 2. Decide per change

- **Removed parts** (`removed` / `dropped`, phone and watch apps, native code, translations,
  website, docs, Capacitor): skip. A shared-code change that only exists to serve a removed part
  (a new native bridge, a `MOBILE`-only branch) is skipped too; say so in the report.
- **Translations:** we keep `t('English text')` calls but no locale packs. Port new strings as plain
  `t()` calls; never add locale files.
- **`same` / `moved` files:** apply the intent to our version. Our file may be TypeScript, may use
  TanStack Router instead of react-router-dom, and may carry fork-only changes (see
  `git log -- <our path>`); keep those. Don't paste upstream's file over ours.
- **Routing:** upstream uses react-router-dom. Its `<Route>` lines in App.jsx map to
  `frontend/src/router/routes.ts` + `VIEWS` in App.jsx; `react-router-dom` imports in views and
  tests map to `router/hooks.tsx` / `router/testing.tsx` (FORK.md, "Routing").
- **`new` files:** add them in our conventions (TypeScript `.ts/.tsx` once the folder is converted,
  our router, exact-pinned deps). Imports name the real file (`./foo.ts`) and TypeScript stays erasable
  (FORK.md, "Converting a file to TypeScript"); `node frontend/scripts/ts-convert.mjs` renames a JS file
  and its importers. If you place one somewhere other than its upstream path, add a
  `.fork/path-map` line.
- **`missing` files:** find where the code lives now (`git log --diff-filter=R --summary`,
  grep for a function name), port there, and add a `.fork/path-map` line.
- **Dependencies:** pin exact versions (`bun add <pkg>@<x.y.z>`, no `^`/`~`). A dependency upstream
  added only for a removed part is not added. Upstream bumps: take them when they are fixes or the
  feature needs them; read the changelog for majors.
- **Training logic** (progression, 1RM, session read-back, `lib/*`): port its unit tests with it.
  Upstream's new tests are the best spec of the change; convert them to our test setup.
- **Code that exists twice** (CLAUDE.md: sync-merge/sync-stamps, glyphs, nudge, queue): if upstream
  changed one side, both sides must match here too.
- **mcp/** is still upstream-shaped JavaScript: its changes usually apply almost verbatim
  (`git show <sha> -- mcp/ | git apply -3` is fine when it applies cleanly; review it).
- **api/** is TypeScript on Bun, routed by Hono (FORK.md, "The api on Bun and Hono" and "The
  OpenAPI spec"), but its handlers keep upstream's shape, so a change usually ports line for line:
  - upstream's `api/x.js` is `api/x.ts` here (`git show <sha> -- api/x.js` and apply it by hand, or
    rewrite the paths: `git apply` will not find the renamed file). A new upstream file is renamed
    with `bun api/scripts/ts-convert.ts api/new.js`. `bun run typecheck` stays at 0.
  - a change to upstream's dispatcher at the bottom of `server.js` goes into `server.ts`'s `cors` /
    `routePathOf` / `guard` / `fail`; a new `{param}` needs its pattern in `api/http-app.ts`
    `PARAMS`.
  - `api/openapi.yaml` is gone: its changes go into `api/openapi/` (routes/<tag>.ts, schemas.ts),
    then `bun run openapi`. A new route needs a definition there (openapi-routes.test.ts), and
    `bun run openapi:check` has to keep passing when an answer changes shape.
  - `api/package.json` changes are made with `bun add --exact` (there is no package-lock.json);
    a Node-only trick in a test (V8 flags, undici) needs its Bun equivalent.
- **A conflict with a fork feature** (FORK.md lists them, `git log upstream/main..main`): keep the
  fork's behaviour and adapt upstream's change around it; if they truly clash, ask the user.

## 3. Commit

One commit per upstream feature or fix (not per file), message in the repo's style, ending with
the upstream commits it ports and the attribution line:

```
Rest timer: a second chime at 10 seconds left

Upstream-Commit: 1a2b3c4d5e6f...
Upstream-Commit: 9f8e7d6c5b4a...
```

Run the checks before each commit (or at least before the last one):

```bash
cd frontend && vp check && vp test && vp build    # format, lint, types, tests, build
cd api && bun run typecheck && bun run test && bun run openapi:check
cd mcp && npm test
```

## 4. Finish

- Write the upstream tip you ported up to into `.fork/upstream-base` (the report prints it) and
  commit it as the last commit: `Ported upstream up to <short sha>`.
- Report to the user: what was ported (grouped by feature), what was skipped and why, anything
  that needs their decision, and any new `.fork/path-map` lines.
- Don't merge to `main` or push unless asked.

## Never

- `git merge upstream/...` or `git pull upstream` (it would undo the structural changes).
- Push to `upstream` (push is disabled on purpose).
- Restore anything listed in `.fork/removed-paths`.
- Move `.fork/upstream-base` past a commit you haven't read.
