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

Kept: the `api` and `web` containers, the optional `mcp` container, the AI Coach, integrations
and the exercise catalogue.

## How it stays easy to sync

Removing whole folders and files merges cleanly, while editing shared code means a conflict
every time upstream touches the same lines. So:

- **Phone code stays in shared files but never runs.** It sits behind `MOBILE`
  (`frontend/src/lib/mobile.js`), which is false in the web build. The Capacitor imports it names
  resolve to stand-ins in `frontend/web-only/` (wired in `vite.config.js` by `webOnlyAlias`).
- **`t('…')` stays.** The string inside each call is the English text, so with no packs it just
  returns English. `LANGS` in `frontend/src/lib/i18n-core.js` lists English only, so the
  language picker hides itself and any stored language falls back to English.
- Exercise names and instructions in other languages (`catalogue/i18n`, generated files under
  `frontend/src/lib/exercise-names` etc.) are left in place. They are never loaded in English.
- Put new fork-only code in new files where you can, rather than inside upstream files.

## Syncing with upstream

```bash
scripts/sync-upstream.sh          # merge upstream/main
scripts/sync-upstream.sh v1.4.6   # or a release tag
```

The script merges, deletes the removed paths again (including anything new upstream added
there), keeps our lockfiles aside, and stops if real conflicts remain. Expect these conflicts:

- **package.json:** we pin exact versions and dropped the Capacitor packages, so an upstream
  dependency bump conflicts. Keep our pinned versions (bump one by hand if upstream needs a
  newer version), keep Capacitor out, then run `npm install` to refresh the lockfile.
- **Files we edited** (see `git log upstream/main..main`): resolve by hand.
- **A new `@capacitor/...` import** breaks the frontend build: add a stand-in to
  `frontend/web-only/capacitor/` and its name to `frontend/web-only/alias.js`.

Then run the tests and rebuild (the script prints the commands), and `git push`.

## Running it

```bash
docker compose up -d --build
```

`docker-compose.override.yml` tags the images locally (`opengym-fork-*:local`), so Compose never
swaps in upstream's prebuilt images, which lack this fork's changes.

## Dependencies

Every `package.json` pins exact versions. To upgrade, set the new version and run `npm install`
in that folder. Read the package's migration guide before a major version bump.
