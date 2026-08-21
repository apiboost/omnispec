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
import type { AsyncApiChannel } from '../types/asyncapi.types'
import { MarkdownRenderer } from '@core/components/MarkdownRenderer'
import { SchemaTree } from '@core/components/SchemaViewer/SchemaTree'
import { schemaToNodes, generateExample } from '@core/components/SchemaViewer/schema-utils'
import { CodeBlock } from '@core/components/CodeBlock/CodeBlock'
import { Tabs } from '@core/components/common/Tabs'
import { ExpandableCard } from '@core/components/common/ExpandableCard'
import { MethodBar } from '@core/components/common/MethodBar'

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
                const paramType = (param.schema as Record<string, unknown>)?.type as string | undefined
                return (
                  <div key={name} className={paramRowStyle}>
                    <div className={paramHeaderStyle}>
                      <span className={paramNameStyle}>{name}</span>
                      {paramType && (
                        <pre className={typeBadgeStyle}>{paramType}</pre>
                      )}
                    </div>
                    {param.description && (
                      <p className={paramDescStyle}>{param.description}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Operations */}
        {channel.operations.map((op, idx) => (
          <div key={idx} className={operationStyle}>
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

            {op.description && (
              <div className={sectionStyle}>
                <MarkdownRenderer content={op.description} />
              </div>
            )}

            {op.message && (
              <div className={sectionStyle}>
                <h4 className={sectionTitleStyle}>
                  Message
                  {op.message.title && <span className={messageTitleStyle}> — {op.message.title}</span>}
                </h4>
                {op.message.summary && (
                  <p className={messageSummaryStyle}>{op.message.summary}</p>
                )}
                {op.message.contentType && (
                  <code className={contentTypeStyle}>{op.message.contentType}</code>
                )}

                {op.message.payload && (
                  <Tabs
                    tabs={[
                      {
                        id: `schema-${idx}`,
                        label: 'Payload Schema',
                        content: <SchemaTree nodes={schemaToNodes(op.message.payload as Record<string, unknown>)} />,
                      },
                      {
                        id: `example-${idx}`,
                        label: 'Example',
                        content: (
                          <CodeBlock
                            code={JSON.stringify(generateExample(op.message.payload as Record<string, unknown>), null, 2)}
                            language="json"
                          />
                        ),
                      },
                    ]}
                  />
                )}

                {op.message.headers && (
                  <div className={headersWrapStyle}>
                    <h4 className={sectionTitleStyle}>Headers</h4>
                    <SchemaTree nodes={schemaToNodes(op.message.headers as Record<string, unknown>)} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </ExpandableCard>
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
  marginBottom: '24px',
})

const sectionTitleStyle = css({
  margin: '0 0 12px',
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
  padding: '12px 0',
})

const paramHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
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
  margin: '4px 0 0',
  fontSize: 'var(--omnispec-font-size-base)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.5,
})

const operationStyle = css({
  padding: '12px 0',
  borderTop: '1px solid var(--omnispec-border-color)',
})

const opHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
})

const actionBadgeBase = css({
  display: 'inline-block',
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: '9px',
  fontWeight: 700,
  fontFamily: 'var(--omnispec-font-mono)',
  color: '#ffffff',
  letterSpacing: '0.5px',
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
  margin: '0 0 8px',
  fontSize: 'var(--omnispec-font-size-base)',
  color: 'var(--omnispec-fg-secondary)',
})

const contentTypeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
  display: 'block',
  marginBottom: '8px',
  backgroundColor: 'transparent',
  padding: 0,
})

const headersWrapStyle = css({
  marginTop: '16px',
})
