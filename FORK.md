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
- Upstream tests for removed parts are listed in `frontend/web-only/test-skips.js`.
- Put new fork-only code in new files where you can, rather than inside upstream files.

## Migration

Phases, each ending with green tests and a working image (branch `migrate/vite-plus-ts`):

0. Porting workflow (this section, the skill, the script). Upstream base `e4a68a9`.
1. Bun and Vite+ for the frontend (`vp dev`, `vp build`, `vp test`, `vp check`).
2. TypeScript base: `tsconfig`, type checks in `vp check`, JS and TS side by side (pilot:
   `lib/onerm.ts`).
3. TanStack Router in place of react-router-dom.
4. TypeScript conversion by layer: `lib/`, `store/`, `components/`, `views/`, then `sheets.jsx`.

`api/` and `mcp/` stay upstream-shaped JavaScript.

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
in that folder; in `frontend/` use `bun add <pkg>@<version>` (Bun, `bun.lock`). Read the package's migration guide before a major version bump.
