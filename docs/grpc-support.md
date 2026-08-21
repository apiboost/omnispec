# gRPC / Protocol Buffers Support

Status: **Planned — v2.0**

## Overview

gRPC is a high-performance RPC framework using Protocol Buffers (protobuf) for service definition and binary serialization. APIs are defined in `.proto` files which declare services, methods (RPCs), and message types.

Azure APIM supports gRPC API import from `.proto` files. This document scopes the work to add gRPC documentation rendering to our library.

## Proto File Structure

A `.proto` file contains:

```protobuf
syntax = "proto3";

package example.greeter;

// Service definition — maps to a nav section
service GreeterService {
  // Unary RPC
  rpc SayHello (HelloRequest) returns (HelloReply);
  // Server streaming
  rpc SayHelloStream (HelloRequest) returns (stream HelloReply);
  // Client streaming
  rpc RecordGreetings (stream HelloRequest) returns (GreetingSummary);
  // Bidirectional streaming
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);
}

// Message types — structured data with typed fields
message HelloRequest {
  string name = 1;
  int32 age = 2;
  repeated string tags = 3;           // list
  map<string, string> metadata = 4;   // key-value pairs
  optional string nickname = 5;       // optional field
  Address address = 6;                // nested message
  oneof contact {                     // at most one set
    string email = 7;
    string phone = 8;
  }
}

message HelloReply {
  string message = 1;
  Timestamp created_at = 2;
}

message Address {
  string street = 1;
  string city = 2;
  string country = 3;
}

// Enum types
enum Status {
  STATUS_UNSPECIFIED = 0;   // first value must be 0
  STATUS_ACTIVE = 1;
  STATUS_INACTIVE = 2;
}
```

### Proto3 Scalar Types

| Proto Type | Description | JSON Equivalent |
|-----------|-------------|----------------|
| `double` | 64-bit float | number |
| `float` | 32-bit float | number |
| `int32` | Variable-length signed int | number |
| `int64` | Variable-length signed int | string |
| `uint32` | Variable-length unsigned int | number |
| `uint64` | Variable-length unsigned int | string |
| `sint32` | Zigzag-encoded signed int | number |
| `sint64` | Zigzag-encoded signed int | string |
| `fixed32` | Always 4 bytes | number |
| `fixed64` | Always 8 bytes | string |
| `sfixed32` | Always 4 bytes, signed | number |
| `sfixed64` | Always 8 bytes, signed | string |
| `bool` | Boolean | boolean |
| `string` | UTF-8 string | string |
| `bytes` | Arbitrary bytes | base64 string |

### RPC Streaming Patterns

| Pattern | Syntax | Description |
|---------|--------|-------------|
| Unary | `rpc Foo(Req) returns (Res)` | Single request, single response |
| Server streaming | `rpc Foo(Req) returns (stream Res)` | Single request, stream of responses |
| Client streaming | `rpc Foo(stream Req) returns (Res)` | Stream of requests, single response |
| Bidirectional | `rpc Foo(stream Req) returns (stream Res)` | Both sides stream independently |

---

## How It Differs from Our Other Renderers

| Aspect | OpenAPI / AsyncAPI | gRPC |
|--------|-------------------|------|
| Spec format | JSON / YAML | `.proto` (custom syntax, not JSON/YAML/XML) |
| Parser needed | JSON/YAML parser | Protobuf parser (protobuf.js) |
| Operations | HTTP methods + paths | Services → RPCs |
| Data types | JSON Schema | Protobuf messages (scalar types, enums, nested messages, maps, oneofs) |
| Streaming | AsyncAPI covers pub/sub | 4 RPC patterns (unary, server/client/bidi streaming) |
| Try-It | HTTP fetch (direct or proxy) | Requires gRPC-Web proxy (Envoy) — browser can't call gRPC directly |
| Binary protocol | No (JSON/XML over HTTP) | Yes (protobuf over HTTP/2) |

---

## Frontend Implementation

### Parser: protobuf.js

Use `protobufjs` (most mature browser-compatible proto parser):

```bash
npm install protobufjs
```

```typescript
import * as protobuf from 'protobufjs'

// Parse .proto string in the browser
const root = protobuf.parse(protoFileContent).root

// Extract services
const services = root.nestedArray.filter(n => n instanceof protobuf.Service)

// Extract messages
const messages = root.nestedArray.filter(n => n instanceof protobuf.Type)

// Extract enums
const enums = root.nestedArray.filter(n => n instanceof protobuf.Enum)
```

`protobufjs` works entirely in the browser — no Node.js dependencies, no compilation step.

### Internal Types

```typescript
interface ParsedGrpcSpec {
  package: string
  syntax: string  // "proto3"
  services: GrpcService[]
  messages: GrpcMessage[]
  enums: GrpcEnum[]
}

interface GrpcService {
  name: string
  comment?: string
  methods: GrpcMethod[]
}

interface GrpcMethod {
  name: string
  comment?: string
  requestType: string
  responseType: string
  requestStreaming: boolean
  responseStreaming: boolean
  // Derived from streaming flags:
  pattern: 'unary' | 'server-streaming' | 'client-streaming' | 'bidirectional'
}

interface GrpcMessage {
  name: string
  comment?: string
  fields: GrpcField[]
  nestedMessages?: GrpcMessage[]
  nestedEnums?: GrpcEnum[]
  oneofs?: GrpcOneof[]
}

interface GrpcField {
  name: string
  type: string           // scalar type, message name, or enum name
  id: number             // field number
  comment?: string
  repeated: boolean
  optional: boolean
  map?: { keyType: string; valueType: string }
}

interface GrpcOneof {
  name: string
  fields: GrpcField[]
}

interface GrpcEnum {
  name: string
  comment?: string
  values: Array<{ name: string; number: number; comment?: string }>
}
```

### Components

| Component | Description | Reuses From |
|-----------|-------------|-------------|
| `GrpcOverview` | Package name, syntax version, service count, message count | — |
| `ServiceCard` | Service name, expandable RPC list | `Collapsible` |
| `RpcMethodCard` | Method name, streaming pattern badge, request/response types | `Badge` |
| `MessageDetail` | Message fields table (name, type, number, cardinality), nested types, oneofs | Similar to `SchemaTree` but for protobuf types |
| `EnumDetail` | Enum values table (name, number, description) | Similar to GraphQL enum display |
| `ProtoCodeBlock` | Syntax-highlighted proto source for a message/service | `CodeBlock` (need proto language support in Prism) |
| `GrpcSpec` | Entry component with sidebar nav, search | `DocLayout`, `NavTree`, `SearchBar`, `ThemeProvider` |

### Sidebar Navigation Structure

```
Services
  ├─ GreeterService
  │  ├─ SayHello          [UNARY]
  │  ├─ SayHelloStream    [SERVER]
  │  ├─ RecordGreetings   [CLIENT]
  │  └─ Chat              [BIDI]
Messages
  ├─ HelloRequest
  ├─ HelloReply
  ├─ Address
  └─ GreetingSummary
Enums
  └─ Status
```

### Streaming Pattern Badges

| Pattern | Badge | Color |
|---------|-------|-------|
| Unary | `UNARY` | `var(--omnispec-color-get)` (green) |
| Server streaming | `SERVER` | `var(--omnispec-color-post)` (blue) |
| Client streaming | `CLIENT` | `var(--omnispec-color-put)` (orange) |
| Bidirectional | `BIDI` | `var(--omnispec-color-patch)` (purple) |

### Spec Detection

Auto-detect `.proto` content by checking for `syntax = "proto3"` or `service` + `rpc` keywords.

Add `SpecType.GRPC` to the detection enum.

### Usage

```tsx
<GrpcSpec
  spec={protoFileContent}
  theme={{ base: 'light' }}
  slots={{ sidebarHeader: parentNav }}
/>

// Or via unified renderer
<OmniSpecRenderer spec={protoContent} />  // auto-detects proto syntax
```

---

## Try-It Considerations

### The Browser Problem

Browsers **cannot call gRPC services directly**. gRPC requires:
- HTTP/2 with frame-level control (browsers don't expose this)
- HTTP/2 trailers (not available in browser fetch API)
- Binary protobuf encoding (not JSON)

### Options for Try-It

| Approach | Complexity | UX |
|----------|-----------|-----|
| **No Try-It** (docs only) | None | Show proto definitions, example JSON, no execution |
| **gRPC-Web proxy** (Envoy) | High | Requires Envoy proxy in front of gRPC server |
| **Backend proxy** (our PHP backend) | Medium | Backend calls gRPC server, returns JSON response |
| **Connect protocol** | Medium | If server supports Connect, browser can call directly |

### Recommendation

**Start with docs-only (no Try-It).** gRPC Try-It requires infrastructure (Envoy proxy or Connect support) that most gRPC servers don't have configured for browser access. We can show:
- Request/response message schemas
- Example JSON payloads (gRPC supports JSON transcoding)
- Proto source code for copy-paste into tools like `grpcurl` or Buf Studio

Add Try-It later if demand justifies it, using a backend proxy approach (PHP backend calls gRPC server via a gRPC PHP extension like `grpc/grpc`).

---

## Backend Considerations

### Azure APIM gRPC Import

- Azure APIM accepts a single `.proto` file upload
- Parses services, methods, and message types
- All 4 streaming patterns supported in pass-through mode
- **Limitation**: No testing console for gRPC in APIM (unlike REST/OpenAPI)
- **Limitation**: Single .proto file only (no multi-file imports)

### Proto File Delivery

Like other spec types, the backend stores the `.proto` file and serves it via URL:

```
GET /api/specs/{id}/content  →  returns raw .proto file content
```

The frontend fetches and parses it client-side with `protobufjs`.

### Server Reflection (Future)

If a gRPC server has reflection enabled, the backend could query it to generate a proto definition dynamically (similar to GraphQL introspection). This would require a gRPC client in PHP (`grpc/grpc` extension). Defer to a future phase.

---

## Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| Proto parser integration (protobuf.js) | 1-2 days | Browser-compatible, well-documented API |
| GrpcSpec types | 0.5 days | TypeScript interfaces |
| GrpcOverview | 0.5 days | Package, syntax, service/message counts |
| ServiceCard + RpcMethodCard | 2 days | Service list, streaming badges |
| MessageDetail | 2-3 days | Fields table with nested types, oneofs, maps |
| EnumDetail | 0.5 days | Simple value list |
| GrpcSpec entry + nav | 1 day | Wire up DocLayout, NavTree |
| Spec detection | 0.5 days | Add proto pattern to detect-spec.ts |
| Proto syntax highlighting | 0.5 days | Add Prism proto grammar or use plain text |
| Stories + tests | 1-2 days | Fixture .proto + parser tests |
| **Total** | **~2 weeks** | Docs-only, no Try-It |

---

## Implementation Phases

### Phase 1: Parser + Types (~3 days)
1. Install `protobufjs`
2. Build `grpc-parser.ts` using protobuf.js API
3. Define TypeScript types
4. Parser tests with fixture `.proto` file

### Phase 2: Renderer Components (~5 days)
1. GrpcOverview, ServiceCard, RpcMethodCard
2. MessageDetail (fields, nested types, oneofs, maps)
3. EnumDetail
4. GrpcSpec entry with sidebar nav and search

### Phase 3: Integration (~2 days)
1. Add to `OmniSpecRenderer` auto-detection
2. Storybook stories
3. Webpack entry point + package exports

### Phase 4: Try-It (Deferred)
1. Backend gRPC proxy (requires `grpc/grpc` PHP extension)
2. Frontend Try-It panel with JSON input
3. Streaming support

---

## Open Questions

1. **Multi-file imports**: Proto files commonly use `import` to reference other files. Do we need to support this? Would require the backend to resolve imports and bundle into a single definition, or the frontend to fetch imports recursively.

2. **Well-known types**: Proto files often import Google well-known types (`google.protobuf.Timestamp`, `google.protobuf.Any`, etc.). `protobufjs` includes these by default, but we should verify.

3. **Comments as documentation**: Proto files use `//` comments above services/methods/messages as documentation. `protobufjs` preserves these — we should render them as descriptions.

4. **gRPC-JSON transcoding**: Many gRPC services support JSON transcoding via `google.api.http` annotations. Should we detect these and show HTTP equivalents alongside the RPC definitions?

---

## References

### Specification
- [Protocol Buffers Language Guide (proto3)](https://protobuf.dev/programming-guides/proto3/)
- [Proto3 Language Specification](https://protobuf.dev/reference/protobuf/proto3-spec/)
- [gRPC Core Concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)

### Browser Parsing
- [protobuf.js](https://github.com/protobufjs/protobuf.js) — browser-compatible proto parser
- [Protobuf-ES](https://buf.build/blog/protobuf-es-the-protocol-buffers-typescript-javascript-runtime-we-all-deserve) — TypeScript-first alternative
- [ts-proto](https://github.com/stephenh/ts-proto) — strongly-typed TypeScript generation

### Documentation Tools (Inspiration)
- [Buf Studio](https://buf.build/docs/bsr/studio/) — interactive gRPC testing UI
- [protoc-gen-doc](https://github.com/pseudomuto/protoc-gen-doc) — static doc generator
- [Sabledocs](https://github.com/markvincze/sabledocs) — gRPC doc generator

### Azure Integration
- [Import gRPC API to Azure APIM](https://learn.microsoft.com/en-us/azure/api-management/grpc-api)

### Try-It Architecture
- [gRPC-Web](https://grpc.io/docs/platforms/web/basics/) — browser gRPC via Envoy proxy
- [Connect Protocol](https://connectrpc.com/) — browser-friendly gRPC alternative
- [gRPC Server Reflection](https://grpc.io/docs/guides/reflection/)
