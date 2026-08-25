---
id: introduction
title: What is OmniSpec?
sidebar_label: What is OmniSpec?
description: OmniSpec is an open-source React renderer for interactive OpenAPI/Swagger and AsyncAPI documentation — with a built-in Try-It console, auto-generated code samples, and a framework-agnostic Web Component.
keywords:
  - OmniSpec
  - open source API documentation
  - OpenAPI
  - Swagger
  - AsyncAPI
  - React API docs renderer
  - Try-It console
  - Redoc alternative
---

# What is OmniSpec?

**OmniSpec is an open-source React renderer that turns your OpenAPI/Swagger and AsyncAPI specifications into interactive, branded documentation — with a built-in Try-It console and auto-generated code samples.**

Drop in a spec — a URL, a raw string, or a parsed object — and OmniSpec auto-detects the type and renders a full reference site: sidebar navigation, schema viewers, code samples, and a live Try-It panel. It runs anywhere React does, and ships a framework-agnostic [Web Component](./web-component.md) for everything else.

## Why we built it

Apiboost is an API developer-platform company, and for years we kept building — or bending — a different rendering tool for every client engagement: one for SOAP/WSDL, another for GraphQL, and a pile of workarounds to make OpenAPI tooling do what we actually needed.

Eventually the pattern was impossible to ignore: **API specification sprawl is real.** Teams describe their APIs in whatever format fits the protocol — REST in OpenAPI, event streams in AsyncAPI, internal services in gRPC, legacy integrations in SOAP — and then stitch together a patchwork of renderers, each with its own look, its own quirks, and its own maintenance burden.

We already solve gateway sprawl for our customers. So why not solve spec sprawl too? The open-source core renders **OpenAPI and AsyncAPI**; **[OmniSpec Pro](./free-vs-pro.md)** extends the same renderer to GraphQL, SOAP/WSDL, and gRPC — one tool for your whole API surface, instead of a drawer full of half-fitting ones.

## Security shouldn't be a premium feature

Apiboost is built on security and access, and we carried that into OmniSpec.

The Try-It console can route requests through a backend proxy that ships with **SSRF protection, rate limiting, and origin allow-listing**; cross-origin `$ref` resolution is locked down by default and opt-in per origin. All of it lives in the free, **Apache-2.0** core — see [Security](./security.md) and [Backend Integration](./backend-integration.md).

In a world clawing for data, the tooling that helps a developer community succeed should not put the safe defaults behind a paywall. Pro adds convenience and reach — more spec types, deeper white-labeling, one-click OAuth — but the secure foundation is free for everyone.

## One renderer, every spec

| In the free core | In OmniSpec Pro |
|---|---|
| OpenAPI 2.0 / 3.0 / 3.1, AsyncAPI 2.x / 3.x | + GraphQL (SDL + introspection), SOAP/WSDL, gRPC / Protobuf |
| Try-It (direct + proxied), 6-language code samples | Inherited from Free |
| `theme.base` + raw `--omnispec-*` CSS white-labeling | + structured `theme.overrides` across 70+ tokens |
| OAuth2 with manual token paste | + interactive OAuth "Get Token" (Authorization Code + PKCE), OpenID Connect |

The upgrade is a package swap — nothing you build on Free is thrown away. See [Free vs Pro](./free-vs-pro.md) for the full comparison.

## Next steps

- [Getting Started](./getting-started.md) — render your first spec in under two minutes
- [Concepts](./concepts.md) — the mental model behind OmniSpec
- [Integrations](./integrations-overview.md) — React, docs sites, and the Web Component
