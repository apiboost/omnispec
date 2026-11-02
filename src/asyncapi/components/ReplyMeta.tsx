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
import type { AsyncApiOperation } from '@asyncapi/types/asyncapi.types'

/**
 * The reply channel + address rows of a 3.x request-reply operation, shared by
 * the compact (`ChannelDetail`) and reference (`ChannelReferenceDetail`) views so
 * both show identical reply metadata. The address covers both shapes the spec
 * produces: a fixed literal (`address.value`) and a dynamic runtime-expression
 * (`address.location`); both render, with an optional description.
 */
export function ReplyMeta({ reply }: { reply: NonNullable<AsyncApiOperation['reply']> }) {
  const hasAddress = reply.address && (reply.address.value || reply.address.location || reply.address.description)

  return (
    <>
      {reply.channelName && (
        <div className={rowStyle}>
          <span className={labelStyle}>channel</span>
          <code className={valueStyle}>{reply.channelName}</code>
        </div>
      )}
      {hasAddress && (
        <div className={rowStyle}>
          <span className={labelStyle}>address</span>
          {reply.address?.value && <code className={valueStyle}>{reply.address.value}</code>}
          {reply.address?.location && <code className={valueStyle}>{reply.address.location}</code>}
          {reply.address?.description && <span className={descStyle}>{reply.address.description}</span>}
        </div>
      )}
    </>
  )
}

const rowStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
  marginBottom: '0.5rem',
})

const labelStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  fontWeight: 700,
  color: 'var(--omnispec-fg-primary)',
  fontFamily: 'var(--omnispec-font-mono)',
})

const valueStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-code)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '1px 0.375rem',
  borderRadius: '0.1875rem',
})

const descStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
})
