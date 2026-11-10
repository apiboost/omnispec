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
 * Isomorphic IP-address classification: no Node built-ins and no DOM-only
 * APIs (only the WHATWG `URL` parser, which exists in browsers and Node).
 * Shared by the browser-side `$ref` guard and the server-only proxy
 * (`src/server/ssrf-guard.ts` re-exports it), so there is one source of truth.
 */

/**
 * Every address range that must never be reached: loopback, private,
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

/** Strict dotted quad: four decimal octets 0-255, no leading zeros. */
const IPV4_DOTTED = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

/** Parses a strict dotted quad to an unsigned 32-bit number, or null. */
const parseIpv4 = (ip: string): number | null => {
  if (!IPV4_DOTTED.test(ip)) return null
  return ip.split('.').reduce((acc, octet) => ((acc << 8) | Number(octet)) >>> 0, 0)
}

/**
 * Canonicalizes an IPv6 literal (no brackets) via the URL parser, which
 * validates it and emits the compressed, lower-case, all-hex form (embedded
 * dotted IPv4 becomes two hextets). Returns null when it isn't valid IPv6.
 */
const canonicalIpv6 = (ip: string): string | null => {
  if (!ip.includes(':') || ip.includes('[') || ip.includes(']')) return null
  try {
    const host = new URL(`http://[${ip}]/`).hostname
    return host.slice(1, -1)
  } catch {
    return null
  }
}

/** Expands a canonical (all-hex, URL-normalized) IPv6 literal to 8 hextets. */
const hextetsOf = (canonical: string): number[] | null => {
  const halves = canonical.split('::')
  if (halves.length > 2) return null
  const toNums = (part: string) => (part === '' ? [] : part.split(':').map((h) => parseInt(h, 16)))
  const head = toNums(halves[0])
  const tail = halves.length === 2 ? toNums(halves[1]) : []
  const fill = 8 - head.length - tail.length
  if (halves.length === 1 ? fill !== 0 : fill < 0) return null
  const out = [...head, ...new Array<number>(fill).fill(0), ...tail]
  return out.length === 8 && out.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? out : null
}

/** Parses any valid IPv6 literal (no brackets) to 8 hextets, or null. */
const parseIpv6 = (ip: string): number[] | null => {
  const canonical = canonicalIpv6(ip)
  return canonical === null ? null : hextetsOf(canonical)
}

/** Returns 4 for a dotted-quad IPv4 literal, 6 for an IPv6 literal, else 0. */
const ipFamily = (ip: string): 0 | 4 | 6 => {
  if (parseIpv4(ip) !== null) return 4
  if (parseIpv6(ip) !== null) return 6
  return 0
}

const ipv4Mask = (prefix: number): number => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0)

const IPV4_NETS = IPV4_BLOCKED.map(([net, prefix]) => {
  const base = parseIpv4(net)
  if (base === null) throw new Error(`Invalid IPv4 network ${net}`)
  const mask = ipv4Mask(prefix)
  return { base: (base & mask) >>> 0, mask }
})

const IPV6_NETS = IPV6_BLOCKED.map(([net, prefix]) => {
  const base = parseIpv6(net)
  if (base === null) throw new Error(`Invalid IPv6 network ${net}`)
  return { base, prefix }
})

const inIpv4Blocked = (addr: number): boolean =>
  IPV4_NETS.some(({ base, mask }) => ((addr & mask) >>> 0) === base)

const inIpv6Net = (addr: number[], base: number[], prefix: number): boolean => {
  for (let i = 0; i < 8; i++) {
    const bits = Math.min(16, Math.max(0, prefix - 16 * i))
    if (bits === 0) return true
    const mask = (0xffff << (16 - bits)) & 0xffff
    if ((addr[i] & mask) !== (base[i] & mask)) return false
  }
  return true
}

const inIpv6Blocked = (addr: number[]): boolean =>
  IPV6_NETS.some(({ base, prefix }) => inIpv6Net(addr, base, prefix))

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
 * @returns True if the address must not be connected to.
 */
export const isBlockedAddress = (ip: string): boolean => {
  const v4 = parseIpv4(ip)
  if (v4 !== null) return inIpv4Blocked(v4)
  const canonical = canonicalIpv6(ip)
  const v6 = canonical === null ? null : hextetsOf(canonical)
  if (canonical !== null && v6 !== null) {
    // Check the embedded IPv4 of an IPv4-mapped address explicitly: ::ffff:0:0/96
    // is not itself in the blocklist, but it reaches the embedded IPv4 host.
    for (const form of [ip, canonical]) {
      const mapped = embeddedIpv4(form)
      const mappedNum = mapped === null ? null : parseIpv4(mapped)
      if (mappedNum !== null && inIpv4Blocked(mappedNum)) return true
    }
    return inIpv6Blocked(v6)
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
  const asHost = ipFamily(raw) === 6 ? `[${raw}]` : raw
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
  if (ipFamily(h) !== 0) return isBlockedAddress(h)
  return false
}
