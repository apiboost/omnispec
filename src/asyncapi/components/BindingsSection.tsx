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
import { ProtocolBadge } from './ProtocolBadge'

interface BindingsSectionProps {
  bindings?: Record<string, unknown>
  /** Heading shown above the protocol groups. Defaults to "Bindings". */
  title?: string
}

/** Keys that are AsyncAPI housekeeping rather than user-facing binding data. */
const HIDDEN_KEYS = new Set(['bindingVersion'])

/**
 * Renders protocol bindings for a server, channel, operation, or message.
 *
 * AsyncAPI defines dozens of protocol-specific binding fields and adds more over
 * time, so rather than hard-code each protocol's schema we render every field as
 * a labelled row. This covers all known protocols (MQTT, Kafka, WebSocket, AMQP,
 * STOMP, HTTP, …) and degrades gracefully for unrecognized protocols — their raw
 * fields are shown instead of being dropped or crashing the renderer.
 */
export function BindingsSection({ bindings, title = 'Bindings' }: BindingsSectionProps) {
  if (!bindings || Object.keys(bindings).length === 0) return null

  const protocols = Object.entries(bindings).filter(
    ([, cfg]) => cfg && typeof cfg === 'object',
  )
  if (protocols.length === 0) return null

  return (
    <div className={containerStyle}>
      <h4 className={titleStyle}>{title}</h4>
      <div className={protocolListStyle}>
        {protocols.map(([protocol, cfg]) => {
          const rows = Object.entries(cfg as Record<string, unknown>).filter(
            ([key, value]) => !HIDDEN_KEYS.has(key) && value !== undefined,
          )
          return (
            <div key={protocol} className={protocolCardStyle}>
              <div className={protocolHeaderStyle}>
                <ProtocolBadge protocol={protocol} />
              </div>
              {rows.length > 0 ? (
                <dl className={fieldListStyle}>
                  {rows.map(([field, value]) => (
                    <div key={field} className={fieldRowStyle}>
                      <dt className={fieldNameStyle}>{humanizeField(field)}</dt>
                      <dd className={fieldValueStyle}>{renderValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className={emptyStyle}>No binding fields.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** "cleanSession" / "clean_session" → "Clean Session". */
function humanizeField(field: string): string {
  const spaced = field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function renderValue(value: unknown) {
  if (value === null) return <span className={mutedStyle}>null</span>
  if (typeof value === 'boolean') return <code className={codeStyle}>{value ? 'true' : 'false'}</code>
  if (typeof value === 'number') return <code className={codeStyle}>{String(value)}</code>
  if (typeof value === 'string') return <span>{value}</span>
  // Objects and arrays (e.g. MQTT lastWill, WebSocket query schema).
  return <code className={jsonStyle}>{JSON.stringify(value)}</code>
}

const containerStyle = css({
  marginTop: '16px',
})

const titleStyle = css({
  margin: '0 0 12px',
  fontSize: 'var(--omnispec-font-size-md)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  letterSpacing: '0.02em',
})

const protocolListStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
})

const protocolCardStyle = css({
  padding: '10px 12px',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
})

const protocolHeaderStyle = css({
  marginBottom: '8px',
})

const fieldListStyle = css({
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  gap: '4px 16px',
  margin: 0,
})

const fieldRowStyle = css({
  display: 'contents',
})

const fieldNameStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-secondary)',
})

const fieldValueStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-primary)',
  margin: 0,
  minWidth: 0,
  wordBreak: 'break-word',
})

const codeStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
})

const jsonStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
  wordBreak: 'break-all',
})

const mutedStyle = css({
  color: 'var(--omnispec-fg-muted)',
})

const emptyStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
})
