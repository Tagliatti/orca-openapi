#!/usr/bin/env node
/**
 * Downloads the third-party assets into `editor/vendor/`.
 *
 * The editor frame runs with the network closed (`connect-src 'self'`), so nothing may come from a
 * CDN: the files have to live inside the plugin folder. Run this script again to update the pinned
 * versions below.
 *
 *   node scripts/vendor.mjs
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const VENDOR_DIR = join(ROOT, 'editor', 'vendor')

/** Pinned versions. Changing them here and running again is how you update. */
const PACKAGES = {
  // swagger-ui-bundle.js is the UMD build: it defines a global `SwaggerUIBundle`, which is the only
  // format that works through a plain <script src> (the "-es-bundle" has no ESM export at all,
  // only `module.exports`).
  'swagger-ui-dist': '5.35.0',
  // dist/js-yaml.mjs is real ESM and self-contained (zero external imports).
  'js-yaml': '5.5.0'
}

/** [path inside the tarball, final name under editor/vendor/] */
const WANTED = {
  'swagger-ui-dist': [
    ['package/swagger-ui-bundle.js', 'swagger-ui-bundle.js'],
    ['package/swagger-ui.css', 'swagger-ui.css'],
    ['package/swagger-ui-bundle.js.LICENSE.txt', 'swagger-ui-bundle.js.LICENSE.txt'],
    ['package/LICENSE', 'swagger-ui.LICENSE']
  ],
  'js-yaml': [
    ['package/dist/js-yaml.mjs', 'js-yaml.mjs'],
    ['package/LICENSE', 'js-yaml.LICENSE']
  ]
}

const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`

async function download(name, version) {
  const url = `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${name}@${version}: HTTP ${response.status} at ${url}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  mkdirSync(VENDOR_DIR, { recursive: true })
  const staging = mkdtempSync(join(tmpdir(), 'orca-vendor-'))

  try {
    for (const [name, version] of Object.entries(PACKAGES)) {
      const tarball = join(staging, `${name}.tgz`)
      const { writeFileSync } = await import('node:fs')
      writeFileSync(tarball, await download(name, version))

      const wanted = WANTED[name]
      // Extract only what is needed: the whole swagger-ui-dist package is 3.4 MB and we use ~1.7 MB.
      execFileSync('tar', ['-xzf', tarball, '-C', staging, ...wanted.map(([from]) => from)])

      for (const [from, to] of wanted) {
        const target = join(VENDOR_DIR, to)
        copyFileSync(join(staging, from), target)
        console.log(`${name}@${version}  ${to}  ${kib(statSync(target).size)}`)
      }
    }
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

await main()
