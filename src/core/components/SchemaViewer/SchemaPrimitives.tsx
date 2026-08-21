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
 * Schema-family presentational primitives.
 *
 * These are the shared LEAF atoms used by every schema/type renderer in the
 * package — the JSON Schema `SchemaTree` (OpenAPI + AsyncAPI) and the
 * spec-specific trees `TypeDetail` (GraphQL), `MessageDetail` (gRPC), and the
 * SOAP/WSDL type views. Each spec keeps its own STRUCTURE (rows vs. tables,
 * expand/collapse, composition, args, oneof, field numbers) but renders its
 * leaves through these atoms.
 *
 * SINGLE SOURCE OF TRUTH: a stylistic change to a field name, type reference,
 * badge, description, or section heading belongs HERE. Changing it here
 * propagates to every spec renderer at once. Do NOT re-implement these styles
 * locally in a spec renderer — see the "Schema-family map" in
 * `src/core/components/SchemaViewer/CLAUDE.md`.
 *
 * These leaves are authored as `@emotion/styled` primitives (via
 * `@core/styles/styled`). The exported component APIs are stable — Pro
 * renderers import them and depend on the prop shapes below.
 */

import type { ReactNode } from 'react'
import { styled } from '@core/styles/styled'

/** The identifier of a property / field / enum value / message field. */
export function FieldName({
  name,
  required = false,
  deprecated = false,
  className,
}: {
  name: ReactNode
  required?: boolean
  deprecated?: boolean
  className?: string
}) {
  return (
    <FieldNameText deprecated={deprecated} className={className}>
      {name}
      {required && <RequiredMark>*</RequiredMark>}
    </FieldNameText>
  )
}

/** A clickable cross-reference to another type / message / schema. */
export function SchemaRefLink({
  onClick,
  children,
  className,
}: {
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <RefLinkButton type="button" onClick={onClick} className={className}>
      {children}
    </RefLinkButton>
  )
}

/** A description / documentation paragraph for a field or type. */
export function FieldDescription({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <DescriptionParagraph className={className}>{children}</DescriptionParagraph>
}

/** A sub-section heading inside a schema/type body (e.g. "Fields", "Values"). */
export function SchemaSectionTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <SectionTitleHeading className={className}>{children}</SectionTitleHeading>
}

export type SchemaBadgeVariant =
  | 'required'
  | 'deprecated'
  | 'readonly'
  | 'writeonly'
  | 'constraint'
  | 'enum'
  | 'muted'
  | 'default'

/**
 * A subtle inline badge for schema metadata (required, deprecated, read-only,
 * constraints, enum values, etc.). Rendered as colored text rather than a
 * filled pill — the filled/uppercase `common/Badge` is a different family used
 * for HTTP-method and nav badges.
 */
export function SchemaBadge({
  variant = 'default',
  children,
  className,
}: {
  variant?: SchemaBadgeVariant
  children: ReactNode
  className?: string
}) {
  return (
    <BadgeSpan variant={variant} className={className}>
      {children}
    </BadgeSpan>
  )
}

// --- Styled primitives (the single source of truth for schema-family leaf styling) ---

/** `variant`/`deprecated` are style-only props; keep them off the DOM. */
const forwardExcept = (blocked: string) => (prop: string) => prop !== blocked

/** Variant → color map for `SchemaBadge` (colored text, not a filled pill). */
const badgeVariantStyle: Record<SchemaBadgeVariant, Record<string, string>> = {
  required: { color: 'var(--omnispec-color-error)' },
  deprecated: { color: 'var(--omnispec-color-warning)', textDecoration: 'line-through' },
  readonly: { color: 'var(--omnispec-fg-muted)', fontStyle: 'italic' },
  writeonly: { color: 'var(--omnispec-fg-muted)', fontStyle: 'italic' },
  constraint: { color: 'var(--omnispec-fg-muted)' },
  enum: { color: 'var(--omnispec-color-info)' },
  muted: { color: 'var(--omnispec-fg-muted)' },
  default: { color: 'var(--omnispec-fg-muted)' },
}

// Authored as a `<span>`, NOT `<code>`, on purpose: the renderer embeds inside
// host layouts (e.g. the portal's DocLayout) whose global prose `code`/`pre`
// rules would otherwise bleed a dark "code chip" background onto field names —
// an Emotion class reset can't reliably beat a host `!important`/high-specificity
// rule, but a bare `<span>` is never targeted by prose `code {}` selectors.
const FieldNameText = styled('span', {
  shouldForwardProp: forwardExcept('deprecated'),
})<{ deprecated?: boolean }>(({ deprecated }) => ({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'transparent',
  padding: 0,
  ...(deprecated
    ? {
      textDecoration: 'line-through',
      opacity: 0.6,
    }
    : {}),
}))

const RequiredMark = styled.span({
  color: 'var(--omnispec-color-error)',
  marginLeft: '1px',
})

const RefLinkButton = styled.button({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--omnispec-color-primary)',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'inherit',
  padding: 0,
  textDecoration: 'underline',
  textDecorationStyle: 'dotted',
  '&:hover': {
    textDecorationStyle: 'solid',
    opacity: 0.8,
  },
})

const DescriptionParagraph = styled.p({
  margin: 0,
  color: 'var(--omnispec-fg-secondary)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-sans)',
  lineHeight: 1.4,
})

const SectionTitleHeading = styled.h5({
  margin: '0 0 12px',
  fontSize: 'var(--omnispec-font-size-md)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  letterSpacing: '0.02em',
})

const BadgeSpan = styled('span', {
  shouldForwardProp: forwardExcept('variant'),
})<{ variant: SchemaBadgeVariant }>(({ variant }) => ({
  fontSize: 'var(--omnispec-font-size-xs)',
  ...badgeVariantStyle[variant],
}))
