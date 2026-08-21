/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OpenApiSpec } from './OpenApiSpec'

describe('OpenApiSpec error state', () => {
  it('renders the themed error card when the spec fails to load', async () => {
    // A root-relative URL is unfetchable under jsdom/node, forcing the error state.
    render(<OpenApiSpec spec={'/missing-spec.json'} theme={{ base: 'light' }} />)
    expect(await screen.findByText('Failed to load specification')).toBeInTheDocument()
  })
})
