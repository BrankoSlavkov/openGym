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
- **`new` files:** add them in our conventions (TypeScript `.ts/.tsx` once the folder is converted,
  our router, exact-pinned deps). If you place one somewhere other than its upstream path, add a
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
- **api/ and mcp/** are still upstream-shaped JavaScript: their changes usually apply almost
  verbatim (`git show <sha> -- api/ | git apply -3` is fine there when it applies cleanly; review it).
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
cd api && npm test
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
