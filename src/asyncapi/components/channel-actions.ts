/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { AsyncApiChannel } from '@asyncapi/types/asyncapi.types'

/** Short action labels for the inline per-operation badges. */
export const actionLabels: Record<string, string> = {
  publish: 'PUB',
  subscribe: 'SUB',
  send: 'SEND',
  receive: 'RECV',
}

export const actionColors: Record<string, string> = {
  publish: 'var(--omnispec-color-publish)',
  subscribe: 'var(--omnispec-color-subscribe)',
  send: 'var(--omnispec-color-publish)',
  receive: 'var(--omnispec-color-subscribe)',
}

/**
 * The channel header badge for the `MethodBar`. A channel can carry more than
 * one action — notably a 2.x channel with both `publish` and `subscribe` — so
 * the header lists every distinct action (e.g. `PUB / SUB`) rather than only the
 * first operation's, which previously mislabelled such channels. A single-action
 * channel keeps that action's colour; a mixed channel uses the primary colour.
 */
export function channelActionBadge(channel: AsyncApiChannel): { label: string; color: string } {
  const distinct = [...new Set(channel.operations.map((op) => op.action))]
  const label = distinct.map((a) => actionLabels[a] ?? a.toUpperCase()).join(' / ')
  const color =
    distinct.length === 1
      ? actionColors[distinct[0]] ?? 'var(--omnispec-fg-muted)'
      : 'var(--omnispec-color-primary)'
  return { label, color }
}
