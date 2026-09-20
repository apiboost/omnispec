# npm publishing — one-time setup (do this tomorrow)

> Personal runbook. **Uncommitted / local-only** — not part of the repo history.
> The committed process lives in `RELEASING.md` (lands with PR #10). This is the
> account-side checklist that only you can do.

## 1. Create the npm token
- npmjs.com → your avatar → **Access Tokens** → **Generate New Token**.
- Prefer a **Granular Access Token**: Packages & scopes → read+write on the
  **`@apiboost`** scope; set an expiry you'll rotate. (A classic **Automation**
  token also works and bypasses 2FA.)
- Copy the token (shown once).

## 2. Add it as a repo secret
- GitHub → `apiboost/omnispec` → **Settings → Secrets and variables → Actions**
  → **New repository secret**.
- Name: **`NPM_TOKEN`**  ·  Value: the token from step 1.
- Until this exists, `Release` / `Release (dev prerelease)` fail at the publish
  step by design.

## 3. Confirm org publishing settings
- npmjs.com → **@apiboost** org → **Settings** → Members/Publishing.
- Ensure publishing with a **token + provenance** is allowed (NOT
  "require 2FA and disallow tokens", which would block automation).

## 4. Clean up the legacy dist-tags (one-time)
Run locally while logged in with publish rights (`npm whoami` to check):
```bash
npm dist-tag ls @apiboost/omnispec          # see the mess first
npm dist-tag rm @apiboost/omnispec v1.2.11-dev
npm dist-tag rm @apiboost/omnispec v1.2.11-dev-1
npm dist-tag rm @apiboost/omnispec v1.2.11-dev.1
npm dist-tag rm @apiboost/omnispec v1.2.11.dev2
npm dist-tag ls @apiboost/omnispec          # should leave: latest (+ dev after first dev publish)
```

## 5. First CI release (after PR #10 merges)
Stable (version-in-PR):
1. PR to `main` bumping `package.json` version (e.g. `1.3.0 → 1.3.1`) + changelog → merge.
2. GitHub → **Actions → Release → Run workflow** (from `main`).
3. It publishes with provenance and pushes the `v1.3.1` tag.

Dev prerelease (test a branch without touching `latest`):
1. **Actions → Release (dev prerelease) → Run workflow**, set **ref** to your branch.
2. Installs as `npm i @apiboost/omnispec@dev` (or the exact `-dev.<sha>`).

## Sanity checks after first release
```bash
npm view @apiboost/omnispec version dist-tags
npm view @apiboost/omnispec@<version> --json | grep -i attestations   # provenance present
git ls-remote --tags origin | grep v<version>                          # tag pushed
```
