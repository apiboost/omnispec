/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { BlockList, isIP } from 'node:net'

/**
 * Every address range the proxy must never connect to: loopback, private,
 * link-local, carrier-grade NAT, documentation, benchmarking, multicast,
 * reserved, and IPv6 transition prefixes that can embed one of those.
 * Sources: IANA IPv4/IPv6 Special-Purpose Address Registries.
 */
const IPV4_BLOCKED: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this network" (0.0.0.0 reaches localhost on Linux)
  ['10.0.0.0', 8], // RFC 1918
  ['100.64.0.0', 10], // carrier-grade NAT (RFC 6598)
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. cloud metadata 169.254.169.254
  ['172.16.0.0', 12], // RFC 1918
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // RFC 1918
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + limited broadcast 255.255.255.255
]

const IPV6_BLOCKED: Array<[string, number]> = [
  ['::', 96], // unspecified, loopback ::1, deprecated IPv4-compatible
  ['64:ff9b::', 96], // NAT64 well-known prefix (embeds IPv4)
  ['64:ff9b:1::', 48], // local-use NAT64
  ['100::', 64], // discard-only
  ['2001::', 23], // IETF protocol assignments (incl. Teredo 2001::/32)
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4 (embeds IPv4)
  ['fc00::', 7], // unique local, incl. AWS metadata fd00:ec2::254
  ['fe80::', 10], // link-local
  ['fec0::', 10], // deprecated site-local
  ['ff00::', 8], // multicast
]

const blockList = new BlockList()
for (const [net, prefix] of IPV4_BLOCKED) blockList.addSubnet(net, prefix, 'ipv4')
for (const [net, prefix] of IPV6_BLOCKED) blockList.addSubnet(net, prefix, 'ipv6')

const MAPPED_V4_DOTTED = /^::ffff:(?:0:)?(\d+\.\d+\.\d+\.\d+)$/i
const MAPPED_V4_HEX = /^::ffff:(?:0:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i

/** Extracts the IPv4 address embedded in an IPv4-mapped IPv6 address, if any. */
const embeddedIpv4 = (ip: string): string | null => {
  const dotted = ip.match(MAPPED_V4_DOTTED)
  if (dotted) return dotted[1]
  const hex = ip.match(MAPPED_V4_HEX)
  if (hex) {
    const hi = parseInt(hex[1], 16)
    const lo = parseInt(hex[2], 16)
    return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`
  }
  return null
}

/**
 * Checks whether a resolved IP address (IPv4 or IPv6 literal, no brackets)
 * is in a blocked range. Anything that isn't a valid IP literal is treated as
 * blocked, so callers fail closed.
 *
 * @param ip - The IP address to check.
 * @returns True if the proxy must not connect to it.
 */
export const isBlockedAddress = (ip: string): boolean => {
  const family = isIP(ip)
  if (family === 4) return blockList.check(ip, 'ipv4')
  if (family === 6) {
    // Check the embedded IPv4 explicitly rather than relying on BlockList's
    // mapped-address handling, which has varied across Node versions.
    const v4 = embeddedIpv4(ip)
    if (v4 !== null && blockList.check(v4, 'ipv4')) return true
    return blockList.check(ip, 'ipv6')
  }
  return true
}

/**
 * Canonicalizes a hostname the way the WHATWG URL parser does: lower-cased,
 * IPv4 shorthand (`2130706433`, `0177.0.0.1`, `0x7f.1`) expanded to a dotted
 * quad, IPv6 compressed. Brackets and a single trailing dot are removed.
 * Returns null when the input isn't a parseable host.
 */
export const normalizeHostname = (hostname: string): string | null => {
  const raw = hostname.trim()
  if (!raw) return null
  // A bare IPv6 literal needs brackets to parse as a URL host.
  const asHost = isIP(raw) === 6 ? `[${raw}]` : raw
  let parsed: string
  try {
    parsed = new URL(`http://${asHost}/`).hostname
  } catch {
    return null
  }
  return parsed.replace(/^\[|]$/g, '').replace(/\.$/, '')
}

/**
 * Checks if a hostname or IP address must be blocked *before* any DNS lookup:
 * IP literals in a blocked range (in any spelling the URL parser accepts),
 * and `localhost` / `*.localhost` (RFC 6761), with or without a trailing dot.
 * Unparseable input is blocked.
 *
 * Public hostnames return false here; their resolved addresses are checked
 * separately, at connect time, by the proxy's guarded DNS lookup.
 *
 * @param hostname - The hostname or IP to check.
 * @returns True if the address is private/reserved and should be blocked.
 */
export const isPrivateIp = (hostname: string): boolean => {
  const h = normalizeHostname(hostname)
  if (h === null) return true
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (isIP(h)) return isBlockedAddress(h)
  return false
}
