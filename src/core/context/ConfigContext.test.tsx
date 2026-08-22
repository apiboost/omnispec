/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { afterEach, describe, it, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ConfigProvider, useConfig } from '@core/context/ConfigContext'

function Probe() {
  const { schemaStyle } = useConfig()
  return <span data-testid="style">{schemaStyle}</span>
}

describe('ConfigContext — schemaStyle', () => {
  afterEach(cleanup)

  it('defaults schemaStyle to "lines"', () => {
    const { getByTestId } = render(
      <ConfigProvider config={{}}>
        <Probe />
      </ConfigProvider>,
    )
    expect(getByTestId('style').textContent).toBe('lines')
  })

  it('carries an already-resolved schemaStyle through to consumers', () => {
    const { getByTestId } = render(
      <ConfigProvider config={{ schemaStyle: 'card' }}>
        <Probe />
      </ConfigProvider>,
    )
    expect(getByTestId('style').textContent).toBe('card')
  })
})

function InteractiveProbe() {
  const { interactiveOAuth, interactiveAuth } = useConfig()
  return (
    <span data-testid="interactive">
      {String(interactiveOAuth)}:{interactiveAuth?.oauth2 ? 'registered' : 'none'}
    </span>
  )
}

describe('ConfigContext — interactive auth', () => {
  afterEach(cleanup)

  it('defaults interactiveOAuth to true and interactiveAuth to undefined', () => {
    const { getByTestId } = render(
      <ConfigProvider config={{}}>
        <InteractiveProbe />
      </ConfigProvider>,
    )
    expect(getByTestId('interactive').textContent).toBe('true:none')
  })

  it('carries the consumer opt-out and a Pro-supplied interactiveAuth registry', () => {
    const Stub = () => null
    const { getByTestId } = render(
      <ConfigProvider config={{ interactiveOAuth: false, interactiveAuth: { oauth2: Stub } }}>
        <InteractiveProbe />
      </ConfigProvider>,
    )
    expect(getByTestId('interactive').textContent).toBe('false:registered')
  })
})
