/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// Verifies the npm publish tarball contains only allowlisted files, so source,
// internal docs, tests, and stray artifacts can never be published. Run in CI
// (see .github/workflows/ci.yml) and before any manual publish.
import { execSync } from 'node:child_process'

// --ignore-scripts so the `prepare` lifecycle (husky) doesn't emit non-JSON to stdout.
const out = execSync('npm pack --dry-run --json --ignore-scripts', { encoding: 'utf8' })
const files = JSON.parse(out)[0].files.map((f) => f.path)

// Only these top-level dirs/files may ship.
const allowedPrefixes = [
  'dist/',
  'core/',
  'package.json',
  'README.md',
  'LICENSE',
  'NOTICE',
  'oauth2-redirect.html',
]

const forbidden = files.filter(
  (f) => !allowedPrefixes.some((p) => f === p || f.startsWith(p)),
)

if (forbidden.length) {
  console.error('Forbidden files in npm tarball:\n' + forbidden.map((f) => `  ${f}`).join('\n'))
  process.exit(1)
}

console.log(`OK: ${files.length} files in tarball, all within the allowlist.`)
