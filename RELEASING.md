<!--
This source file is part of the Apiboost(R) OmniSpec Core.

Copyright (c) Apiboost, Inc.

SPDX-License-Identifier: Apache-2.0

See LICENSE.md and LICENSING.md in the project root for license information.
-->

# Releasing `@apiboost/omnispec`

Releases run **in CI** via GitHub Actions so every published version gets npm
**provenance attestations**, a matching **git tag**, and the license/pack guards.
Do not publish from a laptop — a manual `npm publish` produces an unattested,
untagged release.

## One-time setup (maintainers)

1. **npm token** — in npmjs.com, create a **granular access token** with
   read+write to the `@apiboost` scope (or a classic **automation** token, which
   bypasses 2FA). Add it to the repo as the **`NPM_TOKEN`** secret
   (Settings → Secrets and variables → Actions).
2. **npm org settings** — ensure the `@apiboost` org allows token publishing with
   provenance (not "require 2FA and disallow tokens").
3. **Clean up legacy dist-tags** (one-time — removes the old per-version tags so
   only real channels remain). Run locally while logged in with publish rights:
   ```bash
   npm dist-tag rm @apiboost/omnispec v1.2.11-dev
   npm dist-tag rm @apiboost/omnispec v1.2.11-dev-1
   npm dist-tag rm @apiboost/omnispec v1.2.11-dev.1
   npm dist-tag rm @apiboost/omnispec v1.2.11.dev2
   # keep: latest (stable), dev (prereleases)
   npm dist-tag ls @apiboost/omnispec   # verify
   ```

## Dist-tag channels

| Tag | Meaning | Install |
|-----|---------|---------|
| `latest` | Current stable release | `npm i @apiboost/omnispec` |
| `dev` | Latest dev prerelease (testing only) | `npm i @apiboost/omnispec@dev` |

## Cutting a stable release (version-in-PR)

The published version is whatever is committed in `package.json`, so bump it in a
PR first — git and npm never drift.

1. Open a PR to `main` bumping `version` in `package.json` (e.g. `1.3.0` → `1.3.1`)
   and updating the changelog. Get it reviewed and merged.
2. Actions → **Release** → **Run workflow** (from `main`).
   - Reads the version from `package.json`.
   - Refuses to run if that version is already on npm or looks like a prerelease.
   - `npm publish --provenance` (build + `check:licenses` + `verify:pack` run
     automatically via `prepublishOnly`).
   - Pushes the `v<version>` git tag.

## Publishing a dev prerelease (for testing a branch)

1. Push your dev branch (bump `package.json` to the intended next version if you
   want the dev build numbered against it).
2. Actions → **Release (dev prerelease)** → **Run workflow**, set **ref** to your
   branch.
   - Publishes `<version>-dev.<short-sha>` under the **`dev`** dist-tag.
   - No git tag; `latest` is untouched.
3. Install it with `npm i @apiboost/omnispec@dev` (or the exact `-dev.<sha>`).

## Notes

- **Provenance** requires the CI path (OIDC `id-token: write`); that's the main
  reason not to publish manually.
- `prepublishOnly` guards **every** publish path (build → license check → tarball
  verification), so a stray local `npm publish` still can't ship a broken tarball
  — but it won't be attested or tagged.
