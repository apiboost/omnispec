# Contributing to Apiboost OmniSpec

Thank you for your interest in contributing to **Apiboost OmniSpec**! This
project is developed and maintained by Apiboost, Inc., and we welcome community
contributions to the open-source core.

By participating in this project, you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report bugs** and request features through the GitHub issue queue.
- **Improve documentation** — fixes and clarifications are always welcome.
- **Submit code** via pull requests for bug fixes and features.

If you are planning a large or architectural change, please **open an issue to
discuss it first**. This helps avoid duplicated effort and ensures the change
aligns with the project's direction before you invest significant time.

## Scope: open-source core only

Contributions are accepted against the **open-source core** of Apiboost
OmniSpec (this repository), which is licensed under the
[Apache License 2.0](./LICENSE.md). Apiboost's commercial **Pro** product is a
separate, proprietary product built on this core; it lives outside this
repository and does not accept external code contributions. See
[`LICENSING.md`](./LICENSING.md).

## Reporting bugs and requesting features

Please use the GitHub issue queue. A good report includes:

- A clear, descriptive title.
- Steps to reproduce, expected behavior, and actual behavior.
- Version information (package version, Node.js version, browser if relevant).
- A minimal reproduction (spec file, code snippet, or sandbox) where possible.

**Do not report security vulnerabilities in public issues.** Follow the process
in [`SECURITY.md`](./SECURITY.md) instead.

## Development setup

See the [`README.md`](./README.md) for full instructions. In brief:

- Node.js (see `.nvmrc`) and pnpm are required.
- Install dependencies with `pnpm install`.
- Build with `pnpm run build`; type-check with `pnpm run typecheck`.
- Lint with `pnpm run lint` (zero-warnings policy) and run tests with
  `pnpm run test`.

## Pull request process

1. **Fork** the repository and create a topic branch from the default branch.
2. Make your change in focused, logically separate commits.
3. Add or update **tests** for your change, and make sure the full test suite,
   linter, and type-checker pass.
4. Update relevant **documentation** (including `docs/` for any
   user-facing behavior change).
5. Ensure every commit is **signed off** (see below).
6. Open a pull request against the default branch, describe the change and its
   motivation, and link any related issue.
7. Be responsive to review feedback. A maintainer will merge once the PR is
   approved and CI is green.

### Commit messages

This project uses **[Conventional Commits](https://www.conventionalcommits.org/)**,
enforced by commitlint via a Git hook. Format your commit subject as
`type(scope): summary`, for example:

```
fix(openapi): handle missing servers array in v3 specs
feat(theming): add auto light/dark base theme
docs(contributing): clarify DCO sign-off
```

## Developer Certificate of Origin (DCO) sign-off

All contributions must be made under the
[Developer Certificate of Origin](./DEVELOPER_CERTIFICATE_OF_ORIGIN.md) (DCO).
The DCO is a lightweight statement that you have the right to submit your
contribution under the project's open-source license.

To certify the DCO, add a `Signed-off-by` line to every commit using your real
name and an email address you can be reached at:

```
Signed-off-by: Jane Developer <jane@example.com>
```

Git can add this automatically with the `-s` flag:

```bash
git commit -s -m "fix(openapi): handle missing servers array"
```

Pull requests whose commits are not signed off cannot be merged. If you forget,
you can amend or rebase to add the sign-off before your PR is merged.

## AI-assisted contributions

We welcome contributions created with the help of AI coding tools (e.g., code
assistants, chat-based models, autocomplete). We also ask that you be
transparent about it, because AI-generated content carries provenance and
licensing considerations that reviewers need to be aware of.

**Your responsibilities are the same regardless of the tools you used.** By
signing off on your commits (see the DCO section above), you certify that you
have the right to submit the contribution under the project's license. This
means, for AI-assisted work, that you must:

- **Understand and review** the code you are submitting. You are accountable for
  it as if you had written every line yourself.
- **Ensure you have the right to submit it.** Do not submit AI-generated output
  that reproduces third-party code in a way that is incompatible with the
  [Apache License 2.0](./LICENSE.md), or that you do not have the right to
  contribute.
- **Test it and hold it to the same quality bar** as any other contribution.

### Disclosing AI assistance

If AI tools materially contributed to a change, disclose it with an
`Assisted-by` trailer in the commit message, placed alongside your
`Signed-off-by` line:

```
Assisted-by: <AI tool name>
Signed-off-by: Jane Developer <jane@example.com>
```

`<AI tool name>` must be the **exact model** you used, including its version —
for example:

```
Assisted-by: Claude Opus 4.8
Assisted-by: Kimi 2.5
Assisted-by: ChatGPT 5.6
```

If more than one model contributed materially, add one `Assisted-by` line per
model. Include the same statement in your pull request (the pull request
template has a field for it) so it is visible in review.

Disclosure is about transparency, not disapproval — it will not, by itself,
cause a contribution to be rejected. Failing to review AI-generated code, or
submitting code you do not have the right to contribute, will.

## Licensing of your contributions

Unless you explicitly state otherwise, any contribution you intentionally submit
for inclusion in the open-source core is submitted under the terms of the
[Apache License 2.0](./LICENSE.md), per Section 5 of that license and your DCO
sign-off. You retain the copyright to your contribution.

### Use of your contribution in the Pro product

Apiboost's commercial **Pro** product is built on top of the open-source core and
consumes it as a dependency. The Apache License 2.0 you contribute under is a
permissive license: it already grants Apiboost, Inc. — and everyone else — a
perpetual, worldwide, royalty-free right to use, reproduce, modify, and
redistribute your contribution, including as part of a larger proprietary work.

Concretely: **by submitting a contribution to Apiboost OmniSpec (the open-source
core), you grant Apiboost the rights it needs to include that contribution in
Apiboost OmniSpec Pro.** No separate Contributor License Agreement is required.

What this does *not* do:

- It does **not** transfer your copyright — you keep it.
- It is **not** exclusive to Apiboost. Your contribution stays in this
  repository under the Apache License 2.0, available to you and to everyone else
  on exactly the same terms.
- It does **not** relicense the core. Pro is a separate product that consumes the
  core; when Pro is distributed, it remains subject to the Apache License 2.0's
  attribution and notice requirements for the core it includes, including
  [`NOTICE.md`](./NOTICE.md).

## License of the project

By contributing, you acknowledge that your contributions to the open-source core
are and will be licensed under the Apache License 2.0.

---

Questions about contributing? Reach us via https://www.apiboost.com/contact or
open a discussion in the issue queue.
