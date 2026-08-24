---
title: Free vs Pro
sidebar_position: 2
---

# Free vs Pro

`@apiboost/omnispec` — the free core — is a **complete, production-ready API documentation renderer**. It is published under the **Apache-2.0** license on the public npm registry, has no runtime license check, and is not a time-limited trial. If your APIs are described with OpenAPI or AsyncAPI, the free core renders them fully, including interactive Try-It, code samples, theming, and a framework-agnostic web component.

**[Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)** is a separate, proprietary package (`@apiboost/omnispec-pro`) that extends the free core with additional spec renderers, deeper white-labeling, premium vendor extensions, and interactive OAuth. Pro is a drop-in superset: it re-exports everything in Free and swaps in a Pro-wired renderer, so nothing you build on Free is thrown away when you upgrade.

:::info
The public documentation site fully documents everything the free core does. Pro capabilities are named and summarized here, but their configuration syntax and recipes live in the Pro documentation. Where a page mentions a Pro feature, it also states what the free core does instead.
:::

## At a glance

| Dimension | Free (`@apiboost/omnispec`) | Pro (`@apiboost/omnispec-pro`) |
|---|---|---|
| **License** | Apache-2.0 (open source) | Proprietary (commercial) |
| **Registry** | Public npm | GitHub Packages (license-validated) |
| **Renderers** | OpenAPI 2.0 / 3.0 / 3.1, AsyncAPI 2.x / 3.x | + GraphQL (SDL + introspection), SOAP / WSDL, gRPC / Protobuf |
| **Try-It** | Yes — direct (browser) and proxied | Inherited from Free |
| **Authentication** | API key, Basic, Bearer, OAuth2 with **manual token paste** | + Interactive OAuth: Authorization Code + PKCE "Get Token", OpenID Connect, the `oauth` prop |
| **Code samples** | 6 languages (cURL, JavaScript, Python, Go, Java, C#) | Inherited from Free; customizable with `x-codeSamples` |
| **Theming** | `theme.base` (`light` / `dark` / `auto`) + raw `--omnispec-*` CSS-variable overrides on `.omnispec-root` | + `theme.overrides` — structured white-labeling across 70+ design tokens |
| **Vendor extensions** | `x-logo` | + `x-codeSamples`, `x-tagGroups`, `x-displayName`, `x-badges`, `x-internal`, `x-enumDescriptions` |
| **Schema rendering** | Tree view with cross-links | + `schemaStyle` `'table'` / `'card'` layouts |
| **Try-It proxy** | Express middleware (`@apiboost/omnispec/server`) with SSRF guard, rate limiting, allow-listing | Inherited from Free |
| **External `$ref`** | Same-origin auto-resolve; cross-origin allow-list with SSRF + fetch limits | Inherited from Free |
| **Web component** | `<omnispec-renderer>` custom element (any framework) | Inherited from Free (renders OpenAPI/AsyncAPI; Pro renderers are React-only today) |
| **Slots, sidebar nav, layout / display / navigation modes** | Yes | Inherited from Free |
| **Support** | Community (GitHub issues) | Commercial support and SLAs |

## What the free core does when a Pro feature is requested

The free core is designed to degrade gracefully — it never crashes when it encounters something Pro would render:

- **Unsupported spec types** (GraphQL, SOAP, gRPC) display a styled upgrade prompt instead of the document.
- **`theme.overrides`** passed to the free core is ignored; set the same design tokens as raw `--omnispec-*` CSS variables on `.omnispec-root` to achieve the same white-labeling in Free.
- **OAuth2 security schemes** are rendered with the flow details visible and a manual token-paste field; the interactive "Get Token" button is a Pro capability.
- **Pro vendor extensions** in a spec are simply not acted upon — the document still renders. Only `x-logo` is honored by the free core.

## When you need Pro

Reach for [Apiboost OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro) when you need to:

- Render **GraphQL, SOAP/WSDL, or gRPC** APIs alongside your OpenAPI/AsyncAPI docs.
- Ship a **fully white-labeled** portal via structured `theme.overrides` rather than hand-authored CSS variables.
- Give consumers **one-click OAuth** (Authorization Code + PKCE) or **OpenID Connect** discovery in the Try-It panel instead of pasting tokens manually.
- Use premium vendor extensions authored for Redocly, Scalar, or RapiDoc — `x-codeSamples`, `x-tagGroups`, `x-badges`, and more — without modifying your specs.
- Get **commercial support** with response-time commitments.

Upgrading is a package swap: import `OmniSpecRenderer` from `@apiboost/omnispec-pro` instead of `@apiboost/omnispec`, and every free feature keeps working. Learn more at **[apiboost.com](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro)**.
