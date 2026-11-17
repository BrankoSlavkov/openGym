import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const children = [
  Bun.spawn(['bun', '--watch', 'scripts/start.ts'], { cwd: root, stdout: 'inherit', stderr: 'inherit' }),
  Bun.spawn(['bun', 'run', 'dev'], { cwd: resolve(root, 'frontend'), stdout: 'inherit', stderr: 'inherit' }),
]
const stop = () => children.forEach(child => child.kill())
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, stop)
const code = await Promise.race(children.map(child => child.exited))
stop()
process.exit(code)
