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
 * Presentation style for the schema/property tree.
 *
 * - `lines`  — airy typographic rows with hairline dividers and a chevron +
 *   left-guide nesting (the default, available to every tier).
 * - `table`  — two-column layout: name (+ required) on the left, type /
 *   description / enum / nested children on the right (Pro).
 * - `card`   — the schema is wrapped in an enclosed card with row hover and a
 *   soft accent rail on nested children (Pro).
 * - `tokens` — dense, monospace, syntax-colored rows; required rendered as a
 *   `*` after the name (available to every tier).
 * - `chain`  — a vertical rail with horizontal connectors and a two-column
 *   name/type row; the presentation used by the reference layout (available to
 *   every tier).
 */
export type SchemaStyle = 'lines' | 'table' | 'card' | 'tokens' | 'chain'

/** The resolved default when no style is requested (or a requested one is denied). */
export const DEFAULT_SCHEMA_STYLE: SchemaStyle = 'lines'

/**
 * Styles the Free tier may render without the `advancedSchemaStyles` Pro
 * capability. `table` and `card` are Pro-only and gracefully fall back to the
 * default in Free.
 */
export const FREE_SCHEMA_STYLES: ReadonlySet<SchemaStyle> = new Set<SchemaStyle>(['lines', 'tokens', 'chain'])

/** Every valid style, used to reject unknown values at runtime. */
const ALL_SCHEMA_STYLES: ReadonlySet<string> = new Set<SchemaStyle>(['lines', 'table', 'card', 'tokens', 'chain'])

/**
 * Resolves the effective schema style once, applying tier gating.
 *
 * The resolution is silent and graceful: a Pro-only style requested without the
 * capability (or any unknown value) resolves to {@link DEFAULT_SCHEMA_STYLE}
 * rather than throwing. Consumers read the already-gated value.
 *
 * @param requested       The style asked for via the public `schemaStyle` prop.
 * @param advancedAllowed Whether the `advancedSchemaStyles` Pro capability is present.
 */
export function resolveSchemaStyle(
  requested: SchemaStyle | undefined,
  advancedAllowed: boolean,
): SchemaStyle {
  if (!requested || !ALL_SCHEMA_STYLES.has(requested)) return DEFAULT_SCHEMA_STYLE
  if (advancedAllowed) return requested
  return FREE_SCHEMA_STYLES.has(requested) ? requested : DEFAULT_SCHEMA_STYLE
}
