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
import { sanitizeHtml } from './sanitize-html'

describe('sanitizeHtml', () => {
  it('keeps normal markdown output', () => {
    const html = '<p>Hello <strong>world</strong> — see <a href="https://example.com">docs</a></p>'
    const out = sanitizeHtml(html)
    expect(out).toContain('<strong>world</strong>')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('keeps GFM tables and code blocks', () => {
    const html = '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><pre><code>x</code></pre>'
    const out = sanitizeHtml(html)
    expect(out).toContain('<table>')
    expect(out).toContain('<td>1</td>')
    expect(out).toContain('<code>x</code>')
  })

  it('removes script elements entirely', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert(1)</script>')
    expect(out).toContain('<p>ok</p>')
    expect(out).not.toContain('script')
    expect(out).not.toContain('alert')
  })

  it('strips event handler attributes', () => {
    const out = sanitizeHtml('<p onclick="alert(1)" onmouseover="x()">hi</p>')
    expect(out).toBe('<p>hi</p>')
  })

  it('strips javascript: URLs', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toContain('javascript:')
  })

  it('drops iframes and form controls', () => {
    const out = sanitizeHtml('<iframe src="https://evil.example"></iframe><input value="x"><p>keep</p>')
    expect(out).not.toContain('iframe')
    expect(out).not.toContain('input')
    expect(out).toContain('<p>keep</p>')
  })

  it('unwraps unknown-but-benign elements, keeping their content', () => {
    const out = sanitizeHtml('<section><p>content</p></section>')
    expect(out).not.toContain('<section>')
    expect(out).toContain('<p>content</p>')
  })

  it('strips style attributes', () => {
    const out = sanitizeHtml('<p style="position:fixed">hi</p>')
    expect(out).toBe('<p>hi</p>')
  })
})
