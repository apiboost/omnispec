# CLAUDE.md — `src/asyncapi/`

AsyncAPI 2.x and 3.x renderer. Bundled in the **Free tier** alongside OpenAPI. The structural difference between 2.x (channel-centric) and 3.x (operations-as-first-class) is handled by the parser, not the components.

---

## Directory Map

```
asyncapi/
├── AsyncApiSpec.tsx          Main orchestrator (lazy-loaded by unified/OmniSpecRenderer)
├── AsyncApiSpec.stories.tsx
├── components/
│   ├── AsyncOverview.tsx     Title, description, contact, license, externalDocs
│   ├── ServerList.tsx        Servers: URL (with highlighted {variables}), protocol,
│   │                         variables (default/enum/description), security, bindings;
│   │                         a tab selector picks one server when several are defined
│   ├── ChannelDetail.tsx     Channel card: params, operations, messages, bindings, reply
│   ├── BindingsSection.tsx   Generic protocol-binding renderer (all protocols)
│   ├── SecuritySchemesSection.tsx  components.securitySchemes (all scheme types)
│   ├── ComponentsSection.tsx Reusable component messages + schemas
│   ├── TagGroupHeader.tsx    Tag group header (name, description, externalDocs)
│   └── ProtocolBadge.tsx
├── tag-grouping.ts           Pure helper: group channels by tag (+ Untagged bucket)
├── schema-formats.ts         Avro → JSON-Schema conversion + schemaFormat detection
├── hooks/                    AsyncAPI-specific React hooks
├── parser/                   Parser + 2.x ↔ 3.x normalization, trait merge, $ref names
├── types/                    AsyncAPI TypeScript types
└── index.ts                  Barrel — public subpath export
```

---

## Path Alias

`@asyncapi/*` resolves to this directory.

---

## 2.x vs 3.x Normalization

AsyncAPI 3.x decoupled operations from channels — operations are now top-level entities that reference channels. The parser converts both shapes into a single internal model:

- 2.x `channels[name].publish/subscribe` → internal `operations[]` with `action: 'publish' | 'subscribe'` + `channelRef`
- 3.x `operations[name].action` + `channel: $ref` → internal `operations[]` with `action: 'send' | 'receive'` + `channelRef`

Components consume the normalized model. **Never branch on AsyncAPI version inside components** — push the normalization into the parser.

The internal action vocabulary deliberately keeps both 2.x and 3.x labels because they have slightly different semantics (`publish`/`subscribe` is producer-side; `send`/`receive` is consumer-side).

Because the model is channel-centric, the sidebar groups by channel by default. A **"Group by: Channel | Operation"** toggle (`AsyncApiSpec.tsx`) offers the operation-first index that 3.x users expect — operation-mode entries navigate to the owning channel's card (expanding it via `useHashScroll`/`onExpandRequest`). Main content stays channel-centric in both modes.

---

## Protocol Bindings

AsyncAPI supports per-protocol bindings on **servers, channels, operations, and messages**, and all four are rendered by a single generic component: `components/BindingsSection.tsx`.

Rather than a bespoke renderer per protocol, `BindingsSection` renders every binding field as a labelled row (with a `ProtocolBadge`). This covers all known protocols (MQTT, Kafka, WebSocket, AMQP, STOMP, HTTP, NATS, …) **and degrades gracefully for unrecognized protocols** — their raw fields render instead of being dropped or crashing. New protocols need no code changes; add friendly field labels only if the humanized default is unclear.

Server-level bindings are parsed in `extractServers` (they were previously dropped). Channel/operation/message bindings flow through the parser onto the model and are rendered in `ChannelDetail` / `ServerList`.

---

## Security

- `components.securitySchemes` is parsed into the model and rendered by `SecuritySchemesSection` — every scheme type is supported (apiKey, httpApiKey, http, oauth2 with flows + scopes, openIdConnect, userPassword, X509, symmetric/asymmetric encryption, scramSha256/512, gssapi, plain) via a generic type-badge + field-row renderer.
- Server and 3.x operation `security` requirements render as lock badges that link to the schemes section. Scheme names are derived from 2.x requirement maps, 3.x `$ref`s (read from the pre-resolution raw doc), or an inline scheme's `type`.

---

## Tags & Grouping

`tag-grouping.ts` groups channels by the tags their operations carry (declared-tag order first, then operation-only tags, then an **Untagged** bucket; a channel appears under each of its tags). When any channel is tagged, both the sidebar and the main content group by tag, with `TagGroupHeader` rendering the tag description and externalDocs. Operation tags render as chips. The sidebar is derived from the *filtered* channel set, so the filter input updates the sidebar, not just the content.

---

## Message Payloads

Multiple payload schema formats are valid in AsyncAPI:

- **JSON Schema** — rendered identically to OpenAPI via `@core/components/SchemaViewer/SchemaTree`.
- **Avro** — converted to a JSON-Schema field tree by `schema-formats.ts` (records, enums, arrays, maps, fixed, logicalTypes, nullable unions) before rendering. Selected via the message `schemaFormat`.
- **Protobuf / other custom formats** — rendered as their structured payload rather than a bare wrapper word.

Other message rendering:

- **Multiple messages** — an operation's `oneOf` (2.x) / `messages` array (3.x) are all kept (`AsyncApiOperation.messages[]`); a selector switches between them.
- **Examples** — the message's declared `examples` render (with a selector for named examples), falling back to a synthesized example only when none are declared.
- **Traits** — message and operation traits are merged in the parser (declaration order, own definition wins; tags unioned, headers/bindings merged).
- `contentType`, `correlationId`, and headers-schema render on each message. An unresolvable `$ref` payload renders a visible "Unresolved reference" notice rather than an empty schema.

---

## Request-Reply (3.x)

3.x `operation.reply.messages` are parsed onto `AsyncApiOperation.reply` and rendered in a "Reply" section on the operation.

---

## Try-It

**AsyncAPI Try-It is N/A** — protocols like MQTT and Kafka cannot be exercised from a browser. The renderer should not show a Try-It panel for AsyncAPI operations. Verify this is the case before shipping changes that touch the operation detail view.

---

## Adding a New Component

1. Drop it under `asyncapi/components/`
2. Co-locate test + story
3. Add the Apache-2.0 license header (template in the root CLAUDE.md)
4. Use `@core/components/common/*` primitives
5. If the pattern would apply to another spec type, consider promoting it to `@core/components/`
6. Update `packages/omnispec/docs/client_docs/` if user-facing

---

## Testing

- Unit tests with vitest, co-located as `*.test.tsx` / `*.test.ts`.
- **Test the rendered UI, not just the parser.** A field being present on the parsed
  model does not mean it reaches the screen — that gap (parser complete, render layer
  missing, docs describing it as done) is exactly what shipped broken and was caught
  in QA (ABOSPEC-40 / ABOSPEC-45–53). Every renderable field must have a component
  test asserting it appears in the DOM (see `ChannelDetail.test.tsx`,
  `BindingsSection.test.tsx`, `SecuritySchemesSection.test.tsx`).
- Component tests wrap in `ConfigProvider`; set `defaultExpandOperations: true` so
  `ExpandableCard` bodies mount. `IntersectionObserver` is stubbed in `test-setup.ts`.
- Storybook stories drive visual regression.
- Test fixtures live in `src/__fixtures__/`. When testing an advanced feature
  (bindings, security, traits, Avro, oneOf), add a fixture that actually exercises it —
  QA had to hand-author specs because the fixtures didn't cover these cases.
- QA test scope: ABOSPEC-40 + sub-tasks (AsyncAPI-specific).
