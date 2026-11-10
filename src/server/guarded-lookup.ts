/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import { lookup as dnsLookup } from 'node:dns'
import type { LookupAddress, LookupOptions } from 'node:dns'
import { isBlockedAddress } from './ssrf-guard'

/** A resolved address, as returned by `dns.lookup(host, { all: true })`. */
export interface ResolvedAddress {
  address: string
  family: number
}

/**
 * Resolves a hostname to every address it maps to. Defaults to the OS
 * resolver (`dns.lookup` with `all: true`). Supply your own to use a custom
 * DNS client; every address it returns is still validated.
 */
export type ProxyDnsLookup = (hostname: string) => Promise<ResolvedAddress[]>

/** Thrown when a hostname resolves to an address the proxy must not reach. */
export class SsrfBlockedError extends Error {
  readonly code = 'ERR_SSRF_BLOCKED'
  constructor(hostname: string, address: string) {
    super(`Refusing to connect to ${hostname}: it resolves to a private/internal address (${address})`)
    this.name = 'SsrfBlockedError'
  }
}

export const defaultDnsLookup: ProxyDnsLookup = (hostname) =>
  new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) reject(err)
      else resolve(addresses)
    })
  })

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void

/**
 * Builds a `net`/`http` compatible `lookup` function that resolves the
 * hostname once, rejects the connection if **any** resolved address is
 * blocked, and hands the socket exactly the validated address(es) to
 * connect to. Validation and connection therefore use the same answer, so a
 * DNS rebind between "check" and "connect" cannot redirect the socket.
 *
 * TLS SNI and the `Host` header are unaffected: they come from the request's
 * hostname, not from the address the socket connects to.
 */
export const createGuardedLookup = (resolve: ProxyDnsLookup = defaultDnsLookup) =>
  (hostname: string, options: LookupOptions | number | undefined, callback: LookupCallback): void => {
    const opts: LookupOptions = typeof options === 'object' && options !== null ? options : {}
    resolve(hostname)
      .then((resolved) => {
        if (resolved.length === 0) {
          const err: NodeJS.ErrnoException = new Error(`getaddrinfo ENOTFOUND ${hostname}`)
          err.code = 'ENOTFOUND'
          callback(err, [])
          return
        }
        const blocked = resolved.find((r) => isBlockedAddress(r.address))
        if (blocked) {
          callback(new SsrfBlockedError(hostname, blocked.address), [])
          return
        }
        const wanted = opts.family === 4 || opts.family === 6 ? opts.family : 0
        const candidates = wanted ? resolved.filter((r) => r.family === wanted) : resolved
        if (opts.all) {
          callback(null, candidates.map((r) => ({ address: r.address, family: r.family })))
          return
        }
        const first = candidates[0]
        if (!first) {
          const err: NodeJS.ErrnoException = new Error(`getaddrinfo ENOTFOUND ${hostname}`)
          err.code = 'ENOTFOUND'
          callback(err, [])
          return
        }
        callback(null, first.address, first.family)
      })
      .catch((err: NodeJS.ErrnoException) => callback(err, []))
  }
