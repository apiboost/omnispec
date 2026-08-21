/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

export interface FetchSpecOptions {
  headers?: Record<string, string>
  timeout?: number
}

export async function fetchSpec(url: string, options?: FetchSpecOptions): Promise<string> {
  const controller = new AbortController()
  const timeoutId = options?.timeout
    ? setTimeout(() => controller.abort(), options.timeout)
    : undefined

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: options?.headers,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
