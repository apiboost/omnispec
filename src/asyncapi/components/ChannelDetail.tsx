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
import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import type { AsyncApiChannel, AsyncApiOperation, AsyncApiMessage } from '@asyncapi/types/asyncapi.types'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import { schemaToNodes, buildConstraints } from '@core/components/SchemaViewer/schema-utils'
import { SchemaBadge } from '@core/components/SchemaViewer/SchemaPrimitives'
import { ExpandableCard } from '@core/components/common/ExpandableCard'
import { MethodBar } from '@core/components/common/MethodBar'
import { BindingsSection } from './BindingsSection'
import { SecurityRequirementBadges } from './SecurityRequirementBadges'
import { MessagePayload } from './MessagePayload'

interface ChannelDetailProps {
  channel: AsyncApiChannel
  id?: string
  expandAll?: boolean
  expandGeneration?: number
}

const actionLabels: Record<string, string> = {
  publish: 'PUB',
  subscribe: 'SUB',
  send: 'SEND',
  receive: 'RECV',
}

const actionColors: Record<string, string> = {
  publish: 'var(--omnispec-color-publish)',
  subscribe: 'var(--omnispec-color-subscribe)',
  send: 'var(--omnispec-color-publish)',
  receive: 'var(--omnispec-color-subscribe)',
}

export function ChannelDetail({ channel, id, expandAll, expandGeneration }: ChannelDetailProps) {
  const primaryAction = channel.operations[0]?.action
  const primaryLabel = actionLabels[primaryAction] ?? primaryAction?.toUpperCase() ?? ''
  const primaryColor = actionColors[primaryAction] ?? 'var(--omnispec-fg-muted)'

  return (
    <ExpandableCard
      id={id}
      title={channel.address}
      rightLabel={`${channel.operations.length} ${channel.operations.length === 1 ? 'operation' : 'operations'}`}
      expandAll={expandAll}
      expandGeneration={expandGeneration}
    >
      {/* Method bar — matches OpenAPI MethodBar pattern */}
      <MethodBar label={primaryLabel} path={channel.address} color={primaryColor} />

      {/* Body content */}
      <div className={bodyStyle}>
        {channel.description && (
          <div className={sectionStyle}>
            <MarkdownRenderer content={channel.description} />
          </div>
        )}

        {/* Parameters — match OpenAPI inline param style */}
        {channel.parameters && Object.keys(channel.parameters).length > 0 && (
          <div className={sectionStyle}>
            <h4 className={sectionTitleStyle}>Parameters</h4>
            <div className={paramListStyle}>
              {Object.entries(channel.parameters).map(([name, param]) => {
                const schema = (param.schema ?? {}) as Record<string, unknown>
                const paramType = schema.type as string | undefined
                const paramFormat = schema.format as string | undefined
                const paramEnum = schema.enum as unknown[] | undefined
                const constraintBadges = buildConstraints(schema)
                return (
                  <div key={name} className={paramRowStyle}>
                    <div className={paramHeaderStyle}>
                      <span className={paramNameStyle}>{name}</span>
                      {paramType && (
                        <pre className={typeBadgeStyle}>{paramType}</pre>
                      )}
                    </div>
                    {(paramFormat || constraintBadges.length > 0 || (paramEnum && paramEnum.length > 0)) && (
                      <div className={paramConstraintsStyle}>
                        {paramFormat && <SchemaBadge variant="constraint">{paramFormat}</SchemaBadge>}
                        {constraintBadges.map((c) => (
                          <SchemaBadge key={c} variant="constraint">{c}</SchemaBadge>
                        ))}
                        {paramEnum && paramEnum.length > 0 && (
                          <SchemaBadge variant="enum">enum: {paramEnum.map(String).join(' | ')}</SchemaBadge>
                        )}
                      </div>
                    )}
                    {param.description && (
                      <p className={paramDescStyle}>{param.description}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Channel-level protocol bindings */}
        <BindingsSection bindings={channel.bindings} title="Channel Bindings" />

        {/* Operations */}
        {channel.operations.map((op, idx) => (
          <div key={idx} id={id ? `${id}-op-${idx}` : undefined} className={operationStyle}>
            <div className={opHeaderStyle}>
              <span
                className={cx(actionBadgeBase, css({
                  backgroundColor: actionColors[op.action] ?? 'var(--omnispec-fg-muted)',
                }))}
              >
                {actionLabels[op.action] ?? op.action.toUpperCase()}
              </span>
              {op.operationId && <span className={opIdStyle}>{op.operationId}</span>}
              {op.summary && <span className={opSummaryStyle}>{op.summary}</span>}
            </div>

            {op.tags && op.tags.length > 0 && (
              <div className={tagChipsStyle}>
                {op.tags.map((tag) => (
                  <span key={tag.name} className={tagChipStyle} title={tag.description}>{tag.name}</span>
                ))}
              </div>
            )}

            {op.description && (
              <div className={sectionStyle}>
                <MarkdownRenderer content={op.description} />
              </div>
            )}

            <SecurityRequirementBadges names={op.securityNames} />

            <OperationMessages operation={op} idx={idx} />

            {op.reply && op.reply.messages.length > 0 && (
              <div className={replyStyle}>
                <h4 className={replyTitleStyle}>Reply</h4>
                {op.reply.messages.map((replyMsg, i) => (
                  <MessageView key={i} message={replyMsg} idx={`${idx}-reply-${i}`} />
                ))}
              </div>
            )}

            <BindingsSection bindings={op.bindings} title="Operation Bindings" />
          </div>
        ))}
      </div>
    </ExpandableCard>
  )
}

function messageLabel(message: AsyncApiMessage, index: number): string {
  return message.title ?? message.name ?? `Message ${index + 1}`
}

/**
 * Renders the message(s) an operation carries. AsyncAPI allows more than one
 * possible message (2.x `oneOf`, 3.x `messages` array); when there is more than
 * one, a selector switches between them so none are silently dropped.
 */
function OperationMessages({ operation, idx }: { operation: AsyncApiOperation; idx: number }) {
  const messages = operation.messages ?? []
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (messages.length === 0) return null

  const active = messages[Math.min(selectedIndex, messages.length - 1)]

  return (
    <div className={sectionStyle}>
      {messages.length > 1 && (
        <div className={messageSelectorStyle}>
          <label htmlFor={`msg-select-${idx}`} className={messageSelectorLabelStyle}>Message</label>
          <select
            id={`msg-select-${idx}`}
            className={messageSelectStyle}
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
          >
            {messages.map((m, i) => (
              <option key={i} value={i}>{messageLabel(m, i)}</option>
            ))}
          </select>
          <span className={messageCountStyle}>{messages.length} messages</span>
        </div>
      )}
      <MessageView message={active} idx={idx} />
    </div>
  )
}

function MessageView({ message, idx }: { message: AsyncApiMessage; idx: string | number }) {
  return (
    <div>
      <h4 className={sectionTitleStyle}>
        Message
        {(message.title ?? message.name) && (
          <span className={messageTitleStyle}> — {message.title ?? message.name}</span>
        )}
      </h4>
      {message.summary && <p className={messageSummaryStyle}>{message.summary}</p>}
      {message.contentType && <code className={contentTypeStyle}>{message.contentType}</code>}

      <MessagePayload message={message} idx={idx} />

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
          <h4 className={sectionTitleStyle}>Headers</h4>
          <SchemaTree nodes={schemaToNodes(message.headers as Record<string, unknown>)} />
        </div>
      )}

      <BindingsSection bindings={message.bindings} title="Message Bindings" />
    </div>
  )
}

// --- Styles matching OpenAPI OperationDetail ---

const bodyStyle = css({
  padding: '0.75rem 1rem',
  [mq.desktop]: {
    padding: '1rem 1.25rem',
  },
})

const sectionStyle = css({
  marginBottom: '1.5rem',
})

const sectionTitleStyle = css({
  margin: '0 0 0.75rem',
  fontSize: 'var(--omnispec-font-size-md)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  letterSpacing: '0.02em',
})

const paramListStyle = css({
  display: 'flex',
  flexDirection: 'column',
})

const paramRowStyle = css({
  padding: '0.75rem 0',
})

const paramHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
})

const paramNameStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 700,
  backgroundColor: 'transparent',
  padding: 0,
})

const typeBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 400,
})

const paramDescStyle = css({
  margin: '0.25rem 0 0',
  fontSize: 'var(--omnispec-font-size-base)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.5,
})

const paramConstraintsStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
  marginTop: '0.375rem',
})

const operationStyle = css({
  padding: '0.75rem 0',
  borderTop: '1px solid var(--omnispec-border-color)',
})

const opHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.5rem',
})

const actionBadgeBase = css({
  display: 'inline-block',
  padding: '0.125rem 0.375rem',
  borderRadius: '0.1875rem',
  fontSize: '0.5625rem',
  fontWeight: 700,
  fontFamily: 'var(--omnispec-font-mono)',
  color: '#ffffff',
  letterSpacing: '0.0313rem',
})

const opIdStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 700,
  backgroundColor: 'transparent',
  padding: 0,
})

const opSummaryStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
})

const messageTitleStyle = css({
  fontWeight: 400,
  color: 'var(--omnispec-fg-primary)',
})

const messageSummaryStyle = css({
  margin: '0 0 0.5rem',
  fontSize: 'var(--omnispec-font-size-base)',
  color: 'var(--omnispec-fg-secondary)',
})

const contentTypeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  display: 'block',
  marginBottom: '0.5rem',
  backgroundColor: 'transparent',
  padding: 0,
})

const headersWrapStyle = css({
  marginTop: '1rem',
})

const messageSelectorStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
  marginBottom: '0.75rem',
})

const messageSelectorLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.0313rem',
  whiteSpace: 'nowrap',
})

const messageSelectStyle = css({
  padding: '0.375rem 0.625rem',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const messageCountStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
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

const replyStyle = css({
  marginTop: '1rem',
  paddingLeft: '0.75rem',
  borderLeft: '0.125rem solid var(--omnispec-border-color)',
})

const replyTitleStyle = css({
  margin: '0 0 0.5rem',
  fontSize: 'var(--omnispec-font-size-md)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  letterSpacing: '0.02em',
})

const tagChipsStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  marginBottom: '0.5rem',
})

const tagChipStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-secondary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '1px 0.5rem',
  borderRadius: '0.625rem',
})
