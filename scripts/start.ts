import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const generated = Bun.spawnSync(['bun', 'run', 'generate'], { cwd: root, stdout: 'inherit', stderr: 'inherit' })
if (generated.exitCode !== 0) process.exit(generated.exitCode)
// Importing keeps Bun's watch graph connected to the API and regenerates on restart.
await import('../api/server.ts')
