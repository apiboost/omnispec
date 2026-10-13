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
import { FieldRows } from './field-display'

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
                <FieldRows fields={rows} />
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

const containerStyle = css({
  marginTop: '1rem',
})

const titleStyle = css({
  margin: '0 0 0.75rem',
  fontSize: 'var(--omnispec-font-size-md)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  letterSpacing: '0.02em',
})

const protocolListStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
})

const protocolCardStyle = css({
  padding: '0.625rem 0.75rem',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
})

const protocolHeaderStyle = css({
  marginBottom: '0.5rem',
})

const emptyStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
})
