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
import { Icon } from '@core/components/common/Icon'
import { Button } from '@core/components/common/Button'
import type { SpecType } from '@core/types/spec-detection.types'

const specTypeLabels: Partial<Record<SpecType, string>> = {
  'graphql-sdl': 'GraphQL',
  'graphql-introspection': 'GraphQL',
  'soap-wsdl': 'SOAP/WSDL',
  'grpc-proto': 'gRPC/Protobuf',
}

interface UpgradePromptProps {
  specType: SpecType
  docsUrl?: string
  upgradeUrl?: string
}

export function UpgradePrompt({ specType, docsUrl, upgradeUrl }: UpgradePromptProps) {
  const label = specTypeLabels[specType] ?? specType

  return (
    <div className={containerStyle}>
      <div className={cardStyle}>
        <div className={iconWrapperStyle}>
          <Icon name="info" size="1.5rem" />
        </div>
        <h2 className={titleStyle}>{label} specification detected</h2>
        <p className={descStyle}>
          Rendering {label}, along with GraphQL, SOAP, and gRPC specifications,
          requires <code className={codeStyle}>@apiboost/omnispec-pro</code>.
        </p>
        <pre className={installStyle}>npm install @apiboost/omnispec-pro</pre>
        <div className={actionsStyle}>
          {docsUrl && (
            <a href={docsUrl} className={linkStyle} target="_blank" rel="noopener noreferrer">
              View documentation <Icon name="external-link" size="0.75rem" />
            </a>
          )}
          {upgradeUrl && (
            <Button variant="primary" href={upgradeUrl} target="_blank" rel="noopener noreferrer">
              Upgrade now <Icon name="external-link" size="0.75rem" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const containerStyle = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minHeight: '20rem',
  padding: '2rem',
})

const cardStyle = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  maxWidth: '32rem',
  textAlign: 'center',
  padding: '2.5rem 2rem',
  borderRadius: 'var(--omnispec-border-radius)',
  backgroundColor: 'var(--omnispec-bg-secondary)',
  boxShadow: '0 0.0625rem 0.25rem rgba(0, 0, 0, 0.08)',
})

const iconWrapperStyle = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '3rem',
  height: '3rem',
  borderRadius: '50%',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  color: 'var(--omnispec-color-info)',
})

const titleStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-font-size-lg)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
})

const descStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-secondary)',
  lineHeight: 1.6,
})

const codeStyle = css({
  backgroundColor: 'var(--omnispec-bg-code)',
  color: 'var(--omnispec-fg-code)',
  padding: '0.125rem 0.375rem',
  borderRadius: '0.25rem',
  fontSize: '0.875em',
  fontFamily: 'var(--omnispec-font-mono)',
})

const installStyle = css({
  margin: 0,
  padding: '0.625rem 1rem',
  backgroundColor: 'var(--omnispec-bg-code)',
  color: 'var(--omnispec-fg-primary)',
  borderRadius: 'var(--omnispec-border-radius)',
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-sm)',
  userSelect: 'all',
})

const actionsStyle = css({
  display: 'flex',
  gap: '1rem',
  marginTop: '0.5rem',
  flexWrap: 'wrap',
  justifyContent: 'center',
})

const linkStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-link)',
  textDecoration: 'none',
  fontWeight: 500,
  '&:hover': {
    textDecoration: 'underline',
  },
})
