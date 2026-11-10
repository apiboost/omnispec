/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

// @vitest-environment node

import { describe, it, expect } from 'vitest'
import { isBlockedAddress, isPrivateIp } from './ssrf-guard'

/** Hostname exactly as the proxy sees it: WHATWG-parsed from the target URL. */
const hostOf = (url: string) => new URL(url).hostname

describe('isPrivateIp', () => {
  it.each([
    // Loopback in all its spellings.
    'http://127.0.0.1/',
    'http://127.1.2.3/',
    'http://localhost/',
    'http://localhost./',
    'http://LOCALHOST/',
    'http://api.localhost/',
    'http://[::1]/',
    'http://[::]/',
    'http://0.0.0.0/',
    'http://0/',
    // Numeric IPv4 forms the URL parser canonicalizes to 127.0.0.1.
    'http://2130706433/',
    'http://0177.0.0.1/',
    'http://0x7f.1/',
    'http://0x7f000001/',
    // IPv4-mapped / translated IPv6 (URL parser emits ::ffff:7f00:1).
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:169.254.169.254]/',
    'http://[::ffff:10.0.0.1]/',
    'http://[64:ff9b::7f00:1]/',
    // RFC 1918 + link-local + cloud metadata.
    'http://10.1.2.3/',
    'http://172.16.0.1/',
    'http://172.31.255.255/',
    'http://192.168.1.1/',
    'http://169.254.169.254/',
    'http://[fd00:ec2::254]/',
    // Other reserved ranges.
    'http://100.64.0.1/',
    'http://100.127.255.254/',
    'http://192.0.0.1/',
    'http://192.0.2.1/',
    'http://198.18.0.1/',
    'http://198.51.100.1/',
    'http://203.0.113.1/',
    'http://224.0.0.1/',
    'http://240.0.0.1/',
    'http://255.255.255.255/',
    'http://[fc00::1]/',
    'http://[fe80::1]/',
    'http://[fec0::1]/',
    'http://[ff02::1]/',
    'http://[2001:db8::1]/',
    'http://[2002:7f00:1::]/',
    'http://[2001::1]/',
    'http://[100::1]/',
  ])('blocks %s', (url) => {
    expect(isPrivateIp(hostOf(url))).toBe(true)
  })

  it.each([
    'https://api.example.com/',
    'https://example.com./',
    'http://8.8.8.8/',
    'http://172.32.0.1/',
    'http://100.128.0.1/',
    'http://[2606:4700:4700::1111]/',
  ])('allows public %s', (url) => {
    expect(isPrivateIp(hostOf(url))).toBe(false)
  })

  it('canonicalizes non-normalized input passed directly (not via URL)', () => {
    expect(isPrivateIp('2130706433')).toBe(true)
    expect(isPrivateIp('0x7f.1')).toBe(true)
    expect(isPrivateIp('[::ffff:127.0.0.1]')).toBe(true)
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIp('localhost.')).toBe(true)
  })
})

describe('isBlockedAddress', () => {
  it('checks resolved addresses of either family', () => {
    expect(isBlockedAddress('127.0.0.1')).toBe(true)
    expect(isBlockedAddress('::ffff:a9fe:a9fe')).toBe(true)
    expect(isBlockedAddress('93.184.216.34')).toBe(false)
    expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false)
  })

  it('fails closed on anything that is not an IP literal', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true)
    expect(isBlockedAddress('')).toBe(true)
  })
})
