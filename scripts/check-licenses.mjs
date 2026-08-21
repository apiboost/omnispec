/**
 * This source file is part of the Apiboost(R) API Portal product.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * See https://www.apiboost.com/LICENSE.txt for license information.
 */

/**
 * License gate for the distributed dependency tree.
 *
 * Reads the production (shipped) dependency closure via `pnpm licenses list`
 * and fails if any dependency carries a copyleft / source-available license or
 * an unverifiable one. This protects the mixed OSS + commercial distribution:
 * no GPL/LGPL/AGPL (or similar) may enter the tree, including via a transitive
 * version bump.
 *
 * Run: `pnpm run check:licenses` (also wired into CI on every PR).
 */

import { execSync } from 'node:child_process'

// Copyleft / network-copyleft / source-available families that are incompatible
// with shipping inside a commercial product. Any match fails the gate.
const DENY = /(^|[^A-Z])(A?GPL|LGPL|MPL|EPL|CDDL|EUPL|OSL|SSPL|BUSL|CPAL|Sleepycat|CeCILL)([^A-Z]|$)|Business Source|Commons.?Clause|Prosperity|CC-BY-SA/i

// Licenses we cannot verify programmatically — fail so a human reviews them.
const UNKNOWN = /^(unknown|unlicensed|see[ -]license|custom|other|null|undefined|)$/i

// Explicitly reviewed & approved exceptions, keyed by package name. Use only
// for dual-licensed packages usable under a permissive option (e.g. a
// "(MIT OR GPL-2.0)" dependency taken under MIT). Document the reason.
const ALLOW = new Set([
  // 'some-pkg', // (MIT OR GPL-2.0) — used under MIT
])

function getProdLicenses() {
  const raw = execSync('pnpm licenses list --prod --json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  })
  return JSON.parse(raw || '{}')
}

function main() {
  let data
  try {
    data = getProdLicenses()
  } catch (err) {
    console.error('✖ Could not read production licenses via pnpm. Is the workspace installed?')
    console.error(String(err?.message ?? err))
    process.exit(2)
  }

  const entries = Object.entries(data)
  const counts = entries
    .map(([license, pkgs]) => [license, new Set(pkgs.map((p) => p.name)).size])
    .sort((a, b) => a[0].localeCompare(b[0]))

  console.log('Production dependency licenses:')
  for (const [license, count] of counts) {
    console.log(`  ${String(count).padStart(3)}  ${license}`)
  }

  const violations = []
  for (const [license, pkgs] of entries) {
    const disallowed = DENY.test(license) || UNKNOWN.test(license.trim())
    if (!disallowed) continue
    for (const p of pkgs) {
      if (ALLOW.has(p.name)) continue
      const versions = Array.isArray(p.versions) ? p.versions.join(', ') : (p.version ?? '')
      violations.push(`${p.name}@${versions} — ${license}`)
    }
  }

  if (violations.length > 0) {
    console.error(`\n✖ ${violations.length} disallowed license(s) found:`)
    for (const v of violations) console.error(`  - ${v}`)
    console.error(
      '\nGPL/LGPL/AGPL and other copyleft or source-available licenses are not permitted in the\n' +
        'shipped dependency tree. If a flagged package is dual-licensed under a permissive option,\n' +
        'add it to the reviewed ALLOW set in scripts/check-licenses.mjs with a justification.',
    )
    process.exit(1)
  }

  const total = counts.reduce((sum, [, c]) => sum + c, 0)
  console.log(`\n✓ All ${total} production dependencies use permissive licenses.`)
}

main()
