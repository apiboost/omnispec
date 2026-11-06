---
id: asyncapi
title: AsyncAPI
sidebar_label: AsyncAPI
description: Render AsyncAPI 2.x and 3.x event-driven API documentation with @apiboost/omnispec — channels, operations (2.x publish/subscribe, 3.x send/receive), message payloads (JSON Schema, Avro), request-reply, tag grouping, security schemes, and protocol bindings, all in the free core.
---

# AsyncAPI

Apiboost OmniSpec renders **AsyncAPI 2.x and 3.x** event-driven API documentation in the **same component** as OpenAPI — the spec type is auto-detected, so you render channels, operations, and message payloads with the identical setup you use for REST. AsyncAPI support ships in the Apache-2.0 **core** (`@apiboost/omnispec`); no separate package or plugin.

## Rendering an AsyncAPI document

Use the auto-detecting `<OmniSpecRenderer>`, or the explicit `<AsyncApiSpec>`:

```tsx
import { OmniSpecRenderer } from '@apiboost/omnispec'

// Auto-detects AsyncAPI vs OpenAPI from the document
<OmniSpecRenderer spec="/streetlights.yaml" />
```

```tsx
import { AsyncApiSpec } from '@apiboost/omnispec'

<AsyncApiSpec spec="/streetlights.yaml" />
```

`spec` accepts a URL to fetch, a raw YAML/JSON string, or a pre-parsed object. Every [shared prop](./api-reference.md) — `theme`, `layout`, `sidebarPosition`, `displayMode`, `slots`, `downloadLink` — applies to AsyncAPI exactly as it does to OpenAPI.

## One component, both major versions

AsyncAPI 3.0 restructured the document, and OmniSpec normalizes both shapes into a single internal model so the UI is consistent regardless of version. The version is detected from the document's `asyncapi` field.

| Aspect | AsyncAPI 2.x | AsyncAPI 3.x |
|---|---|---|
| Model | Channel-centric | Operations are first-class |
| Operations | `publish` / `subscribe` **inside** each channel | Top-level `operations` that reference a channel via `$ref` |
| Action labels | `PUB` / `SUB` (2.x) | `SEND` / `RECV` (3.x) |
| Document `tags` / `externalDocs` | Document root | Under the `info` object |
| Request-reply | — | `operation.reply` |

**A note on direction.** AsyncAPI 2.x `publish`/`subscribe` are written from the *client's* point of view — `publish` means the application *receives* a message, and `subscribe` means it *sends* one. AsyncAPI 3.0 switched to `send`/`receive`, written from the *application's* own point of view (which is exactly why it renamed them). The renderer surfaces these as badges and doesn't reinterpret their meaning.

You do not configure any of this — load a 2.x or 3.x document and the renderer adapts.

## Channels and operations

Each channel renders as a card showing its address, description, parameters (with type, `format`, `enum`, and constraints), protocol bindings, tags, and `externalDocs`. The card header lists **every distinct action** the channel carries — a channel with both a publish and a subscribe operation shows `PUB / SUB`, not just one.

Each operation shows its action badge, `operationId` and `title`, summary and description, tags, `externalDocs`, security requirements, message(s), and bindings. In **3.x**, an operation that references a channel which isn't defined is surfaced under an "Unassigned operations" group with a notice rather than silently dropped.

## Message payloads

Message payload schemas render in a **Payload Schema** tab with an **Example** tab beside it.

- **JSON Schema** payloads render identically to OpenAPI schemas (the same schema tree, constraints, and badges).
- **Avro** payloads (`schemaFormat: application/vnd.apache.avro`) are converted to a real field tree — records, enums, arrays, maps, `logicalType`s, and nullable unions — not a bare `record` word.
- **Multiple messages** on an operation (2.x `oneOf`, 3.x `messages[]`) all render, with a selector to switch between them. Per the 3.0 spec, a 3.x operation that declares **no** messages inherits **all** of its channel's messages.
- **Headers**, **`correlationId`**, and **`contentType`** render per message. A message with no `contentType` inherits the document's `defaultContentType` (then `application/json`).
- **Examples** — declared message `examples` render (with a selector for named examples); an example declared on the payload schema itself is used too. When none is declared, an example is synthesized from the schema.
- **Traits** — message and operation traits are merged with **version-aware precedence** (2.x: the trait wins; 3.x: the object wins, per the spec). The applied traits show as a compact **"Traits:"** chip line using their real names (including `$ref`'d trait names).

:::info[Pro]
Full Protobuf (`.proto`) **field-tree** parsing is an [OmniSpec Pro](https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=docs&utm_campaign=pro) capability. In the free core, a Protobuf payload renders its `.proto` **source** cleanly in the Payload Schema tab (with a short note), rather than a bare type word.
:::

## Request-reply (3.x)

A 3.x operation's `reply` renders as a **Reply** section showing the reply message(s), the reply **channel** (a link to that channel's card), and the reply **address**. Both address shapes are supported: a dynamic runtime-expression `location` (a Reply Address Object) and a fixed literal address given as a plain string. Reply metadata renders identically in compact and reference display modes.

## Tags, grouping, and navigation

When any channel is tagged, both the sidebar and the main content group channels by tag:

- **Tag groups** render with the tag's description and `externalDocs` in the group header; a channel with multiple tags appears under each. Untagged channels fall into an **"Untagged"** bucket.
- The **`x-tagGroups`** vendor extension nests tag groups under a parent group in the sidebar (matching the OpenAPI renderer).
- A **"Group by: Channel | Operation"** toggle offers the operation-first index that 3.x users expect; the main content stays channel-centric.
- Tag chips are **filterable** — clicking one filters the list to that tag, with a dismissible "Filtered by tag" indicator. The active tag is reflected in the URL (`?tag=…`), so a filtered view is **shareable and bookmarkable** and is applied on first load.

`externalDocs` renders wherever the spec allows it — document root (under `info` in 3.0), tags, channels (3.x), operations, and messages — each as an accessible "opens in new tab" link.

## Security and protocol bindings

- **Security schemes** (`components.securitySchemes`) render for every scheme type (apiKey, http, oauth2 with flows + scopes, openIdConnect, userPassword, X509, SASL variants, GSSAPI, …). Server- and operation-level `security` requirements render as lock badges — showing each scheme's required scopes — that link to the schemes section.
- **Protocol bindings** on servers, channels, operations, and messages all render through one generic renderer (MQTT, Kafka, WebSocket, AMQP, STOMP, HTTP, NATS, and more), degrading gracefully for unrecognized protocols.

## Display modes

AsyncAPI honors the global `displayMode` just like OpenAPI:

```tsx
// Three-panel reference layout
<AsyncApiSpec spec={url} displayMode="reference" />
```

- **`compact`** (default) — single-column channel/operation cards.
- **`reference`** — a three-panel layout; the main column shows the operation detail and the right **Samples** column shows the message payload schema and example.

AsyncAPI protocols (MQTT, Kafka, …) can't be exercised from a browser, so AsyncAPI operations have **no interactive Try-It**. Compact mode shows no Try-It panel at all; in reference mode the **Try It** tab shows the note *"Interactive testing is not available for AsyncAPI protocols."* See [Configuration](./configuration.md#display-mode) for display and navigation modes.

## See also

- [Component API Reference](./api-reference.md) — all shared props
- [Configuration](./configuration.md) — layout, display mode, navigation
- [Vendor Extensions](./vendor-extensions.md) — `x-tagGroups` and other supported extensions
- [Theming](./theming.md) — design tokens and white-labeling
