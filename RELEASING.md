<!--
This source file is part of the Apiboost(R) OmniSpec Core.

Copyright (c) Apiboost, Inc.

SPDX-License-Identifier: Apache-2.0

See LICENSE.md and LICENSING.md in the project root for license information.
-->

# Releasing `@apiboost/omnispec`

Releases are **fully automated with [semantic-release](https://semantic-release.gitbook.io/)**,
driven by the Conventional Commits we already enforce with commitlint. You do not
bump the version by hand. Merge to `main`, and CI decides the version, publishes
to npm with provenance, tags the commit, and writes a GitHub Release.

`package.json` shows `0.0.0-development` on purpose: the real version lives in the
git tags and on npm, which semantic-release manages.

## How versions are decided

Commit types since the last release tag determine the bump:

| Commit | Bump |
|--------|------|
| `fix:` / `hotfix:` | patch (e.g. 1.3.0 to 1.3.1) |
| `feat:` | minor (e.g. 1.3.0 to 1.4.0) |
| `feat!:` or a `BREAKING CHANGE:` footer | major (e.g. 1.3.0 to 2.0.0) |
| `chore:` / `docs:` / `refactor:` / `test:` / `build:` | no release |

A merge that contains only non-releasing commits publishes nothing.

## Cutting a stable release

1. Merge a PR to `main` whose commits follow Conventional Commits.
2. The **Release** workflow runs automatically:
   - analyzes commits, computes the next version,
   - `npm publish --provenance` (build, `check:licenses`, and `verify:pack` run via `prepublishOnly`),
   - pushes the `v<version>` tag and creates a GitHub Release with generated notes.

That is the whole flow. No manual version bump, no manual dispatch.

## Publishing a dev prerelease (for testing a branch)

Push work to the **`dev`** branch. semantic-release publishes a prerelease such as
`1.4.0-dev.1` under the **`dev`** dist-tag. Install it with:

```bash
npm i @apiboost/omnispec@dev        # latest dev build
npm i @apiboost/omnispec@1.4.0-dev.1 # a specific one
```

`latest` is never touched by dev builds.

## One-time setup (maintainers)

1. **`NPM_TOKEN` secret** — a granular/automation token with publish rights to the
   `@apiboost` scope (Settings > Secrets and variables > Actions).
2. **Seed the baseline tag (required once).** semantic-release derives the last
   version from git tags, and this repo currently has none while npm is at 1.3.0.
   Create the baseline so the next release continues from 1.3.0:
   ```bash
   git checkout main && git pull
   git tag v1.3.0        # on the current main HEAD
   git push origin v1.3.0
   ```
   Do this **before** the first Release run, or semantic-release will start at 1.0.0.
3. **Merge this PR as a non-releasing commit** (a `chore:` squash message) so it
   does not trigger a release on its own. The first real `feat:`/`fix:` after that
   produces 1.3.1 or 1.4.0.

## Notes

- `GITHUB_TOKEN` (auto-provided) creates the tag and GitHub Release, so nothing is
  pushed to the protected `main` branch. There is no committed `CHANGELOG.md`; the
  changelog is the GitHub Release notes.
- Provenance requires the CI path (OIDC `id-token: write`); do not publish manually.
- `prepublishOnly` still guards every publish (build, license check, tarball verify).
