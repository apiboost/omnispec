/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { css } from '../../styles/css'
import { Icon } from './Icon'

interface ErrorMessageProps {
  title?: string
  message?: string
}

export function ErrorMessage({
  title = 'Unable to load specification',
  message,
}: ErrorMessageProps) {
  return (
    <div className={containerStyle}>
      <div className={cardStyle}>
        <div className={iconWrapperStyle}>
          <Icon name="warning" size="1.5rem" />
        </div>
        <h2 className={titleStyle}>{title}</h2>
        {message && <p className={messageStyle}>{message}</p>}
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
  maxWidth: '28rem',
  textAlign: 'center',
})

const iconWrapperStyle = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '3rem',
  height: '3rem',
  borderRadius: '50%',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  color: 'var(--omnispec-color-warning)',
})

const titleStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-font-size-lg)',
  fontWeight: 600,
  color: 'var(--omnispec-fg-primary)',
})

const messageStyle = css({
  margin: 0,
  fontSize: 'var(--omnispec-font-size-sm)',
  color: 'var(--omnispec-fg-muted)',
  lineHeight: 1.5,
})
