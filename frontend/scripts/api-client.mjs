// The Orval client (src/generated/) is not committed: it is generated from api/openapi.json.
// `generateApiClient()` runs Orval; `ensureApiClient()` runs it only when the output is missing
// or older than the spec (tests, typecheck). The Vite plugin regenerates on every dev server
// start and every build, so the hooks always match the api's spec.
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..')
const spec = join(frontend, '../api/openapi.json')
const output = join(frontend, 'src/generated/api.ts')

export function generateApiClient() {
  const run = spawnSync('bun', ['x', 'orval', '--config', 'orval.config.ts'], { cwd: frontend, stdio: 'inherit' })
  if (run.status !== 0) throw new Error('Orval could not generate src/generated from api/openapi.json')
}

export function ensureApiClient() {
  if (!existsSync(output) || statSync(output).mtimeMs < statSync(spec).mtimeMs) generateApiClient()
}

/** Vite plugin: a fresh client on every `vp dev` start and every `vp build`, as needed for tests. */
export function apiClient() {
  return {
    name: 'opengym-api-client',
    config(_config, env) {
      if (process.env.VITEST) ensureApiClient()
      else if (env.command === 'serve' || env.command === 'build') generateApiClient()
    },
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) ensureApiClient()
