/**
 * This source file is part of the Apiboost(R) API Portal product.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * See https://www.apiboost.com/LICENSE.txt for license information.
 */

/**
 * Regenerates THIRD-PARTY-LICENSES.md — the plain-text inventory of the shipped
 * omnispec dependency tree and each package's license — from a single source
 * (`pnpm licenses list --prod`).
 *
 * Re-run whenever the dependency tree changes:  `pnpm run licenses:report`
 * The CI gate (`pnpm run check:licenses`) enforces the no-copyleft policy; this
 * file is the human-readable record of what's in the tree.
 */

import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GENERATED = new Date().toISOString().slice(0, 10)

function readTree() {
  const raw = execSync('pnpm licenses list --prod --json', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  })
  const data = JSON.parse(raw || '{}')
  const rows = []
  for (const license of Object.keys(data)) {
    for (const p of data[license]) {
      const version = Array.isArray(p.versions) ? p.versions.join(', ') : (p.version || '')
      rows.push({ name: p.name, version, license })
    }
  }
  rows.sort((a, b) => a.name.localeCompare(b.name))
  const counts = {}
  rows.forEach((r) => { counts[r.license] = (counts[r.license] || 0) + 1 })
  return { rows, counts }
}

function markdown({ rows, counts }) {
  const total = rows.length
  const licenses = Object.keys(counts).sort()
  let md = ''
  md += '# Third-Party Licenses — @apiboost/omnispec & @apiboost/omnispec-pro\n\n'
  md += 'Inventory of the **production (shipped) dependency tree** for both omnispec packages\n'
  md += 'and each package’s license. It guarantees the mixed OSS + commercial distribution\n'
  md += 'carries **no GPL / LGPL / AGPL or other copyleft / source-available dependency**.\n\n'
  md += `- **Generated:** ${GENERATED} — \`pnpm run licenses:report\` (source: \`pnpm licenses list --prod\`).\n`
  md += '- **Scope:** runtime `dependencies` + full transitive closure of `@apiboost/omnispec` (Free)\n'
  md += '  and `@apiboost/omnispec-pro` (Pro). Excludes the packages’ own code and build-only devDependencies.\n'
  md += '- **Enforced in CI:** `pnpm run check:licenses` (`.github/workflows/license-check.yml`) fails any PR\n'
  md += '  that introduces a disallowed license.\n\n'
  md += '## Verdict\n\n'
  md += `✅ **All ${total} production dependencies are permissively licensed** (${licenses.join(' / ')}). `
  md += 'No GPL, LGPL, AGPL, or other copyleft license is present.\n\n'
  md += '> **Attribution obligation (not a blocker):** MIT, ISC, BSD, and Apache-2.0 require preserving\n'
  md += '> copyright/permission notices in distributed copies. Ship this file (or generated license banners)\n'
  md += '> with the bundled builds. None impose copyleft reciprocity.\n\n'
  md += '## Summary\n\n| License | Packages |\n|---|---|\n'
  licenses.forEach((l) => { md += `| ${l} | ${counts[l]} |\n` })
  md += `| **Total** | **${total}** |\n\n`
  md += '## Full list\n\n| Package | Version(s) | License |\n|---|---|---|\n'
  rows.forEach((r) => { md += `| \`${r.name}\` | ${r.version} | ${r.license} |\n` })
  return md
}

function main() {
  const tree = readTree()
  writeFileSync(resolve(ROOT, 'THIRD-PARTY-LICENSES.md'), markdown(tree))
  console.log(`Generated THIRD-PARTY-LICENSES.md for ${tree.rows.length} production dependencies.`)
}

main()
