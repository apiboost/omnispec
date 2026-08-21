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
import {
  DEFAULT_SCHEMA_STYLE,
  FREE_SCHEMA_STYLES,
  resolveSchemaStyle,
} from '@core/components/SchemaViewer/schema-style'

describe('resolveSchemaStyle — tier gating', () => {
  it('defaults to "lines" when nothing is requested', () => {
    expect(resolveSchemaStyle(undefined, false)).toBe('lines')
    expect(resolveSchemaStyle(undefined, true)).toBe('lines')
    expect(DEFAULT_SCHEMA_STYLE).toBe('lines')
  })

  it('allows the Free styles (lines, tokens, chain) without the advanced capability', () => {
    expect(resolveSchemaStyle('lines', false)).toBe('lines')
    expect(resolveSchemaStyle('tokens', false)).toBe('tokens')
    // `chain` is the reference-mode presentation, available to every tier.
    expect(resolveSchemaStyle('chain', false)).toBe('chain')
    expect([...FREE_SCHEMA_STYLES].sort()).toEqual(['chain', 'lines', 'tokens'])
  })

  it('allows "chain" with the advanced capability too', () => {
    expect(resolveSchemaStyle('chain', true)).toBe('chain')
  })

  it('falls back to "lines" for Pro-only styles when the capability is absent', () => {
    expect(resolveSchemaStyle('table', false)).toBe('lines')
    expect(resolveSchemaStyle('card', false)).toBe('lines')
  })

  it('allows every style once the advanced capability is present', () => {
    expect(resolveSchemaStyle('lines', true)).toBe('lines')
    expect(resolveSchemaStyle('tokens', true)).toBe('tokens')
    expect(resolveSchemaStyle('table', true)).toBe('table')
    expect(resolveSchemaStyle('card', true)).toBe('card')
  })

  it('falls back to "lines" for an unknown/invalid value', () => {
    // @ts-expect-error — exercising runtime resilience against bad input
    expect(resolveSchemaStyle('bogus', true)).toBe('lines')
    // @ts-expect-error — exercising runtime resilience against bad input
    expect(resolveSchemaStyle('bogus', false)).toBe('lines')
  })
})
