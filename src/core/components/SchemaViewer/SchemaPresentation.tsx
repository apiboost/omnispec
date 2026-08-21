/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * Variant-driven presentation kit for the schema/property tree.
 *
 * This is the single source of truth for HOW EACH SCHEMA ITEM RENDERS in each
 * of the four presentations (`lines` / `table` / `card` / `tokens`). Every part
 * of a property row — the row shell, name, type, required marker, description,
 * enum chips, and nested-children wrapper — is its own `@emotion/styled`
 * component that switches appearance on a single `variant: SchemaStyle` prop.
 * Swapping a design is therefore a matter of editing one variant map here, not
 * hunting through the renderer.
 *
 * The CSS is transcribed from the approved design mock (the four `.dir-a/b/c/d`
 * directions), mapping the mock's raw hex palette onto OmniSpec theme tokens
 * (`var(--omnispec-*)`) so it themes and white-labels for free.
 *
 * Layout per direction:
 * - `lines`  — inline name/type/required, hairline rows, chips for enums, a thin
 *              left-guide for nested children.
 * - `table`  — a CSS grid: name (+ required) in column one; type / description /
 *              enum / children in column two (children keep to column two, so
 *              each nested row indents under the type — like the mock).
 * - `card`   — enclosed card with row hover and a soft type badge; nested
 *              objects get an accent rail.
 * - `tokens` — dense, syntax-colored type/format, `*` for required, bordered
 *              enum chips, dashed nesting guide.
 *
 * NOTE (migration): the OpenAPI/AsyncAPI `SchemaTree` composes this kit. The Pro
 * renderers (GraphQL/gRPC/SOAP) still use the older `PresentationContainer` /
 * `PresentationRow` / `PresentationChildren` shells below and will migrate onto
 * this slot kit in a follow-up.
 */

import type { ComponentPropsWithoutRef } from 'react'
import { styled } from '@core/styles/styled'
import type { CSSObject } from '@core/styles/styled'
import { mq } from '@core/styles/breakpoints'
import type { SchemaStyle } from '@core/components/SchemaViewer/schema-style'

/** `variant` is a style-only prop; keep it off the DOM. */
const forwardExceptVariant = (prop: string) => prop !== 'variant'

// Palette bridges (mock var → OmniSpec token).
const hairline = '1px solid var(--omnispec-border-color)'
const accentRail = '2px solid color-mix(in srgb, var(--omnispec-color-primary) 30%, transparent)'
const accentWash = 'color-mix(in srgb, var(--omnispec-color-primary) 4%, transparent)'

// The table grid: name column + fluid content column. Named areas keep the
// required label under the name and everything else (type/desc/enum/default/
// children) in the content column, mirroring the mock's dir-b layout.
const TABLE_GRID: CSSObject = {
  display: 'grid',
  columnGap: '1.5rem',
  alignItems: 'start',
  gridTemplateColumns: 'minmax(7rem, 13.25rem) 1fr',
  gridTemplateAreas: '"name type" "req desc" "req enum" "gut dflt" "gut kids"',
}

// The `chain` grid: a fixed name column (name + required stacked) and a fluid
// content column (type / description / enum / default). Nested children span
// both columns. Mirrors the reference layout's two-column connector-line row.
const CHAIN_GRID: CSSObject = {
  display: 'grid',
  columnGap: '1rem',
  alignItems: 'start',
  gridTemplateColumns: 'minmax(8rem, 10rem) 1fr',
  gridTemplateAreas: '"name type" "req desc" "req enum" "req dflt" "kids kids"',
}

// The chain rail + its horizontal per-row connector, transcribed from the
// the reference layout's rail + per-row tick. The connector is a `::before`
// pseudo-element (absolute, so it never takes a grid cell).
const CHAIN_RAIL = '2px solid var(--omnispec-border-color)'

// ===========================================================================
// OUTER CONTAINER — `.schema`
// ===========================================================================

const containerVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: {},
  table: {},
  tokens: {},
  // `card` encloses the whole tree in a bordered, rounded, clipped surface.
  card: {
    border: hairline,
    borderRadius: '0.6875rem',
    backgroundColor: 'var(--omnispec-bg-primary)',
    overflow: 'hidden',
  },
  // `chain` draws the depth-0 vertical rail, capped top and bottom so it reads
  // as a bracket enclosing the properties; nested rails come from the children
  // wrapper below.
  chain: {
    position: 'relative',
    borderLeft: CHAIN_RAIL,
    marginLeft: '0.5rem',
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      width: '1rem',
      height: 0,
      borderTop: CHAIN_RAIL,
    },
    '&::before': { top: 0 },
    '&::after': { bottom: 0 },
  },
}

const PresentationContainerRoot = styled('div', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  ...containerVariantStyle[variant],
}))

/**
 * The outer wrapper for a schema tree (one per depth-0 render). Emits a stable
 * `data-schema-style` attribute so consumers can hook it in CSS and so the
 * active presentation is observable in tests regardless of style deltas.
 */
export function PresentationContainer({
  variant,
  ...rest
}: { variant: SchemaStyle } & ComponentPropsWithoutRef<'div'>) {
  return <PresentationContainerRoot variant={variant} data-schema-style={variant} {...rest} />
}

// ===========================================================================
// SLOT KIT — how each schema item renders, per variant
// ===========================================================================

// --- Row (`.prop`) ---------------------------------------------------------

const propRowVariantStyle: Record<SchemaStyle, CSSObject> = {
  // Airy hairline rows.
  lines: {
    padding: '0.72rem 0',
    borderBottom: hairline,
    '&:last-child': { borderBottom: 'none' },
  },
  // Two-column grid on desktop; stacked inline/block flow on mobile.
  table: {
    padding: '0.85rem 0',
    borderBottom: hairline,
    '&:last-child': { borderBottom: 'none' },
    [mq.desktop]: TABLE_GRID,
  },
  // Enclosed rows with inner padding + hover (the container draws the border).
  card: {
    padding: '0.72rem 0.95rem',
    borderBottom: hairline,
    transition: 'background-color 0.12s ease',
    '&:last-child': { borderBottom: 'none' },
    '&:hover': { backgroundColor: 'var(--omnispec-bg-secondary)' },
  },
  // Dense rows for power users.
  tokens: {
    padding: '0.36rem 0',
  },
  // Chain rows: no hairline; spacing via padding, a left inset for the rail,
  // and a `::before` connector reaching from the rail to the name.
  chain: {
    paddingLeft: '1.25rem',
    paddingBottom: '0.75rem',
    '&:last-child': { paddingBottom: 0 },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '0.5rem',
      width: '1rem',
      height: 0,
      borderTop: CHAIN_RAIL,
    },
    [mq.desktop]: CHAIN_GRID,
  },
}

/** A single property row shell — composes the slots below. */
export const SchemaPropRow = styled('div', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  position: 'relative',
  minWidth: 0,
  ...propRowVariantStyle[variant],
}))

// --- Name (`.prop-name`) ---------------------------------------------------

const propNameVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: {},
  table: { [mq.desktop]: { gridArea: 'name' } },
  card: {},
  tokens: { fontSize: '0.84rem' },
  chain: { [mq.desktop]: { gridArea: 'name' } },
}

/** Property / field identifier — mono, semibold. Holds the chevron + required `*`. */
export const PropName = styled('span', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  minWidth: 0,
  // Long identifiers (e.g. WSDL/XSD type names) must break within their column
  // instead of overflowing into the type column — otherwise the two overlap in
  // the `table` grid.
  overflowWrap: 'anywhere',
  fontFamily: 'var(--omnispec-font-mono)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
  fontSize: '0.875rem',
  ...propNameVariantStyle[variant],
}))

/** The `*` required marker used by the `tokens` variant (dir-d). */
export const PropRequiredStar = styled.span({
  color: 'var(--omnispec-color-error)',
  fontWeight: 700,
  marginLeft: '1px',
})

// --- Type (`.prop-type`) ---------------------------------------------------

const propTypeVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: { marginLeft: '0.5rem' },
  table: { [mq.desktop]: { gridArea: 'type', alignSelf: 'center', marginLeft: 0 } },
  // `card` renders the type as a soft chip badge.
  card: {
    marginLeft: '0.5rem',
    backgroundColor: 'var(--omnispec-bg-code)',
    color: 'var(--omnispec-fg-code)',
    borderRadius: '0.3125rem',
    padding: '0.185rem 0.4rem',
    fontSize: '0.75rem',
  },
  tokens: { marginLeft: '0.5rem', color: 'var(--omnispec-color-primary)' },
  // Chain renders the type in the content column, syntax-colored like the
  // reference layout's type token.
  chain: {
    color: 'var(--omnispec-color-primary)',
    [mq.desktop]: { gridArea: 'type', alignSelf: 'start', marginLeft: 0 },
  },
}

/** Type signature — mono, muted (syntax-colored in `tokens`). */
export const PropType = styled('span', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.4rem',
  minWidth: 0,
  overflowWrap: 'anywhere',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-muted)',
  fontSize: '0.8rem',
  ...propTypeVariantStyle[variant],
}))

/** The `· format` suffix inside a type — a distinct hue in `tokens` (dir-d .fmt). */
export const PropFormat = styled('span', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  color: variant === 'tokens' ? 'var(--omnispec-color-info)' : 'inherit',
}))

// --- Required label (`.prop-req`) ------------------------------------------

const propReqVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: { marginLeft: '0.5rem' },
  table: { [mq.desktop]: { gridArea: 'req', marginTop: '0.2rem', marginLeft: 0 } },
  card: { marginLeft: '0.5rem' },
  tokens: {},
  chain: { [mq.desktop]: { gridArea: 'req', marginTop: '0.2rem', marginLeft: 0 } },
}

/** The "required" label (dir-a/b/c). `tokens` uses `PropRequiredStar` instead. */
export const PropReq = styled('span', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  color: 'var(--omnispec-color-error)',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  ...propReqVariantStyle[variant],
}))

// --- Description (`.prop-desc`) --------------------------------------------

const propDescVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: {},
  table: { [mq.desktop]: { gridArea: 'desc', marginTop: 0 } },
  card: {},
  tokens: { fontSize: '0.82rem', marginTop: '0.12rem' },
  chain: { [mq.desktop]: { gridArea: 'desc', marginTop: 0 } },
}

/** Description block — sans. Wraps the markdown renderer; resets its `<p>` margins. */
export const PropDesc = styled('div', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  margin: '0.28rem 0 0',
  color: 'var(--omnispec-fg-secondary)',
  fontSize: '0.85rem',
  fontFamily: 'var(--omnispec-font-sans)',
  lineHeight: 1.5,
  '& p': { margin: 0 },
  '& p + p': { marginTop: '0.25rem' },
  ...propDescVariantStyle[variant],
}))

/** A small inline default/example value token. */
const propDetailVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: {},
  table: { [mq.desktop]: { gridArea: 'dflt' } },
  card: {},
  tokens: {},
  chain: { [mq.desktop]: { gridArea: 'dflt' } },
}

/** The "Default: …" row. */
export const PropDefault = styled('div', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  color: 'var(--omnispec-fg-muted)',
  fontSize: '0.76rem',
  fontFamily: 'var(--omnispec-font-mono)',
  marginTop: '0.28rem',
  ...propDetailVariantStyle[variant],
}))

// --- Enum (`.prop-enum` + `.lbl` + `li`) -----------------------------------

const propEnumVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: {},
  table: { [mq.desktop]: { gridArea: 'enum' } },
  card: {},
  tokens: { gap: '0.3rem' },
  chain: { [mq.desktop]: { gridArea: 'enum' } },
}

/** The enum chip list. */
export const EnumList = styled('ul', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  listStyle: 'none',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.35rem',
  margin: '0.45rem 0 0',
  padding: 0,
  ...propEnumVariantStyle[variant],
}))

/** The muted "enum" label before the chips — hidden in `tokens`. */
export const EnumLabel = styled('span', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  color: 'var(--omnispec-fg-muted)',
  fontFamily: 'var(--omnispec-font-sans)',
  fontSize: '0.76rem',
  alignSelf: 'center',
  marginRight: '0.1rem',
  ...(variant === 'tokens' || variant === 'chain' ? { display: 'none' } : {}),
}))

const enumItemVariantStyle: Record<SchemaStyle, CSSObject> = {
  // Soft filled chip.
  lines: {
    backgroundColor: 'var(--omnispec-bg-tertiary)',
    borderRadius: '0.3125rem',
    padding: '0.08rem 0.42rem',
  },
  // Bordered chip on the surface.
  table: {
    backgroundColor: 'var(--omnispec-bg-primary)',
    border: hairline,
    borderRadius: '0.3125rem',
    padding: '0.08rem 0.42rem',
  },
  card: {
    backgroundColor: 'var(--omnispec-bg-primary)',
    border: hairline,
    borderRadius: '0.3125rem',
    padding: '0.08rem 0.42rem',
  },
  // Bordered, syntax-green.
  tokens: {
    color: 'var(--omnispec-color-success)',
    border: hairline,
    borderRadius: '0.25rem',
    padding: '0.02rem 0.34rem',
  },
  // Chain uses info-colored pills on a faint info wash (the reference-layout look).
  chain: {
    color: 'var(--omnispec-color-info)',
    backgroundColor: 'color-mix(in srgb, var(--omnispec-color-info) 10%, transparent)',
    borderRadius: '0.25rem',
    padding: '0.0625rem 0.375rem',
  },
}

/** A single enum value chip. */
export const EnumItem = styled('li', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: '0.76rem',
  color: 'var(--omnispec-fg-secondary)',
  ...enumItemVariantStyle[variant],
}))

// --- Children (`.prop-children`) -------------------------------------------

const propChildrenVariantStyle: Record<SchemaStyle, CSSObject> = {
  // Thin left guide.
  lines: {
    margin: '0.55rem 0 0 0.15rem',
    paddingLeft: '1rem',
    borderLeft: hairline,
  },
  // Nested rows span BOTH grid columns and indent from the left. Keeping them in
  // column 2 (grid-area kids) re-grids each level inside the previous narrow
  // column, so deep recursion collapses the type text to one char per line and
  // overflows the card. Spanning full width gives every level room to re-grid.
  table: {
    marginTop: '0.5rem',
    paddingLeft: '0.75rem',
    [mq.desktop]: { gridColumn: '1 / -1', marginTop: '0.5rem', paddingLeft: '1.25rem' },
  },
  // Soft accent rail + faint wash for nested objects.
  card: {
    borderLeft: accentRail,
    backgroundColor: accentWash,
    borderRadius: '0 0.5rem 0.5rem 0',
    margin: '0.55rem 0 0.1rem',
    paddingLeft: '0.5rem',
  },
  // Dashed, tight guide.
  tokens: {
    borderLeft: '1px dashed var(--omnispec-border-color)',
    margin: '0.28rem 0 0 0.1rem',
    paddingLeft: '0.85rem',
  },
  // Chain: nested children carry their own capped rail; each nested row draws
  // its own `::before` connector into it.
  chain: {
    position: 'relative',
    borderLeft: CHAIN_RAIL,
    marginLeft: '0.5rem',
    marginTop: '0.5rem',
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      width: '1rem',
      height: 0,
      borderTop: CHAIN_RAIL,
    },
    '&::before': { top: 0 },
    '&::after': { bottom: 0 },
  },
}

/** Wrapper for a node's expanded child attributes. */
export const SchemaPropChildren = styled('div', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  minWidth: 0,
  ...propChildrenVariantStyle[variant],
}))

// ===========================================================================
// LEGACY SHARED SHELLS (Pro GraphQL/gRPC/SOAP — migrating onto the slot kit)
// ===========================================================================

const rowVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: {
    padding: '0.25rem 0',
    borderBottom: hairline,
    '&:last-child': { borderBottom: 'none' },
  },
  table: {
    padding: '0.5rem 0',
    borderBottom: hairline,
    '&:last-child': { borderBottom: 'none' },
    [mq.desktop]: {
      display: 'grid',
      columnGap: '1.5rem',
      alignItems: 'start',
      gridTemplateColumns: 'minmax(7.5rem, 11.875rem) 1fr',
    },
  },
  card: {
    padding: '0.25rem 0.75rem',
    borderBottom: hairline,
    transition: 'background-color 0.12s ease',
    '&:last-child': { borderBottom: 'none' },
    '&:hover': { backgroundColor: 'var(--omnispec-bg-secondary)' },
  },
  tokens: {
    padding: '0.125rem 0',
    borderBottom: 'none',
  },
  chain: {
    padding: '0.25rem 0 0.75rem',
    borderBottom: 'none',
  },
}

/** @deprecated Legacy row shell used by the Pro renderers; use {@link SchemaPropRow}. */
export const PresentationRow = styled('div', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  minWidth: 0,
  ...rowVariantStyle[variant],
}))

const childrenVariantStyle: Record<SchemaStyle, CSSObject> = {
  lines: {
    borderLeft: hairline,
    paddingLeft: '0.75rem',
    marginLeft: '0.5rem',
  },
  table: {
    marginTop: '0.5rem',
    paddingLeft: '0.75rem',
    [mq.desktop]: { gridColumn: '1 / -1', paddingLeft: '1.25rem' },
  },
  card: {
    borderLeft: accentRail,
    backgroundColor: accentWash,
    borderRadius: '0 var(--omnispec-border-radius) var(--omnispec-border-radius) 0',
    marginTop: '0.25rem',
    paddingLeft: '0.5rem',
  },
  tokens: {
    borderLeft: '1px dashed var(--omnispec-border-color)',
    paddingLeft: '0.75rem',
    marginLeft: '0.25rem',
  },
  chain: {
    borderLeft: CHAIN_RAIL,
    marginLeft: '0.5rem',
    paddingLeft: '0.75rem',
    marginTop: '0.25rem',
  },
}

/** @deprecated Legacy nesting shell used by the Pro renderers; use {@link SchemaPropChildren}. */
export const PresentationChildren = styled('div', {
  shouldForwardProp: forwardExceptVariant,
})<{ variant: SchemaStyle }>(({ variant }) => ({
  ...childrenVariantStyle[variant],
}))
