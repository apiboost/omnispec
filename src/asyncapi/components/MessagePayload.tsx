/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { useState } from 'react'
import { css } from '@core/styles/css'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import { schemaToNodes, generateExample } from '@core/components/SchemaViewer/schema-utils'
import { CodeBlock } from '@core/components/CodeBlock/CodeBlock'
import { Tabs } from '@core/components/common/Tabs'
import { Icon } from '@core/components/common/Icon'
import { ExampleSelector, type NamedExample } from '@core/components/common/ExampleSelector'
import type { AsyncApiMessage } from '@asyncapi/types/asyncapi.types'
import { avroToJsonSchema, detectSchemaFormat } from '@asyncapi/schema-formats'

/**
 * Renders a message payload as Schema + Example tabs. Avro payloads are
 * normalized to a JSON-Schema field tree first (via `schemaFormat`) so they show
 * real fields instead of the bare wrapper word; an unresolvable `$ref` payload
 * shows a visible notice. Shared by ChannelDetail and the component Messages
 * section so both get identical, format-aware rendering.
 */
export function MessagePayload({ message, idx }: { message: AsyncApiMessage; idx: string | number }) {
  const rawPayload = message.payload as Record<string, unknown> | undefined

  return (
    <>
      {message.schemaFormat && (
        <span className={schemaFormatBadgeStyle}>{message.schemaFormat}</span>
      )}
      {rawPayload && <PayloadBody rawPayload={rawPayload} schemaFormat={message.schemaFormat} message={message} idx={idx} />}
    </>
  )
}

function PayloadBody({
  rawPayload,
  schemaFormat,
  message,
  idx,
}: {
  rawPayload: Record<string, unknown>
  schemaFormat?: string
  message: AsyncApiMessage
  idx: string | number
}) {
  // An unresolvable $ref survives resolution as a bare `{ $ref }` — surface it
  // rather than rendering an empty/misleading schema (ABOSPEC-50).
  if (typeof rawPayload.$ref === 'string') {
    return (
      <div className={unresolvedRefStyle} role="alert">
        <Icon name="warning" size="0.875rem" />
        <span>Unresolved reference: <code className={unresolvedRefCodeStyle}>{rawPayload.$ref}</code></span>
      </div>
    )
  }

  const schema = detectSchemaFormat(schemaFormat) === 'avro' ? avroToJsonSchema(rawPayload) : rawPayload

  return (
    <Tabs
      tabs={[
        {
          id: `schema-${idx}`,
          label: 'Payload Schema',
          content: <SchemaTree nodes={schemaToNodes(schema)} />,
        },
        {
          id: `example-${idx}`,
          label: 'Example',
          content: <MessageExample message={message} schema={schema} />,
        },
      ]}
    />
  )
}

/**
 * The Example tab. Prefers the message's declared `examples` (with a selector
 * when several are named); falls back to synthesizing one from the payload schema.
 */
function MessageExample({ message, schema }: { message: AsyncApiMessage; schema?: Record<string, unknown> }) {
  const named: NamedExample[] = (message.examples ?? [])
    .filter((ex) => ex.payload !== undefined)
    .map((ex, i) => ({
      name: ex.name ?? `example ${i + 1}`,
      summary: ex.summary,
      value: ex.payload,
    }))

  const [selectedName, setSelectedName] = useState(named[0]?.name ?? '')
  const active = named.find((ex) => ex.name === selectedName) ?? named[0]

  const exampleSchema = schema ?? (message.payload as Record<string, unknown> | undefined)
  const code = active?.value !== undefined
    ? JSON.stringify(active.value, null, 2)
    : exampleSchema
      ? JSON.stringify(generateExample(exampleSchema), null, 2)
      : '{}'

  return (
    <>
      <ExampleSelector examples={named} selectedName={selectedName || (named[0]?.name ?? '')} onSelect={setSelectedName} />
      <CodeBlock code={code} language="json" />
    </>
  )
}

const schemaFormatBadgeStyle = css({
  display: 'inline-block',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xxs)',
  color: 'var(--omnispec-fg-secondary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.0625rem 0.375rem',
  borderRadius: 'var(--omnispec-border-radius)',
  marginBottom: '0.5rem',
})

const unresolvedRefStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'color-mix(in srgb, var(--omnispec-color-warning) 12%, transparent)',
  color: 'var(--omnispec-color-warning)',
  fontSize: 'var(--omnispec-font-size-sm)',
})

const unresolvedRefCodeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
})
