/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css, cx } from '../../core/styles/css'
import type { AsyncApiServer } from '../types/asyncapi.types'
import { ProtocolBadge } from './ProtocolBadge'

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

const gridStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
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

export function ServerList({ servers }: ServerListProps) {
  if (servers.length === 0) return null

  return (
    <div className={cx('omnispec-async-servers', containerStyle)}>
      <h3 className={titleStyle}>Servers</h3>
      <div className={gridStyle}>
        {servers.map((server) => (
          <div key={server.name} className={cardStyle}>
            <div className={cardHeaderStyle}>
              <span className={serverNameStyle}>{server.name}</span>
              <ProtocolBadge protocol={server.protocol} version={server.protocolVersion} />
            </div>
            <code className={urlStyle}>{server.url}</code>
            {server.description && (
              <p className={descriptionStyle}>{server.description}</p>
            )}
            {server.variables && Object.entries(server.variables).length > 0 && (
              <div className={variablesStyle}>
                {Object.entries(server.variables).map(([name, variable]) => (
                  <div key={name} className={varRowStyle}>
                    <code className={varNameStyle}>{name}</code>
                    {variable.default && <span className={varDefaultStyle}>= {variable.default}</span>}
                    {variable.description && <span className={varDescStyle}>{variable.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
