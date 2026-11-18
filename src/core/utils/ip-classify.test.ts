/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { isBlockedAddress, isPrivateIp, normalizeHostname } from './ip-classify'
import * as serverGuard from '../../server/ssrf-guard'

describe('ip-classify (isomorphic, jsdom)', () => {
  it('runs in a browser-like environment', () => {
    expect(typeof window).toBe('object')
  })

  it.each([
    '127.0.0.1',
    '2130706433',
    '0x7f.1',
    'localhost.',
    '[::1]',
    '::ffff:127.0.0.1',
    '[::ffff:a9fe:a9fe]',
    '100.64.0.1',
    'fd00:ec2::254',
    'fe80::1',
    '64:ff9b::a00:1',
    '2002:a00:1::',
    '2001::1',
  ])('blocks %s', (host) => {
    expect(isPrivateIp(host)).toBe(true)
  })

  it.each(['api.example.com', '8.8.8.8', '172.32.0.1', '2606:4700:4700::1111'])('allows %s', (host) => {
    expect(isPrivateIp(host)).toBe(false)
  })

  it('matches CIDR boundaries exactly', () => {
    expect(isBlockedAddress('100.63.255.255')).toBe(false)
    expect(isBlockedAddress('100.64.0.0')).toBe(true)
    expect(isBlockedAddress('100.127.255.255')).toBe(true)
    expect(isBlockedAddress('100.128.0.0')).toBe(false)
    expect(isBlockedAddress('fbff:ffff::1')).toBe(false)
    expect(isBlockedAddress('fc00::')).toBe(true)
    expect(isBlockedAddress('fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true)
    expect(isBlockedAddress('2001:1ff::1')).toBe(true)
    expect(isBlockedAddress('2001:200::1')).toBe(false)
  })

  it('fails closed on non-canonical or invalid literals', () => {
    expect(isBlockedAddress('01.2.3.4')).toBe(true)
    expect(isBlockedAddress('256.0.0.1')).toBe(true)
    expect(isBlockedAddress('1:2:3')).toBe(true)
    expect(isBlockedAddress('[::1]')).toBe(true)
  })

  it('normalizes hostnames like the URL parser', () => {
    expect(normalizeHostname('0177.0.0.1')).toBe('127.0.0.1')
    expect(normalizeHostname('::FFFF:127.0.0.1')).toBe('::ffff:7f00:1')
    expect(normalizeHostname('Example.COM.')).toBe('example.com')
    expect(normalizeHostname('   ')).toBeNull()
  })

  it('is the same implementation the server guard re-exports', () => {
    expect(serverGuard.isPrivateIp).toBe(isPrivateIp)
    expect(serverGuard.isBlockedAddress).toBe(isBlockedAddress)
    expect(serverGuard.normalizeHostname).toBe(normalizeHostname)
  })
})
