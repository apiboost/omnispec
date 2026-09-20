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
import { css, cx } from '../../core/styles/css'
import type { AsyncApiServer } from '../types/asyncapi.types'
import { ProtocolBadge } from './ProtocolBadge'
import { BindingsSection } from './BindingsSection'

interface ServerListProps {
  servers: AsyncApiServer[]
}

const containerStyle = css({
  marginBottom: '24px',
})

const titleStyle = css({
  margin: '0 0 12px',
  fontSize: 'var(--omnispec-h3-font-size)',
  color: 'var(--omnispec-h3-color)',
  fontWeight: 600,
})

const tabStripStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  marginBottom: '8px',
})

const tabStyle = css({
  padding: '4px 12px',
  border: 'none',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  color: 'var(--omnispec-fg-secondary)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-mono)',
  cursor: 'pointer',
  '&:hover': {
    color: 'var(--omnispec-fg-primary)',
  },
})

const tabActiveStyle = css({
  backgroundColor: 'var(--omnispec-color-primary)',
  color: '#ffffff',
  '&:hover': {
    color: '#ffffff',
  },
})

const cardStyle = css({
  padding: '12px',
  border: '1px solid var(--omnispec-border-color)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  '&:hover': {
    borderColor: 'var(--omnispec-color-primary)',
  },
})

const cardHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
})

const serverNameStyle = css({
  fontWeight: 600,
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-primary)',
})

const urlStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-code)',
  display: 'block',
  marginBottom: '4px',
})

const descriptionStyle = css({
  margin: '4px 0 0',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
})

const variablesStyle = css({
  marginTop: '8px',
  fontSize: 'var(--omnispec-font-size-xs)',
})

const varRowStyle = css({
  display: 'flex',
  gap: '6px',
  marginBottom: '2px',
})

const varNameStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-primary)',
  fontWeight: 600,
})

const varDefaultStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-muted)',
})

const varDescStyle = css({
  color: 'var(--omnispec-fg-secondary)',
})

const varEnumStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-color-info)',
})

const varTokenStyle = css({
  color: 'var(--omnispec-color-primary)',
  backgroundColor: 'color-mix(in srgb, var(--omnispec-color-primary) 12%, transparent)',
  borderRadius: '3px',
  padding: '0 2px',
  '&::before': { content: '"{"' },
  '&::after': { content: '"}"' },
})

const securityRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap',
  marginTop: '8px',
})

const securityLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xxs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--omnispec-fg-muted)',
})

const securityBadgeStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
  color: 'var(--omnispec-fg-primary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '2px 8px',
  borderRadius: '4px',
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
})

/** Render a server URL with `{variable}` placeholders visually highlighted. */
function highlightVariables(url: string) {
  const parts = url.split(/(\{[^}]+\})/g)
  return parts.map((part, i) =>
    /^\{[^}]+\}$/.test(part)
      ? <span key={i} className={varTokenStyle}>{part.slice(1, -1)}</span>
      : <span key={i}>{part}</span>,
  )
}

function ServerCard({ server }: { server: AsyncApiServer }) {
  return (
    <div className={cardStyle}>
      <div className={cardHeaderStyle}>
        <span className={serverNameStyle}>{server.name}</span>
        <ProtocolBadge protocol={server.protocol} version={server.protocolVersion} />
      </div>
      <code className={urlStyle}>{highlightVariables(server.url)}</code>
      {server.description && (
        <p className={descriptionStyle}>{server.description}</p>
      )}
      {server.variables && Object.entries(server.variables).length > 0 && (
        <div className={variablesStyle}>
          {Object.entries(server.variables).map(([name, variable]) => (
            <div key={name} className={varRowStyle}>
              <code className={varNameStyle}>{name}</code>
              {variable.default && <span className={varDefaultStyle}>= {variable.default}</span>}
              {variable.enum && variable.enum.length > 0 && (
                <span className={varEnumStyle}>enum: {variable.enum.join(' | ')}</span>
              )}
              {variable.description && <span className={varDescStyle}>{variable.description}</span>}
            </div>
          ))}
        </div>
      )}
      {server.securityNames && server.securityNames.length > 0 && (
        <div className={securityRowStyle}>
          <span className={securityLabelStyle}>Security</span>
          {server.securityNames.map((name) => (
            <a key={name} href={`#security-${name}`} className={securityBadgeStyle}>{name}</a>
          ))}
        </div>
      )}
      <BindingsSection bindings={server.bindings} title="Server Bindings" />
    </div>
  )
}

export function ServerList({ servers }: ServerListProps) {
  const [selected, setSelected] = useState(0)
  if (servers.length === 0) return null

  const activeIndex = Math.min(selected, servers.length - 1)

  return (
    <div className={cx('omnispec-async-servers', containerStyle)}>
      <h3 className={titleStyle}>Servers</h3>
      {servers.length > 1 ? (
        <>
          <div className={tabStripStyle} role="tablist" aria-label="Servers">
            {servers.map((server, idx) => (
              <button
                key={server.name}
                type="button"
                role="tab"
                aria-selected={idx === activeIndex}
                className={cx(tabStyle, idx === activeIndex && tabActiveStyle)}
                onClick={() => setSelected(idx)}
              >
                {server.name}
              </button>
            ))}
          </div>
          <ServerCard server={servers[activeIndex]} />
        </>
      ) : (
        <ServerCard server={servers[0]} />
      )}
    </div>
  )
}
