# CLAUDE.md — `core/components/SchemaViewer/`

The schema/type rendering family. This directory owns both the JSON-Schema tree
and the **shared leaf primitives** that every spec's type renderer composes
from. Read this before restyling anything that looks like a field, type
reference, badge, description, or schema section heading — in ANY renderer.

---

## Why a shared primitive kit exists

Each spec type has a fundamentally different type system, so they do **not**
share one tree component:

| Spec | Renderer | Data model | Reuses `SchemaTree`? |
|------|----------|-----------|----------------------|
| OpenAPI 2/3 | `SchemaTree` (this dir) | JSON Schema | **Yes — native** |
| AsyncAPI 2/3 | `SchemaTree` (this dir) | JSON Schema payloads | **Yes — native** |
| GraphQL | `omnispec-pro` `TypeDetail` | types + fields-with-args, `!`/`[]` ref modifiers, unions, interfaces | No — own tree |
| gRPC / Protobuf | `omnispec-pro` `MessageDetail` | messages + field numbers, `oneof`, `map`, streaming | No — own tree |
| SOAP / WSDL | `omnispec-pro` `WsdlTypesBrowser` + `OperationCard` | XSD elements/types, `minOccurs`/`maxOccurs`, restrictions | No — own tree |

Forcing GraphQL/gRPC/SOAP through the JSON-Schema `SchemaNode` shape would drop
information (field args, field numbers, oneofs, XSD groups). So they keep
spec-specific **structure** (rows vs. tables, expand/collapse, composition,
args, oneof, field numbers) but render their **leaves** through the shared
primitives in `SchemaPrimitives.tsx`.

> Decision (2026-07): only the JSON-Schema specs share `SchemaTree`. SOAP is
> deliberately kept as its own tree even though XSD maps *mostly* cleanly — to
> preserve room for XSD-specific fidelity (attributes, choice/sequence,
> namespaces) without contorting `SchemaNode`.

---

## The kit — `SchemaPrimitives.tsx`

The single source of truth for schema-family **leaf** styling. All token-driven.

| Primitive | Role |
|-----------|------|
| `FieldName` | identifier of a property / field / enum value / message field (mono, semibold, `fg-primary`; optional `required` marker + `deprecated` strike) |
| `SchemaRefLink` | clickable cross-reference to another type/message/schema (primary, dotted→solid underline) |
| `FieldDescription` | a field/type description paragraph (`fg-secondary`, sans, `xs`) |
| `SchemaSectionTitle` | a sub-section heading inside a body — "Fields", "Values", "Nested Messages", "oneof" (`md`, 700, `0.02em`) |
| `SchemaBadge` | subtle inline metadata badge — `required`/`deprecated`/`readonly`/`writeonly`/`constraint`/`enum`/`muted` (colored text, not a filled pill) |

`SchemaBadge` is intentionally a *text* badge. The filled/uppercase
`common/Badge` is a different family, for HTTP-method and nav badges — don't
conflate them.

---

## The slot kit — `SchemaPresentation.tsx`

`SchemaPresentation.tsx` is the **per-item, per-variant** styling kit for the
JSON-Schema tree (OpenAPI + AsyncAPI `SchemaTree`). Every part of a property row
is its own `@emotion/styled` component that switches appearance on a single
`variant: SchemaStyle` prop (`lines` / `table` / `card` / `tokens`):

| Slot | Element | Role |
|------|---------|------|
| `SchemaPropRow` | `.prop` | row shell (hairline / table-grid / card / dense) |
| `PropName` | `.prop-name` | name + chevron + tokens `*` |
| `PropType` / `PropFormat` | `.prop-type` / `.fmt` | type signature + `· format` |
| `PropReq` / `PropRequiredStar` | `.prop-req` | required label (or `*` in `tokens`) |
| `PropDesc` | `.prop-desc` | description (wraps the markdown renderer) |
| `EnumList` / `EnumLabel` / `EnumItem` | `.prop-enum` | `enum` label + value chips |
| `SchemaPropChildren` | `.prop-children` | nesting shell |

The CSS is transcribed from the approved design mock (the four `.dir-a/b/c/d`
directions), mapping its palette onto `var(--omnispec-*)` tokens. **To change how
an item looks in one or more styles, edit that item's variant map here — do not
re-style it in `SchemaTree`.** `SchemaTree` only composes these slots + the
row-local chrome (chevron, composition branches, enum-description table).

Two behaviors worth knowing (in `schema-utils.ts`, not styling): arrays of
primitives compose inline as `array<string · uri>` (no separate `items` row) and
lift the item's `enum` onto the array node; arrays of objects become
`array<object>` with the object's properties nested directly.

> Migration: `PresentationRow` / `PresentationChildren` are the **legacy** shells
> the Pro renderers (GraphQL/gRPC/SOAP) still use; they will move onto this slot
> kit next. `SchemaPrimitives` leaves remain the shared kit for Pro until then.

---

## THE RULE — distributing stylistic changes

**A styling change to any schema-family leaf goes in `SchemaPrimitives.tsx`,
never in an individual renderer.** Changing the kit propagates to `SchemaTree`,
`TypeDetail`, `MessageDetail`, `WsdlTypesBrowser`, and `OperationCard` at once.

When you touch schema/type rendering:

1. **Leaf styling** (field name, type ref, badge, description, section title) →
   edit the kit primitive. Do **not** re-add a local `fieldNameStyle` /
   `typeLinkStyle` / `deprecatedBadgeStyle` / `sectionTitleStyle` to a renderer.
2. **A new leaf treatment** that ≥2 renderers need → add a primitive here first,
   then compose it everywhere. Grep the sibling renderers (below) and update all.
3. **Spec-specific structure** (tables, composition branches, oneof blocks, args,
   field numbers, XSD occurs) stays in the individual renderer — that is not a
   leaf and does not belong in the kit.
4. Kit defaults are pinned to the **OpenAPI `SchemaTree`** look (the approved
   reference). Changing a kit default changes OpenAPI too — do it deliberately.

### Schema-family renderers to keep in sync (grep targets)

- `core/components/SchemaViewer/SchemaTree.tsx` (OpenAPI + AsyncAPI)
- `omnispec-pro/src/renderers/graphql/components/TypeDetail.tsx`
- `omnispec-pro/src/renderers/grpc/components/MessageDetail.tsx`
- `omnispec-pro/src/renderers/soap/components/WsdlTypesBrowser.tsx`
- `omnispec-pro/src/renderers/soap/components/OperationCard.tsx`

Pro renderers import the kit from `@apiboost/omnispec/core` (re-exported via
`core/public.ts`). After adding a primitive, rebuild Free so the built
`dist/types` expose it before Pro can typecheck against it.

---

## Adding a new schema/type renderer

1. Decide: does the spec's type model map cleanly to `SchemaNode` (JSON Schema)?
   - **Yes** → reuse `SchemaTree` (optionally via an adapter to `SchemaNode`).
   - **No** → build a spec-specific tree, but render every leaf through the kit
     primitives. Do not hand-roll field-name / type-ref / badge / description /
     section-title styles.
2. Compose leaves from `SchemaPrimitives`; keep only spec-specific structure local.
3. Add the renderer to the "renderers to keep in sync" list above.
