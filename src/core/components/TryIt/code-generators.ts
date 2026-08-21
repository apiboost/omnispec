/**
 * This source file is part of the Apiboost(R) OmniSpec Core.
 *
 * Copyright (c) Apiboost, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * See LICENSE.md and LICENSING.md in the project root for license information.
 */

import type { TryItRequest } from '@core/types/try-it.types'

function buildUrl(request: TryItRequest, serverUrl: string): string {
  let url = serverUrl + request.url
  for (const [key, value] of Object.entries(request.pathParams)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value))
  }
  const queryEntries = Object.entries(request.queryParams)
  if (queryEntries.length > 0) {
    const params = new URLSearchParams()
    for (const [key, value] of queryEntries) {
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, v)
      } else {
        params.set(key, value)
      }
    }
    url += `?${params.toString()}`
  }
  return url
}

export function generateJavaScript(request: TryItRequest, serverUrl: string): string {
  const url = buildUrl(request, serverUrl)
  const method = request.method.toUpperCase()
  const headers = Object.entries(request.headers)
  const hasBody = request.body && typeof request.body === 'string'

  const lines: string[] = []
  lines.push(`const response = await fetch('${url}', {`)
  lines.push(`  method: '${method}',`)

  if (headers.length > 0) {
    lines.push('  headers: {')
    for (const [key, value] of headers) {
      lines.push(`    '${key}': '${value}',`)
    }
    lines.push('  },')
  }

  if (hasBody) {
    lines.push(`  body: JSON.stringify(${request.body}),`)
  }

  lines.push('})')
  lines.push('')
  lines.push('const data = await response.json()')
  lines.push('console.log(data)')

  return lines.join('\n')
}

export function generatePython(request: TryItRequest, serverUrl: string): string {
  const url = buildUrl(request, serverUrl)
  const method = request.method.toLowerCase()
  const headers = Object.entries(request.headers)
  const hasBody = request.body && typeof request.body === 'string'

  const lines: string[] = []
  lines.push('import requests')
  lines.push('')

  if (headers.length > 0) {
    lines.push('headers = {')
    for (const [key, value] of headers) {
      lines.push(`    '${key}': '${value}',`)
    }
    lines.push('}')
    lines.push('')
  }

  if (hasBody) {
    lines.push(`payload = ${request.body}`)
    lines.push('')
  }

  const args: string[] = [`'${url}'`]
  if (headers.length > 0) args.push('headers=headers')
  if (hasBody) args.push('json=payload')

  lines.push(`response = requests.${method}(${args.join(', ')})`)
  lines.push('print(response.json())')

  return lines.join('\n')
}

export function generateGo(request: TryItRequest, serverUrl: string): string {
  const url = buildUrl(request, serverUrl)
  const method = request.method.toUpperCase()
  const headers = Object.entries(request.headers)
  const hasBody = request.body && typeof request.body === 'string'

  const lines: string[] = []
  lines.push('package main')
  lines.push('')
  lines.push('import (')
  lines.push('\t"fmt"')
  lines.push('\t"io"')
  lines.push('\t"net/http"')
  if (hasBody) lines.push('\t"strings"')
  lines.push(')')
  lines.push('')
  lines.push('func main() {')

  if (hasBody) {
    lines.push(`\tbody := strings.NewReader(\`${request.body}\`)`)
    lines.push(`\treq, err := http.NewRequest("${method}", "${url}", body)`)
  } else {
    lines.push(`\treq, err := http.NewRequest("${method}", "${url}", nil)`)
  }
  lines.push('\tif err != nil {')
  lines.push('\t\tpanic(err)')
  lines.push('\t}')

  for (const [key, value] of headers) {
    lines.push(`\treq.Header.Set("${key}", "${value}")`)
  }

  lines.push('')
  lines.push('\tresp, err := http.DefaultClient.Do(req)')
  lines.push('\tif err != nil {')
  lines.push('\t\tpanic(err)')
  lines.push('\t}')
  lines.push('\tdefer resp.Body.Close()')
  lines.push('')
  lines.push('\tresBody, _ := io.ReadAll(resp.Body)')
  lines.push('\tfmt.Println(string(resBody))')
  lines.push('}')

  return lines.join('\n')
}

export function generateJava(request: TryItRequest, serverUrl: string): string {
  const url = buildUrl(request, serverUrl)
  const method = request.method.toUpperCase()
  const headers = Object.entries(request.headers)
  const hasBody = request.body && typeof request.body === 'string'

  const lines: string[] = []
  lines.push('import java.net.URI;')
  lines.push('import java.net.http.HttpClient;')
  lines.push('import java.net.http.HttpRequest;')
  lines.push('import java.net.http.HttpResponse;')
  lines.push('')
  lines.push('HttpClient client = HttpClient.newHttpClient();')

  if (hasBody) {
    lines.push('')
    lines.push('String body = """')
    lines.push(`        ${request.body}""";`)
  }

  lines.push('')
  lines.push('HttpRequest request = HttpRequest.newBuilder()')
  lines.push(`    .uri(URI.create("${url}"))`)

  if (hasBody) {
    lines.push(`    .method("${method}", HttpRequest.BodyPublishers.ofString(body))`)
  } else if (method !== 'GET') {
    lines.push(`    .method("${method}", HttpRequest.BodyPublishers.noBody())`)
  }

  for (const [key, value] of headers) {
    lines.push(`    .header("${key}", "${value}")`)
  }

  lines.push('    .build();')
  lines.push('')
  lines.push('HttpResponse<String> response = client.send(')
  lines.push('    request, HttpResponse.BodyHandlers.ofString());')
  lines.push('System.out.println(response.body());')

  return lines.join('\n')
}

export function generateCSharp(request: TryItRequest, serverUrl: string): string {
  const url = buildUrl(request, serverUrl)
  const method = request.method.toUpperCase()
  const headers = Object.entries(request.headers)
  const hasBody = request.body && typeof request.body === 'string'
  const contentType = request.headers['Content-Type'] ?? 'application/json'

  const lines: string[] = []
  lines.push('using var client = new HttpClient();')
  lines.push('')

  if (hasBody) {
    lines.push('var content = new StringContent(')
    lines.push(`    @"${(request.body as string).replace(/"/g, '""')}",`)
    lines.push('    System.Text.Encoding.UTF8,')
    lines.push(`    "${contentType}");`)
    lines.push('')
  }

  const nonContentHeaders = headers.filter(([k]) => k !== 'Content-Type')
  for (const [key, value] of nonContentHeaders) {
    lines.push(`client.DefaultRequestHeaders.Add("${key}", "${value}");`)
  }
  if (nonContentHeaders.length > 0) lines.push('')

  const methodMap: Record<string, string> = {
    GET: 'GetAsync',
    POST: 'PostAsync',
    PUT: 'PutAsync',
    DELETE: 'DeleteAsync',
    PATCH: 'PatchAsync',
  }

  const asyncMethod = methodMap[method] ?? 'SendAsync'

  if (hasBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    lines.push(`var response = await client.${asyncMethod}("${url}", content);`)
  } else if (method === 'GET' || method === 'DELETE') {
    lines.push(`var response = await client.${asyncMethod}("${url}");`)
  } else {
    lines.push(`var request = new HttpRequestMessage(HttpMethod.${method.charAt(0) + method.slice(1).toLowerCase()}, "${url}");`)
    if (hasBody) lines.push('request.Content = content;')
    lines.push('var response = await client.SendAsync(request);')
  }

  lines.push('var body = await response.Content.ReadAsStringAsync();')
  lines.push('Console.WriteLine(body);')

  return lines.join('\n')
}

export type CodeLanguageId = 'curl' | 'javascript' | 'python' | 'go' | 'java' | 'csharp'

export interface CodeLanguageOption {
  id: CodeLanguageId
  label: string
  prismLanguage: string
}

export const CODE_LANGUAGES: CodeLanguageOption[] = [
  { id: 'curl', label: 'cURL', prismLanguage: 'bash' },
  { id: 'javascript', label: 'JavaScript', prismLanguage: 'javascript' },
  { id: 'python', label: 'Python', prismLanguage: 'python' },
  { id: 'go', label: 'Go', prismLanguage: 'go' },
  { id: 'java', label: 'Java', prismLanguage: 'java' },
  { id: 'csharp', label: 'C#', prismLanguage: 'csharp' },
]
