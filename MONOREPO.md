# TypeScript workspace migration

Install at the repository root with `bun install --frozen-lockfile`. The root `bun.lock`
is the workspace lock. Existing `api/`, `frontend/`, and `mcp/` paths remain workspace
applications; reusable domain models and coach functions live in `packages/shared`.

- `bun run dev`: API watch mode and frontend development server.
- `bun start`: regenerate OpenAPI and Orval hooks, then start the API.
- `bun run generate`: regenerate the API schema and frontend client without a server.
- `bun run build`: regenerate and build the frontend.
- `bun run typecheck`: API, frontend production TypeScript, and shared TypeScript.
- `bun run test:api` / `bun run test:web` / `bun run test:mcp`: application suites.

The API and frontend root test commands cap workers at two to avoid memory contention.
Compiler defaults are shared in `tsconfig.base.json`; application configs retain runtime-specific
libraries and existing strictness settings. MCP production code and shared code are strict.

`cd api && bun start` uses the same root startup script. Bun watch mode tracks API imports,
so API restarts through `bun run dev` regenerate the client too. Generation failure prevents
startup. Direct `bun api/server.ts` is a low-level test entrypoint that bypasses generation.

Orval reads the checked-in OpenAPI schema without a running server. Generated TanStack Query
hooks use the existing session, subpath, cancellation and error handling through the typed
API transport. `main.tsx` supplies the QueryClient; configuration loading uses generated query
options. Offline-first Zustand state still manages local workout data.

Docker application builds use the repository root as context, for example:
`docker build -f api/Dockerfile .`. Compose supplies this context. The API image regenerates
on startup; the web image regenerates during its build. MCP copies shared code for its imports.

MCP production modules, provider HTTPS adapters, and the frontend API helpers are now
TypeScript. Tokens, calendar feeds, trainer/member sharing and community-library reads use
generated TanStack query options; writes invalidate relevant queries. Coach operations use the
generated client while preserving the existing polling cadence. Queries are cleared and
in-flight reads cancelled when the account or paired server changes.

This is still a migration checkpoint. Many frontend components, stores, domain helpers and
complex coach payload/validator modules remain JavaScript. Frontend production TypeScript is
strict; JavaScript is included for resolution but not checked, and test fixtures run separately.
MCP uses `allowJs` only to resolve the external frontend helpers it imports. The API retains
its existing non-strict settings. Further conversions should add real types, preserve runtime
tests and avoid file-wide suppressions. The root Bun lock is canonical for all workspaces and
Docker installs; legacy API/frontend lockfiles remain pending their standalone-tooling cleanup.
