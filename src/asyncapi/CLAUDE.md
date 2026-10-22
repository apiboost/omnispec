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
- Server and 2.x/3.x operation `security` requirements render as lock badges (`SecurityRequirementBadges`) that link to the schemes section. The parser captures the full requirement structure as `securityRequirements: AsyncApiSecurityRequirement[][]` (outer array = OR alternatives, inner = AND within an alternative), **including the required scopes per scheme** — 2.x from requirement-map values, 3.x from the entry's `scopes`. The badge shows each scheme name with its required scopes (`name · read, write`) and separates alternative requirements with an `OR` divider. (`securityNames: string[]` is retained for back-compat.) Scheme names are derived from 2.x requirement maps, 3.x `$ref`s (read from the pre-resolution raw doc), or an inline scheme's `type`.

---

## Tags & Grouping

`tag-grouping.ts` groups channels by the tags their operations carry **and the channel's own `tags` (3.x)** — `channelTagNames()` unions both, so a channel that is itself tagged groups correctly even when its operations are untagged. Group order follows **`x-tagGroups` order first** (when present, so the main content matches the sidebar, which nests groups under their `x-tagGroups` parent — 2.x and 3.x alike), then declared-tag order, then operation-only tags, then an **Untagged** bucket; a channel appears under each of its tags. When any channel is tagged, both the sidebar and the main content group by tag, with `TagGroupHeader` rendering the tag description and externalDocs (both render on data presence, 2.x and 3.x alike — never branch on version). Channel, operation, and message tags all render as chips via the shared `TagChips` component (each chip surfaces that tag's own `externalDocs` link through `ExternalDocsLink` when present); operation/channel chips are **filterable** — clicking one filters the list to that tag (`ChannelDetail`'s `onTagClick` → `AsyncApiSpec`'s search filter). The sidebar is derived from the *filtered* channel set, so the filter input updates the sidebar, not just the content; a search matching nothing shows a "No results" affordance rather than an empty group heading.

---

## Message Payloads

Multiple payload schema formats are valid in AsyncAPI:

- **JSON Schema** — rendered identically to OpenAPI via `@core/components/SchemaViewer/SchemaTree`.
- **Avro** — converted to a JSON-Schema field tree by `schema-formats.ts` (records, enums, arrays, maps, fixed, logicalTypes, nullable unions) before rendering. Selected via the message `schemaFormat`.
- **Protobuf / other custom formats** — rendered as their structured payload rather than a bare wrapper word.

Other message rendering:

- **Multiple messages** — an operation's `oneOf` (2.x) / `messages` array (3.x) are all kept (`AsyncApiOperation.messages[]`); a selector switches between them. Per the 3.0 spec, a 3.x operation that declares **no** `messages` inherits **all** of its channel's messages (not none) — `extractChannelsV3` falls back to the referenced channel's `messages`.
- **Examples** — the message's declared `examples` render (with a selector for named examples), falling back to a synthesized example only when none are declared.
- **Traits** — message and operation traits are merged in the parser with **version-aware precedence** (per the AsyncAPI spec; JSON Merge Patch / RFC 7386):
  - **2.x — the trait wins.** Traits are applied as patches on top of the object in declaration order (base = object; later traits override earlier ones and the object).
  - **3.x — the object wins.** "A property on a trait MUST NOT override the same property on the target object." Traits fold first, the object is applied last.
  - `tags` **replace** (not union) following the per-version rule; `externalDocs` is carried through as a normal mergeable field; `headers`/`examples`/`bindings` stay composite-merged. The version is threaded into the merge via `isV3`. **Do not revert this to a blanket object-wins — it is spec-wrong for 2.x**.
- **Trait provenance** — the parser records the identifiers of the traits applied to a message (`AsyncApiMessage.appliedTraits`, in applied order — a trait's `$ref` target name, or its `name`/`title`). `MessagePayload` shows them as a compact "Traits:" chip line, so both the channel view and the components Messages view reveal which traits a message uses.
- **correlationId** — rendered in **both** the channel view (`ChannelDetail`) and the components Messages view (`ComponentsSection`); it survives the version-aware trait merge, so a trait-provided `correlationId` shows wherever the message is browsed.
- **Tags** — a message's tags (own or trait-provided) render as chips on the message.
- **externalDocs** — root, tag (both the document-root tag in `TagGroupHeader` and a channel/operation/message tag's own `externalDocs` via `TagChips`), channel (3.x), operation, and message `externalDocs` all render via the shared `ExternalDocsLink` (↗ icon, `target="_blank"`, accessible "<context> external docs, opens in new tab" label). Extraction is version-agnostic; it renders wherever the data is present. `ExternalDocsLink` composes a lower-level `ExternalLink` primitive (icon + `target="_blank"` + "opens in new tab" a11y label); the `AsyncOverview` contact and license links use `ExternalLink` directly so every new-tab link gets the same icon + accessible treatment.
- `contentType`, `correlationId`, and headers-schema render on each message. When a message omits `contentType`, the parser fills it from the document-root `defaultContentType` (then `application/json`) and flags `contentTypeInherited` so the UI can mark it `(default)`. In the browsable components Messages view, headers render under an explicit **"Headers"** label. An unresolvable `$ref` payload renders a visible "Unresolved reference" notice rather than an empty schema.
- **Protobuf** full `.proto` field-tree parsing is a **Pro** capability (gRPC/Protobuf + `protobufjs` live in `@apiboost/omnispec-pro`). The free core renders the raw payload in a code block (with a "full Protobuf rendering in Pro" note) rather than collapsing it to the bare type word `any` — it does not pull in a protobuf parser.

---

## Request-Reply (3.x)

3.x `operation.reply` is parsed onto `AsyncApiOperation.reply` (`{ messages, address?: { location?, value?, description? }, channelName? }`) and rendered in a "Reply" section on the operation — the reply messages, the reply **address**, and the reply channel. The address covers **both** shapes the spec/tooling produce: a dynamic/runtime-expression `location` (a Reply Address Object) **and** a fixed literal address given as a plain string (`reply.address: 'some/queue'`, carried as `address.value`). Both render. 3.x operations also surface their `operationId` (the operations-map key) and `title`, matching 2.x.

A 3.x operation whose `channel` `$ref` can't be resolved — **including a document that defines zero channels** — is **not silently dropped**. It's collected under a synthetic `__unassigned__` channel ("Unassigned operations") so it stays visible, and `AsyncApiSpec` renders an always-visible "unresolved reference / operations reference an undefined channel" notice above the channel list (independent of the card's collapsed state) so the invalid input is never a silent disappearance.

---

## Display Modes

AsyncAPI honors the global `displayMode` (via `useConfig()`, same as OpenAPI):

- **`compact`** (default) — single-column channel/operation cards (`ChannelDetail`).
- **`reference`** — three-panel layout (`ChannelReferenceDetail` composing the shared `@core/components/Reference/ReferenceLayout`): operation detail in the main column, the message **payload schema + example in the right "Samples" column**, and reply messages. This mirrors the OpenAPI reference layout so a portal set to reference mode renders AsyncAPI docs consistently.

Reference mode is the AsyncAPI analogue of OpenAPI's — the samples column shows message payloads/examples (AsyncAPI has no request/response pair, so there is no Try-It column; see below).

## Accessibility

The mobile nav drawer (core `DocLayout`) moves focus into the drawer on open and restores it on close, and its trigger exposes `aria-expanded`/`aria-haspopup`. Collapsible sidebar group toggles (core `NavTree`) expose `aria-expanded`. These live in `core/` so every renderer benefits.

## Try-It

**AsyncAPI Try-It is N/A** — protocols like MQTT and Kafka cannot be exercised from a browser. The renderer should not show a Try-It panel for AsyncAPI operations (in reference mode the Try-It slot shows an "N/A for AsyncAPI protocols" note instead). Verify this is the case before shipping changes that touch the operation detail view.

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
  in QA. Every renderable field must have a component
  test asserting it appears in the DOM (see `ChannelDetail.test.tsx`,
  `BindingsSection.test.tsx`, `SecuritySchemesSection.test.tsx`).
- Component tests wrap in `ConfigProvider`; set `defaultExpandOperations: true` so
  `ExpandableCard` bodies mount. `IntersectionObserver` is stubbed in `test-setup.ts`.
- Storybook stories drive visual regression.
- Test fixtures live in `src/__fixtures__/`. When testing an advanced feature
  (bindings, security, traits, Avro, oneOf), add a fixture that actually exercises it —
  QA had to hand-author specs because the fixtures didn't cover these cases.
- QA test scope: the AsyncAPI renderer (2.x and 3.x).
