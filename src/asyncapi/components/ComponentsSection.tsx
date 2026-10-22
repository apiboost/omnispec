/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import type { AsyncApiComponents } from '@asyncapi/types/asyncapi.types'
import { Collapsible } from '@core/components/common/Collapsible'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import { schemaToNodes } from '@core/components/SchemaViewer/schema-utils'
import { MessagePayload } from './MessagePayload'

interface ComponentsSectionProps {
  components: AsyncApiComponents
}

export function ComponentsSection({ components }: ComponentsSectionProps) {
  const schemas = Object.entries(components.schemas)
  const messages = Object.entries(components.messages ?? {})
  if (schemas.length === 0 && messages.length === 0) return null

  return (
    <>
      {messages.length > 0 && (
        <div className={`omnispec-async-messages ${containerStyle}`} id="messages">
          <h2 className={titleStyle}>Messages</h2>
          <div className={schemaWrapperStyle}>
            {messages.map(([name, message]) => (
              <div key={name} className={schemaStyle} id={`message-${name}`}>
                <Collapsible
                  title={<code className={schemaNameStyle}>{name}</code>}
                  defaultOpen={false}
                >
                  {message.title && <p className={messageSummaryStyle}>{message.title}</p>}
                  {message.summary && <p className={messageSummaryStyle}>{message.summary}</p>}
                  {message.contentType && (
                    <code className={contentTypeStyle}>
                      {message.contentType}
                      {message.contentTypeInherited && (
                        <span className={contentTypeHintStyle}> (default)</span>
                      )}
                    </code>
                  )}
                  <MessagePayload message={message} idx={`message-${name}`} />
                  {message.correlationId && (
                    <div className={correlationIdStyle}>
                      <span className={correlationIdLabelStyle}>correlationId</span>
                      <code className={correlationIdLocationStyle}>{message.correlationId.location}</code>
                      {message.correlationId.description && (
                        <span className={correlationIdDescStyle}>{message.correlationId.description}</span>
                      )}
                    </div>
                  )}
                  {message.headers && (
                    <div className={headersWrapStyle}>
                      <h4 className={headersTitleStyle}>Headers</h4>
                      <SchemaTree nodes={schemaToNodes(message.headers as Record<string, unknown>)} />
                    </div>
                  )}
                </Collapsible>
              </div>
            ))}
          </div>
        </div>
      )}

      {schemas.length > 0 && (
        <div className={`omnispec-async-components ${containerStyle}`} id="schemas">
          <h2 className={titleStyle}>Schemas</h2>
          <div className={schemaWrapperStyle}>
            {schemas.map(([name, schema]) => (
              <div key={name} className={schemaStyle} id={`schema-${name}`}>
                <Collapsible
                  title={<code className={schemaNameStyle}>{name}</code>}
                  defaultOpen={false}
                >
                  <SchemaTree nodes={schemaToNodes(schema)} />
                </Collapsible>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const containerStyle = css({
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid var(--omnispec-border-color)',
  [mq.mobile]: {
    borderTop: 'none',
    marginTop: '1.5rem',
    paddingTop: '1rem',
  },
})

const titleStyle = css({
  margin: '0 0 1rem',
  fontSize: 'var(--omnispec-h2-font-size)',
  color: 'var(--omnispec-h2-color)',
  fontWeight: 700,
})

const schemaWrapperStyle = css({
  border: '1px solid var(--omnispec-border-color)',
  borderRadius: '0.5rem',
  padding: '1.5rem 1rem',
})

const schemaStyle = css({
  marginBottom: '0.5rem',
})

const schemaNameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-base)',
  fontWeight: 600,
  color: 'var(--omnispec-color-primary)',
  backgroundColor: 'transparent',
  padding: 0,
  '&:hover': {
    textDecoration: 'underline',
  },
})

const messageSummaryStyle = css({
  margin: '0 0 0.5rem',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
})

const contentTypeStyle = css({
  display: 'block',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  marginBottom: '0.5rem',
})

const contentTypeHintStyle = css({
  fontStyle: 'italic',
  color: 'var(--omnispec-fg-muted)',
})

const correlationIdStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
  marginTop: '0.75rem',
})

const correlationIdLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const correlationIdLocationStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '1px 0.375rem',
  borderRadius: '0.1875rem',
})

const correlationIdDescStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
})

const headersWrapStyle = css({
  marginTop: '1rem',
})

const headersTitleStyle = css({
  margin: '0 0 0.75rem',
  fontSize: 'var(--omnispec-font-size-md)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  letterSpacing: '0.02em',
})
