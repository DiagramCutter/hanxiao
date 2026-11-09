import { chmodSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const distDir = fileURLToPath(new URL('../dist', import.meta.url))

function makeWritable(path) {
  const stats = statSync(path)

  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) {
      makeWritable(join(path, entry))
    }
  }

  chmodSync(path, stats.mode | 0o200)
}

if (existsSync(distDir)) {
  makeWritable(distDir)
}
