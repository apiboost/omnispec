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
 * Allowlist-based HTML sanitizer for markdown-rendered spec content.
 *
 * Specs are third-party input — descriptions can carry HTML through markdown.
 * This strips script-capable elements and attributes while keeping the tags
 * marked produces for normal markdown (including GFM tables).
 */

const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'details', 'div', 'em',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li',
  'mark', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'summary',
  'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
])

const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'align', 'colspan', 'rowspan', 'lang', 'dir'])

const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/(?!\/))/i

function isSafeUrl(value: string): boolean {
  return SAFE_URL.test(value.trim()) || !/[:]/.test(value.split(/[?#]/)[0])
}

function cleanElement(el: Element): void {
  // Remove disallowed attributes (event handlers, style, unknown attrs).
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    if (!ALLOWED_ATTRS.has(name)) {
      el.removeAttribute(attr.name)
      continue
    }
    if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) {
      el.removeAttribute(attr.name)
    }
  }
  // External links open safely.
  if (el.tagName.toLowerCase() === 'a' && el.getAttribute('href')) {
    el.setAttribute('rel', 'noopener noreferrer')
  }
}

function walk(node: Element | DocumentFragment): void {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) {
      // Drop the element but keep its (sanitized) children for benign
      // unknown wrappers; script-capable elements are removed entirely.
      const dropEntirely = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base'].includes(tag)
      if (dropEntirely) {
        child.remove()
        continue
      }
      walk(child)
      child.replaceWith(...Array.from(child.childNodes))
      continue
    }
    cleanElement(child)
    walk(child)
  }
}

/**
 * Sanitizes an HTML string. In DOM environments uses a detached document via
 * DOMParser; in SSR (no DOMParser) falls back to a conservative regex strip —
 * the client re-sanitizes properly on hydration.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '')
      .replace(/<(script|style|iframe|object|embed|form|link|meta|base)[^>]*\/?>(<\/\1>)?/gi, '')
      .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
  }

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  walk(doc.body)
  return doc.body.innerHTML
}
