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

interface ProtocolBadgeProps {
  protocol: string
  version?: string
}

const protocolColors: Record<string, string> = {
  kafka: '#231F20',
  'kafka-secure': '#231F20',
  mqtt: '#660066',
  'mqtt5': '#660066',
  amqp: '#FF6600',
  'amqp1': '#FF6600',
  ws: '#4A90D9',
  wss: '#4A90D9',
  http: 'var(--omnispec-color-get)',
  https: 'var(--omnispec-color-get)',
  nats: '#27AAE1',
  redis: '#DC382D',
  sns: '#FF9900',
  sqs: '#FF9900',
  stomp: '#6DB33F',
  mercure: '#1D1D1D',
}

const badgeBase = css({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 700,
  fontFamily: 'var(--omnispec-font-mono)',
  color: '#ffffff',
  letterSpacing: '0.5px',
})

const versionStyle = css({
  fontWeight: 400,
  opacity: 0.8,
})

export function ProtocolBadge({ protocol, version }: ProtocolBadgeProps) {
  const color = protocolColors[protocol.toLowerCase()] ?? 'var(--omnispec-fg-muted)'

  return (
    <span className={cx(badgeBase, css({ backgroundColor: color }))}>
      {protocol.toUpperCase()}
      {version && <span className={versionStyle}> {version}</span>}
    </span>
  )
}
