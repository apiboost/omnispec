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
import { resolveDownloadLink } from '@core/utils/resolve-download-link'

describe('resolveDownloadLink', () => {
  it('returns the spec URL when downloadLink is true and spec is a URL string', () => {
    expect(resolveDownloadLink(true, 'https://example.com/spec.yaml')).toBe('https://example.com/spec.yaml')
  })

  it('returns undefined when downloadLink is true but spec is an object (no URL)', () => {
    expect(resolveDownloadLink(true, { openapi: '3.0.0' })).toBeUndefined()
  })

  it('returns a custom URL string verbatim', () => {
    expect(resolveDownloadLink('/downloads/api.graphql', { some: 'object' })).toBe('/downloads/api.graphql')
  })

  it('returns undefined for false or undefined', () => {
    expect(resolveDownloadLink(false, 'https://example.com/spec.yaml')).toBeUndefined()
    expect(resolveDownloadLink(undefined, 'https://example.com/spec.yaml')).toBeUndefined()
  })
})
