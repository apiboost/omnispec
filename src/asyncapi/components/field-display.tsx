/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { ReactNode } from 'react'
import { css } from '@core/styles/css'

/**
 * `"cleanSession"` / `"clean_session"` → `"Clean Session"`.
 *
 * Keys that start with `x-` (case-insensitive) are vendor/custom extensions, not
 * official binding fields, so their literal key is preserved (`x-subprotocol`
 * stays `x-subprotocol`, never "X subprotocol") to signal that distinction.
 */
export function humanizeField(field: string): string {
  if (/^x-/i.test(field)) return field
  const spaced = field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Heuristic: does this object look like a JSON Schema (as opposed to a plain
 * config object)? AsyncAPI binding fields like Kafka `key`/`groupId` and
 * WebSocket/HTTP `query`/`headers` are JSON Schemas and read best as a schema
 * table; plain config objects (Kafka `topicConfiguration`, AMQP
 * `queue`/`exchange`) read best as nested labelled rows.
 */
function isJsonSchema(value: Record<string, unknown>): boolean {
  return 'type' in value || 'properties' in value || 'enum' in value
}

/** Arrays whose every element is a scalar (string/number/boolean/null). */
function isScalarArray(value: unknown[]): boolean {
  return value.every(
    (item) => item === null || typeof item !== 'object',
  )
}

function renderValue(value: unknown): ReactNode {
  if (value === null) return <span className={mutedStyle}>null</span>
  if (typeof value === 'boolean') return <code className={codeStyle}>{value ? 'true' : 'false'}</code>
  if (typeof value === 'number') return <code className={codeStyle}>{String(value)}</code>
  if (typeof value === 'string') return <span>{value}</span>

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={mutedStyle}>none</span>
    // Arrays of scalars (e.g. AMQP cc/bcc) → comma-separated, not a raw literal.
    if (isScalarArray(value)) {
      return <span>{value.map((item) => String(item)).join(', ')}</span>
    }
    // Array of objects — fall through to a readable JSON block (rare in bindings).
    return <code className={jsonStyle}>{JSON.stringify(value, null, 2)}</code>
  }

  if (isPlainObject(value)) {
    // JSON Schemas render as a compact schema table.
    if (isJsonSchema(value)) {
      return <SchemaValue schema={value} />
    }
    // Plain config objects render as nested labelled rows.
    const nested = Object.entries(value).filter(([, v]) => v !== undefined)
    if (nested.length === 0) return <span className={mutedStyle}>none</span>
    return (
      <div className={nestedStyle}>
        <FieldRows fields={nested} />
      </div>
    )
  }

  // Fallback for anything unexpected.
  return <code className={jsonStyle}>{JSON.stringify(value)}</code>
}

/**
 * Renders a JSON Schema binding value (e.g. Kafka `key`/`groupId`, WebSocket
 * `query`) as a compact name / type / description table matching the payload
 * schema look. For a schema whose `properties` are defined, each property is a
 * row; for a leaf schema, a single row shows its type, description, and any
 * `enum` of allowed values.
 */
function SchemaValue({ schema }: { schema: Record<string, unknown> }) {
  const properties = isPlainObject(schema.properties) ? schema.properties : undefined

  if (properties && Object.keys(properties).length > 0) {
    return (
      <div className={schemaTableStyle}>
        {Object.entries(properties).map(([name, propSchema]) => (
          <SchemaRow
            key={name}
            name={name}
            schema={isPlainObject(propSchema) ? propSchema : {}}
          />
        ))}
      </div>
    )
  }

  // Leaf schema — a single description row.
  return (
    <div className={schemaTableStyle}>
      <SchemaLeaf schema={schema} />
    </div>
  )
}

function SchemaRow({ name, schema }: { name: string; schema: Record<string, unknown> }) {
  return (
    <div className={schemaRowStyle}>
      <code className={schemaNameStyle}>{name}</code>
      <SchemaLeaf schema={schema} />
    </div>
  )
}

/** The type / description / enum portion of a schema entry. */
function SchemaLeaf({ schema }: { schema: Record<string, unknown> }) {
  const type = typeof schema.type === 'string' ? schema.type : undefined
  const description = typeof schema.description === 'string' ? schema.description : undefined
  const enumValues = Array.isArray(schema.enum) ? schema.enum : undefined
  return (
    <div className={schemaLeafStyle}>
      {type && <span className={schemaTypeStyle}>{type}</span>}
      {description && <span className={schemaDescStyle}>{description}</span>}
      {enumValues && enumValues.length > 0 && (
        <span className={enumWrapStyle}>
          <span className={enumLabelStyle}>Allowed:</span>
          {enumValues.map((v, i) => (
            <code key={i} className={enumItemStyle}>
              {String(v)}
            </code>
          ))}
        </span>
      )}
    </div>
  )
}

/**
 * A key/value grid used to render binding fields and security-scheme fields.
 * Keys are humanized; values are formatted by type. Shared so binding and
 * security displays stay visually identical and a change lands in one place.
 *
 * Object values recurse: plain config objects render as nested labelled rows,
 * JSON-Schema values render as a compact schema table, and scalar arrays render
 * as comma-separated values rather than raw JSON.
 */
export function FieldRows({ fields }: { fields: Array<[string, unknown]> }) {
  if (fields.length === 0) return null
  return (
    <dl className={listStyle}>
      {fields.map(([field, value]) => (
        <div key={field} className={rowStyle}>
          <dt className={nameStyle}>{humanizeField(field)}</dt>
          <dd className={valueStyle}>{renderValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

const listStyle = css({
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  gap: '0.25rem 1rem',
  margin: '0.25rem 0 0',
  minWidth: 0,
})

const rowStyle = css({ display: 'contents' })

const nameStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-secondary)',
})

const valueStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-primary)',
  margin: 0,
  minWidth: 0,
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
})

const codeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
})

const jsonStyle = css({
  display: 'block',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
  margin: 0,
  whiteSpace: 'pre',
  overflowX: 'auto',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
})

const mutedStyle = css({
  color: 'var(--omnispec-fg-muted)',
})

/** Nested labelled rows for a plain config object, indented under the parent. */
const nestedStyle = css({
  minWidth: 0,
  paddingLeft: '0.5rem',
  marginTop: '0.125rem',
  boxShadow: 'inset 2px 0 0 0 var(--omnispec-border-color)',
})

/** Compact schema table for JSON-Schema binding values. */
const schemaTableStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  minWidth: 0,
})

const schemaRowStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  minWidth: 0,
})

const schemaNameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
  overflowWrap: 'anywhere',
})

const schemaLeafStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  gap: '0.375rem',
  minWidth: 0,
})

const schemaTypeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
})

const schemaDescStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
})

const enumWrapStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  gap: '0.25rem',
  minWidth: 0,
})

const enumLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
})

const enumItemStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  borderRadius: 'var(--omnispec-border-radius)',
  padding: '0.02rem 0.3rem',
  overflowWrap: 'anywhere',
})
