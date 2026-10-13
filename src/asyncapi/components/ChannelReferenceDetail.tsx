/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css, cx } from '@core/styles/css'
import { mq } from '@core/styles/breakpoints'
import type { AsyncApiChannel, AsyncApiOperation } from '@asyncapi/types/asyncapi.types'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer'
import { MethodBar } from '@core/components/common/MethodBar'
import { ExpandableCard } from '@core/components/common/ExpandableCard'
import { ReferenceLayout } from '@core/components/Reference/ReferenceLayout'
import { buildConstraints } from '@core/components/SchemaViewer/schema-utils'
import { SchemaBadge } from '@core/components/SchemaViewer/SchemaPrimitives'
import { BindingsSection } from './BindingsSection'
import { SecurityRequirementBadges } from './SecurityRequirementBadges'
import { ExternalDocsLink } from '@asyncapi/components/ExternalDocsLink'
import { MessagePayload } from './MessagePayload'

interface ChannelReferenceDetailProps {
  channel: AsyncApiChannel
  id?: string
  expandAll?: boolean
  expandGeneration?: number
  /**
   * When provided, operation tag chips become buttons that invoke this with the
   * tag name (e.g. to filter the spec by tag). When absent, chips render static.
   */
  onTagClick?: (tagName: string) => void
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

/**
 * Reference (three-panel) presentation of a channel — the AsyncAPI parallel to
 * the OpenAPI `displayMode: 'reference'` layout. Each operation renders in a
 * `ReferenceLayout`: the left column carries the operation detail (action,
 * description, parameters, security, bindings) and the right "Samples" column
 * carries the message payload schema + example (via the read-only
 * `MessagePayload`). AsyncAPI has no browser Try-It, so the Try-It slot is empty.
 *
 * Compact mode keeps using `ChannelDetail`; this wrapper is only mounted when
 * `displayMode === 'reference'`.
 */
export function ChannelReferenceDetail({ channel, id, expandAll, expandGeneration, onTagClick }: ChannelReferenceDetailProps) {
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
      <MethodBar label={primaryLabel} path={channel.address} color={primaryColor} />

      {channel.description && (
        <div className={channelMetaStyle}>
          <MarkdownRenderer content={channel.description} />
        </div>
      )}
      {channel.externalDocs && (
        <div className={channelMetaStyle}>
          <ExternalDocsLink externalDocs={channel.externalDocs} context={channel.address} />
        </div>
      )}

      {channel.operations.map((op, idx) => (
        <div key={idx} id={id ? `${id}-op-${idx}` : undefined} className={operationWrapStyle}>
          <ReferenceLayout
            operationId={op.operationId ?? `${channel.name}-op-${idx}`}
            schema={
              <OperationSchemaColumn
                channel={channel}
                operation={op}
                onTagClick={onTagClick}
              />
            }
            samples={<OperationSamplesColumn operation={op} idx={idx} />}
            tryIt={<div className={tryItNaStyle}>Interactive testing is not available for AsyncAPI protocols.</div>}
          />
        </div>
      ))}
    </ExpandableCard>
  )
}

/**
 * Left "schema" column: the operation's metadata + channel parameters. Mirrors
 * the compact ChannelDetail body minus the inline message payload (which moves
 * to the samples column in reference mode).
 */
function OperationSchemaColumn({
  channel,
  operation,
  onTagClick,
}: {
  channel: AsyncApiChannel
  operation: AsyncApiOperation
  onTagClick?: (tagName: string) => void
}) {
  return (
    <div>
      <div className={opHeaderStyle}>
        <span
          className={cx(actionBadgeBase, css({
            backgroundColor: actionColors[operation.action] ?? 'var(--omnispec-fg-muted)',
          }))}
        >
          {actionLabels[operation.action] ?? operation.action.toUpperCase()}
        </span>
        {operation.operationId && <span className={opIdStyle}>{operation.operationId}</span>}
        {operation.title && <span className={opTitleStyle}>{operation.title}</span>}
        {operation.summary && <span className={opSummaryStyle}>{operation.summary}</span>}
      </div>

      {operation.tags && operation.tags.length > 0 && (
        <div className={tagChipsStyle}>
          {operation.tags.map((tag) =>
            onTagClick ? (
              <button
                key={tag.name}
                type="button"
                className={tagChipButtonStyle}
                title={tag.description}
                onClick={() => onTagClick(tag.name)}
              >
                {tag.name}
              </button>
            ) : (
              <span key={tag.name} className={tagChipStyle} title={tag.description}>{tag.name}</span>
            ),
          )}
        </div>
      )}

      {operation.description && (
        <div className={sectionStyle}>
          <MarkdownRenderer content={operation.description} />
        </div>
      )}

      {operation.externalDocs && (
        <div className={sectionStyle}>
          <ExternalDocsLink
            externalDocs={operation.externalDocs}
            context={operation.operationId ?? operation.summary ?? 'operation'}
          />
        </div>
      )}

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
                    {paramType && <pre className={typeBadgeStyle}>{paramType}</pre>}
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
                  {param.description && <p className={paramDescStyle}>{param.description}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <SecurityRequirementBadges requirements={operation.securityRequirements ?? []} />

      <BindingsSection bindings={operation.bindings} title="Operation Bindings" />
      <BindingsSection bindings={channel.bindings} title="Channel Bindings" />
    </div>
  )
}

/**
 * Right "samples" column: the message payload schema + example for each message
 * the operation carries (plus any reply messages). Composes the read-only
 * `MessagePayload`, the same renderer compact mode uses inline.
 */
function OperationSamplesColumn({ operation, idx }: { operation: AsyncApiOperation; idx: number }) {
  const messages = operation.messages ?? []
  const replyMessages = operation.reply?.messages ?? []

  if (messages.length === 0 && replyMessages.length === 0) {
    return <div className={emptySamplesStyle}>No message payload is defined for this operation.</div>
  }

  return (
    <div className={samplesColumnStyle}>
      {messages.map((message, i) => (
        <div key={i}>
          <h4 className={sectionTitleStyle}>
            Message
            {(message.title ?? message.name) && (
              <span className={messageTitleStyle}> — {message.title ?? message.name}</span>
            )}
          </h4>
          {message.contentType && <code className={contentTypeStyle}>{message.contentType}</code>}
          <MessagePayload message={message} idx={`${idx}-msg-${i}`} />
        </div>
      ))}

      {replyMessages.length > 0 && (
        <div className={replyStyle}>
          <h4 className={sectionTitleStyle}>Reply</h4>
          {replyMessages.map((message, i) => (
            <MessagePayload key={i} message={message} idx={`${idx}-reply-${i}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Styles (mirrors ChannelDetail so both display modes look consistent) ---

const channelMetaStyle = css({
  padding: '0.75rem 1rem 0',
  [mq.desktop]: {
    padding: '1rem 1.25rem 0',
  },
})

const operationWrapStyle = css({
  borderTop: '1px solid var(--omnispec-border-color)',
})

const tryItNaStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  fontStyle: 'italic',
  padding: '0.5rem 0',
})

const samplesColumnStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
})

const emptySamplesStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  fontStyle: 'italic',
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

const opTitleStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
})

const opSummaryStyle = css({
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
})

const messageTitleStyle = css({
  fontWeight: 400,
  color: 'var(--omnispec-fg-primary)',
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

const replyStyle = css({
  paddingLeft: '0.75rem',
  borderLeft: '0.125rem solid var(--omnispec-border-color)',
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

const tagChipButtonStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-secondary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '1px 0.5rem',
  borderRadius: '0.625rem',
  border: 'none',
  cursor: 'pointer',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
})
