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
import { css } from '../../core/styles/css'
import type { OpenApiServer } from '../types/openapi.types'

interface ServerSelectorProps {
  servers: OpenApiServer[]
  selectedUrl: string
  onSelect: (url: string) => void
}

export function ServerSelector({ servers, selectedUrl, onSelect }: ServerSelectorProps) {
  const [variables, setVariables] = useState<Record<string, string>>({})

  const hasUsableServers = servers.length > 0 && servers.some(
    (s) => s.url && s.url !== '/',
  )
  if (!hasUsableServers) return null

  const resolveUrl = (server: OpenApiServer, vars: Record<string, string>): string => {
    let resolved = server.url
    if (server.variables) {
      for (const [key, variable] of Object.entries(server.variables)) {
        resolved = resolved.replace(`{${key}}`, vars[key] ?? variable.default ?? '')
      }
    }
    return resolved
  }

  const serverIndex = servers.findIndex((s) => selectedUrl.startsWith(s.url.split('{')[0]))
  const currentIndex = serverIndex >= 0 ? serverIndex : 0
  const currentServer = servers[currentIndex]

  const resolvedUrl = resolveUrl(currentServer, variables)

  const handleServerChange = (newIndex: number) => {
    setVariables({})
    onSelect(resolveUrl(servers[newIndex], {}))
  }

  const handleVariableChange = (name: string, value: string) => {
    const newVars = { ...variables, [name]: value }
    setVariables(newVars)
    onSelect(resolveUrl(currentServer, newVars))
  }

  return (
    <div className={`omnispec-server-selector ${serverContainerStyle}`}>
      <label className={serverLabelStyle}>Server</label>
      <div className={serverRowStyle}>
        {servers.length === 1 ? (
          <code className={serverUrlStyle}>{resolvedUrl}</code>
        ) : (
          <select
            value={currentIndex}
            onChange={(e) => handleServerChange(Number(e.target.value))}
            className={serverSelectStyle}
          >
            {servers.map((server, idx) => (
              <option key={idx} value={idx}>
                {server.url}{server.description ? ` - ${server.description}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {currentServer?.variables && Object.entries(currentServer.variables).length > 0 && (
        <div className={serverVariablesStyle}>
          {Object.entries(currentServer.variables).map(([name, variable]) => (
            <div key={name} className={serverVarRowStyle}>
              <label className={serverVarLabelStyle}>{name}</label>
              {variable.enum ? (
                <select
                  value={variables[name] ?? variable.default}
                  onChange={(e) => handleVariableChange(name, e.target.value)}
                  className={serverVarInputStyle}
                >
                  {variable.enum.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={variables[name] ?? variable.default}
                  onChange={(e) => handleVariableChange(name, e.target.value)}
                  className={serverVarInputStyle}
                />
              )}
              {variable.description && <span className={serverVarDescStyle}>{variable.description}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const serverContainerStyle = css({
  marginBottom: '1rem',
  padding: '0.75rem',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  borderRadius: 'var(--omnispec-border-radius)',
  border: '1px solid var(--omnispec-border-color)',
  overflow: 'hidden',
})

const serverLabelStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
  display: 'block',
})

const serverRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const serverUrlStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-code)',
  overflowX: 'auto',
  whiteSpace: 'nowrap',
  minWidth: 0,
  maxWidth: '100%',
  display: 'block',
  scrollbarWidth: 'thin',
})

const serverSelectStyle = css({
  flex: 1,
  minWidth: 0,
  maxWidth: '100%',
  padding: '0.375rem 0.625rem',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-sm)',
  fontFamily: 'var(--omnispec-font-mono)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

const serverVariablesStyle = css({
  marginTop: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
})

const serverVarRowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
})

const serverVarLabelStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
  fontWeight: 600,
  minWidth: '80px',
})

const serverVarInputStyle = css({
  flex: 1,
  minWidth: 0,
  padding: '0.25rem 0.5rem',
  border: '1px solid var(--omnispec-input-border)',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-input-bg)',
  color: 'var(--omnispec-fg-primary)',
  fontSize: 'var(--omnispec-font-size-xs)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const serverVarDescStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-muted)',
})
