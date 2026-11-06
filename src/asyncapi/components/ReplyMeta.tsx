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
export function ReplyMeta({
  reply,
  channelHref,
  onChannelNavigate,
}: {
  reply: NonNullable<AsyncApiOperation['reply']>
  /** Resolves a channel name to an in-page href (`#id`) so the reply channel links to its card. */
  channelHref?: (channelName: string) => string | undefined
  /** Navigates to the reply channel's card; used on click so it works even when the hash already matches. */
  onChannelNavigate?: (channelName: string) => void
}) {
  const hasAddress = reply.address && (reply.address.value || reply.address.location || reply.address.description)
  const replyHref = reply.channelName ? channelHref?.(reply.channelName) : undefined

  return (
    <>
      {reply.channelName && (
        <div className={rowStyle}>
          <span className={labelStyle}>channel</span>
          {replyHref ? (
            <a
              href={replyHref}
              className={linkStyle}
              onClick={
                onChannelNavigate
                  ? (e) => {
                    e.preventDefault()
                    onChannelNavigate(reply.channelName as string)
                  }
                  : undefined
              }
            >
              {reply.channelName}
            </a>
          ) : (
            <code className={valueStyle}>{reply.channelName}</code>
          )}
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
  padding: '0.0625rem 0.375rem',
  borderRadius: '0.1875rem',
})

const linkStyle = css({
  fontFamily: 'var(--omnispec-font-mono)',
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-color-primary)',
  backgroundColor: 'var(--omnispec-bg-tertiary)',
  padding: '0.0625rem 0.375rem',
  borderRadius: '0.1875rem',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
})

const descStyle = css({
  fontSize: 'var(--omnispec-font-size-xs)',
  color: 'var(--omnispec-fg-secondary)',
})
