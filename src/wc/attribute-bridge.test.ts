/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  buildRendererProps,
  parseBooleanAttr,
  parseJsonAttr,
  readEnumAttr,
  resolveTheme,
} from './attribute-bridge'

const emptyAttrs = {
  specUrl: null,
  specProp: undefined,
  themeProp: undefined,
  themeBase: null,
  themeToggle: null,
  sidebarNavProp: undefined,
  displayMode: null,
  navigationMode: null,
  layout: null,
  sidebarPosition: null,
  tryItLayout: null,
  allowTryIt: null,
  interactiveOAuth: null,
  defaultExpandOperations: null,
  proxyUrl: null,
  downloadLink: null,
  docsUrl: null,
  upgradeUrl: null,
  serverUrl: null,
}

describe('parseBooleanAttr', () => {
  it('returns undefined when value is null', () => {
    expect(parseBooleanAttr(null)).toBeUndefined()
  })

  it('returns true for the empty string (bare attribute)', () => {
    expect(parseBooleanAttr('')).toBe(true)
  })

  it.each(['true', 'TRUE', '1', 'yes', 'on'])(
    'returns true for truthy string %s',
    (value) => {
      expect(parseBooleanAttr(value)).toBe(true)
    },
  )

  it.each(['false', 'FALSE', '0', 'off', 'OFF'])(
    'returns false for falsy string %s',
    (value) => {
      expect(parseBooleanAttr(value)).toBe(false)
    },
  )
})

describe('parseJsonAttr', () => {
  it('returns undefined when value is null', () => {
    expect(parseJsonAttr(null, 'theme')).toBeUndefined()
  })

  it('parses valid JSON', () => {
    const result = parseJsonAttr<{ base: string }>('{"base":"dark"}', 'theme')
    expect(result).toEqual({ base: 'dark' })
  })

  it('logs an error and returns undefined for invalid JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = parseJsonAttr('{not-json}', 'theme')
    expect(result).toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('readEnumAttr', () => {
  it('returns the value when in allow-list', () => {
    expect(readEnumAttr('compact', ['compact', 'reference'] as const)).toBe('compact')
  })

  it('returns undefined for null', () => {
    expect(readEnumAttr(null, ['compact', 'reference'] as const)).toBeUndefined()
  })

  it('returns undefined when value not in allow-list', () => {
    expect(readEnumAttr('huge', ['compact', 'reference'] as const)).toBeUndefined()
  })
})

describe('resolveTheme', () => {
  it('returns undefined when no theme info provided', () => {
    expect(resolveTheme(undefined, null, null)).toBeUndefined()
  })

  it('builds a config from the theme-base attribute alone', () => {
    expect(resolveTheme(undefined, 'dark', null)).toEqual({
      base: 'dark',
      themeToggle: undefined,
    })
  })

  it('lets the imperative theme property override the attribute base', () => {
    const result = resolveTheme(
      { base: 'auto', overrides: { '--omnispec-color-primary': '#000' } },
      'light',
      null,
    )
    expect(result?.base).toBe('auto')
    expect(result?.overrides).toEqual({ '--omnispec-color-primary': '#000' })
  })

  it('respects theme-toggle="false"', () => {
    const result = resolveTheme(undefined, 'auto', 'false')
    expect(result).toEqual({ base: 'auto', themeToggle: false })
  })
})

describe('buildRendererProps', () => {
  it('returns null when no spec is provided', () => {
    expect(buildRendererProps(emptyAttrs)).toBeNull()
  })

  it('uses spec-url attribute when set', () => {
    const result = buildRendererProps({
      ...emptyAttrs,
      specUrl: 'https://example.com/openapi.json',
    })
    expect(result?.spec).toBe('https://example.com/openapi.json')
  })

  it('imperative spec property wins over spec-url attribute', () => {
    const specObj = { openapi: '3.0.3', info: { title: 'X', version: '1' }, paths: {} }
    const result = buildRendererProps({
      ...emptyAttrs,
      specUrl: 'https://example.com/openapi.json',
      specProp: specObj,
    })
    expect(result?.spec).toBe(specObj)
  })

  it('maps all string-enum attributes', () => {
    const result = buildRendererProps({
      ...emptyAttrs,
      specUrl: '/openapi.json',
      displayMode: 'reference',
      navigationMode: 'segmented',
      layout: 'stacked',
      sidebarPosition: 'right',
      tryItLayout: 'panel',
    })
    expect(result).toMatchObject({
      displayMode: 'reference',
      navigationMode: 'segmented',
      layout: 'stacked',
      sidebarPosition: 'right',
      tryItLayout: 'panel',
    })
  })

  it('ignores invalid enum values', () => {
    const result = buildRendererProps({
      ...emptyAttrs,
      specUrl: '/openapi.json',
      displayMode: 'banana',
    })
    expect(result?.displayMode).toBeUndefined()
  })

  it('coerces boolean attributes', () => {
    const result = buildRendererProps({
      ...emptyAttrs,
      specUrl: '/openapi.json',
      allowTryIt: 'false',
      defaultExpandOperations: '',
    })
    expect(result?.allowTryIt).toBe(false)
    expect(result?.defaultExpandOperations).toBe(true)
  })

  it('maps interactive-oauth="false" to the interactiveOAuth opt-out, absent → undefined', () => {
    expect(
      buildRendererProps({ ...emptyAttrs, specUrl: '/x', interactiveOAuth: 'false' })?.interactiveOAuth,
    ).toBe(false)
    // Absent attribute leaves the prop undefined (defaults to interactive when Pro is present).
    expect(
      buildRendererProps({ ...emptyAttrs, specUrl: '/x' })?.interactiveOAuth,
    ).toBeUndefined()
  })

  it('treats download-link="true" as boolean true and other strings as URL', () => {
    expect(
      buildRendererProps({ ...emptyAttrs, specUrl: '/x', downloadLink: 'true' })?.downloadLink,
    ).toBe(true)
    expect(
      buildRendererProps({ ...emptyAttrs, specUrl: '/x', downloadLink: 'false' })?.downloadLink,
    ).toBe(false)
    expect(
      buildRendererProps({ ...emptyAttrs, specUrl: '/x', downloadLink: '/download/spec' })?.downloadLink,
    ).toBe('/download/spec')
  })

  it('uses the imperative sidebarNav property', () => {
    const navConfig = { items: [{ id: 'home', label: 'Home', href: '/' }] }
    const result = buildRendererProps({
      ...emptyAttrs,
      specUrl: '/x',
      sidebarNavProp: navConfig,
    })
    expect(result?.sidebarNav).toBe(navConfig)
  })

  it('passes proxy-url, docs-url, upgrade-url through', () => {
    const result = buildRendererProps({
      ...emptyAttrs,
      specUrl: '/x',
      proxyUrl: '/api/proxy',
      docsUrl: 'https://docs.example.com',
      upgradeUrl: 'https://upgrade.example.com',
    })
    expect(result?.proxyUrl).toBe('/api/proxy')
    expect(result?.docsUrl).toBe('https://docs.example.com')
    expect(result?.upgradeUrl).toBe('https://upgrade.example.com')
  })

  it('passes server-url through as serverUrl', () => {
    const result = buildRendererProps({
      ...emptyAttrs,
      specUrl: '/x',
      serverUrl: 'https://gateway.example.com/v1',
    })
    expect(result?.serverUrl).toBe('https://gateway.example.com/v1')
  })

  it('omits serverUrl when server-url attribute is absent', () => {
    const result = buildRendererProps({ ...emptyAttrs, specUrl: '/x' })
    expect(result?.serverUrl).toBeUndefined()
  })
})
