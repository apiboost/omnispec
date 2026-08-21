# CLAUDE.md — `src/asyncapi/`

AsyncAPI 2.x and 3.x renderer. Bundled in the **Free tier** alongside OpenAPI. The structural difference between 2.x (channel-centric) and 3.x (operations-as-first-class) is handled by the parser, not the components.

---

## Directory Map

```
asyncapi/
├── AsyncApiSpec.tsx          Main orchestrator (lazy-loaded by unified/OmniSpecRenderer)
├── AsyncApiSpec.stories.tsx
├── components/               AsyncAPI-specific UI (channels, operations, messages, bindings)
├── hooks/                    AsyncAPI-specific React hooks
├── parser/                   Parser + 2.x ↔ 3.x normalization
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

---

## Protocol Bindings

AsyncAPI supports per-protocol bindings on servers, channels, operations, and messages. Currently rendered protocols:

- MQTT (QoS, retain, last-will, clean session)
- Kafka (topic, partitions, replication factor, consumer group)
- WebSocket (method, query, headers, subprotocol)
- AMQP / AMQP 1.0 (exchange, queue, routing key, durable, exclusive)
- STOMP (destination, ack mode)
- HTTP

To add a new protocol binding:

1. Add the binding type to `asyncapi/types/`
2. Add a binding renderer component under `asyncapi/components/bindings/`
3. Wire it into the channel / operation detail views
4. Fall back gracefully for unrecognized protocols — render raw values or a clearly-labeled "unknown protocol" notice
5. Document under `packages/omnispec/docs/client_docs/` if user-facing

---

## Message Payloads

Multiple payload schema formats are valid in AsyncAPI:

- **JSON Schema** — rendered identically to OpenAPI via `@core/components/SchemaViewer/SchemaTree`
- **Avro** — parsed and rendered (verify fixture coverage)
- **Protobuf** — rendered as the field set (note: this is for AsyncAPI messages, separate from the gRPC renderer in Pro)

`contentType` displays on each message. Headers schema renders separately from payload. `examples` (single or named map) renders inline.

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

- Unit tests with vitest, co-located as `*.test.tsx`
- Storybook stories
- Test fixtures: `src/__fixtures__/` includes AsyncAPI 2.x and 3.x specs across multiple protocols
- QA test scope: APARC-1819 + sub-tasks (AsyncAPI-specific)
