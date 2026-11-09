import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWriteStream } from 'node:fs'
import { get } from 'node:https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dracoDir = resolve(__dirname, '../public/draco')
const threeDracoDir = resolve(__dirname, '../node_modules/three/examples/jsm/libs/draco')

const files = ['draco_decoder.wasm', 'draco_decoder.js', 'draco_wasm_wrapper.js']

if (existsSync(dracoDir)) {
  const allExist = files.every(f => existsSync(resolve(dracoDir, f)))
  if (allExist) {
    console.log('Draco files already exist, skipping.')
    process.exit(0)
  }
}

mkdirSync(dracoDir, { recursive: true })

// Try node_modules first
if (existsSync(threeDracoDir)) {
  for (const f of files) {
    const src = resolve(threeDracoDir, f)
    if (existsSync(src)) {
      copyFileSync(src, resolve(dracoDir, f))
      console.log(`Copied ${f} from node_modules`)
    }
  }
} else {
  // Fallback: download from CDN
  const cdn = 'https://unpkg.com/three@0.180.0/examples/jsm/libs/draco/'
  for (const f of files) {
    const dest = resolve(dracoDir, f)
    await new Promise((resolve, reject) => {
      get(cdn + f, res => {
        if (res.statusCode === 302) {
          get(res.headers.location, r => r.pipe(createWriteStream(dest)).on('finish', resolve))
        } else {
          res.pipe(createWriteStream(dest)).on('finish', resolve)
        }
      }).on('error', reject)
    })
    console.log(`Downloaded ${f} from CDN`)
  }
}

console.log('Draco setup complete.')
