# Security Policy


Apiboost, Inc. takes the security of Apiboost OmniSpec seriously. We appreciate
the efforts of security researchers and the community in responsibly disclosing
vulnerabilities.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
pull requests, or discussions.**

Instead, report them privately using **GitHub's private vulnerability
reporting** feature:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** to open a private advisory.
3. Provide the details described below.

For more on how private reporting works, see GitHub's documentation:
https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately

If you are unable to use GitHub private vulnerability reporting, you may contact
Apiboost through https://www.apiboost.com/contact and request a secure channel
for disclosure.

## What to include

A helpful report includes:

- A description of the vulnerability and its potential impact.
- The affected package(s), product (open-source core or Pro), and version(s).
- Step-by-step instructions to reproduce the issue.
- Any proof-of-concept code, logs, or screenshots.
- Any suggested remediation, if you have one.

## Our commitment

When you report a vulnerability privately, we will:

- Acknowledge receipt of your report.
- Investigate and work to validate and reproduce the issue.
- Keep you informed of our progress.
- Work with you on coordinated disclosure and credit you for the discovery,
  unless you prefer to remain anonymous.

We ask that you give us a reasonable opportunity to investigate and release a fix
before any public disclosure.

## Supported versions

Security fixes are provided for supported releases. The table of supported
versions will be maintained here as the project establishes its release cadence.

| Version | Supported |
|---------|-----------|
| Latest release | ✅ |
| Older releases | ⚠️ Best effort — please upgrade |


## Scope

This policy covers vulnerabilities in the **source code of this repository** —
the Apiboost OmniSpec open-source core — and, where applicable, the Pro product.

### In scope

- Vulnerabilities in the code maintained in this repository.

### Out of scope

- **Third-party dependencies.** Dependency vulnerabilities are monitored and
  remediated automatically via GitHub Dependabot, which scans our dependencies,
  raises alerts, and opens update pull requests. You do **not** need to report
  them here, and automated scanner output listing transitive CVEs is generally
  not actionable through this channel. Vulnerabilities in the dependencies
  themselves should be reported to their respective upstream projects.
- Reports for versions that are no longer supported (please reproduce against a
  supported release first).
- Issues that require an already-compromised host, a malicious dependency the
  user chose to install, or otherwise fall outside a realistic threat model for
  a documentation-rendering library.

If you believe a dependency vulnerability is **directly exploitable through this
project's own code**, that is in scope — please report it, and note the code
path that exposes it.

---

Thank you for helping keep Apiboost OmniSpec and its users safe.
