/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

/**
 * Checks if a hostname or IP address is in a private/reserved range.
 *
 * Blocks RFC 1918 private ranges, loopback, link-local, and IPv6
 * equivalents to prevent SSRF attacks through the proxy.
 *
 * @param hostname - The hostname or IP to check.
 * @returns True if the address is private/reserved and should be blocked.
 */
export const isPrivateIp = (hostname: string): boolean => {
  // Normalize — strip IPv6 brackets.
  const h = hostname.replace(/^\[|]$/g, '')

  // IPv4 loopback.
  if (h === 'localhost' || h.startsWith('127.')) {
    return true
  }

  // IPv4 private ranges (RFC 1918).
  if (h.startsWith('10.')) return true
  if (h.startsWith('192.168.')) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true

  // IPv4 link-local.
  if (h.startsWith('169.254.')) return true

  // IPv4 special: 0.0.0.0, broadcast.
  if (h === '0.0.0.0' || h === '255.255.255.255') return true

  // IPv6 loopback and private.
  const lower = h.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // Unique local (fc00::/7)
  if (lower.startsWith('fe80')) return true // Link-local

  // IPv4-mapped IPv6 (::ffff:10.0.0.1).
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4Mapped) {
    return isPrivateIp(v4Mapped[1])
  }

  return false
}
