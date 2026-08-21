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
 * Shadow DOM style mirroring.
 *
 * `@emotion/css` injects styles into `document.head` via a singleton cache. To
 * make those styles apply inside a shadow root, we mirror every emotion style
 * element (and similar dynamically-injected style elements) from `document.head`
 * into the shadow root, and keep them in sync with a MutationObserver.
 *
 * This avoids refactoring all internal `css` calls to use a per-instance cache,
 * which would be a much larger change. The trade-off is a small amount of style
 * duplication; on most pages this is negligible because emotion's styles are
 * tiny.
 */

/**
 * Returns an array of style elements in `document.head` that look like they
 * were dynamically inserted by a CSS-in-JS library or by the renderer itself
 * (theme tokens). We use `data-emotion` (emotion) and any inline `<style>` with
 * omnispec tokens. The selectors are conservative and adjustable.
 */
function findInjectedStyles(): HTMLStyleElement[] {
  const styles: HTMLStyleElement[] = []
  const head = typeof document !== 'undefined' ? document.head : null
  if (!head) return styles

  // Emotion uses <style data-emotion="css ..."> elements.
  head.querySelectorAll<HTMLStyleElement>('style[data-emotion]').forEach((el) => {
    styles.push(el)
  })

  return styles
}

interface StyleMirrorOptions {
  /** Shadow root to mirror styles into. */
  shadow: ShadowRoot
}

/**
 * Sets up a style mirror that clones emotion-generated styles from
 * `document.head` into the given shadow root, and keeps the mirror in sync as
 * new styles are added or existing ones change.
 *
 * Returns a teardown function that removes the observer and the mirrored
 * styles.
 */
export function attachStyleMirror({ shadow }: StyleMirrorOptions): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {}
  }

  // Container in the shadow root that holds the mirrored <style> elements.
  // Putting them in a single container makes teardown trivial.
  const mirrorContainer = document.createElement('div')
  mirrorContainer.setAttribute('data-omnispec-style-mirror', '')
  shadow.insertBefore(mirrorContainer, shadow.firstChild)

  /** Map source style → cloned style in the shadow root. */
  const mirrored = new WeakMap<HTMLStyleElement, HTMLStyleElement>()

  const cloneStyle = (src: HTMLStyleElement): HTMLStyleElement => {
    const clone = document.createElement('style')
    // Copy attributes so emotion can still find/hydrate if it queries for them.
    for (const attr of Array.from(src.attributes)) {
      clone.setAttribute(attr.name, attr.value)
    }
    clone.textContent = src.textContent
    return clone
  }

  const adoptStyle = (src: HTMLStyleElement) => {
    if (mirrored.has(src)) return
    const clone = cloneStyle(src)
    mirrored.set(src, clone)
    mirrorContainer.appendChild(clone)
  }

  // Seed with any styles already in the document.
  for (const src of findInjectedStyles()) adoptStyle(src)

  // Watch for new emotion styles being inserted.
  const headObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLStyleElement && node.hasAttribute('data-emotion')) {
          adoptStyle(node)
        }
      }
    }
  })
  headObserver.observe(document.head, { childList: true })

  // Watch each tracked source for textContent changes. Emotion appends rules
  // to its existing <style> elements rather than creating new ones, so we
  // need a per-element observer.
  const contentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target
      // The mutation target for a <style>'s sheet manipulation is usually the
      // <style> element itself (childList) or a TextNode (characterData).
      let styleEl: HTMLStyleElement | null = null
      if (target instanceof HTMLStyleElement) {
        styleEl = target
      } else if (target.parentElement instanceof HTMLStyleElement) {
        styleEl = target.parentElement
      }
      if (styleEl && mirrored.has(styleEl)) {
        const clone = mirrored.get(styleEl)
        if (clone) clone.textContent = styleEl.textContent
      }
    }
  })

  // Observe content changes on every tracked style. We attach a single observer
  // to document.head with characterData/subtree to catch them all.
  contentObserver.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  // Emotion also calls `insertRule` directly on the CSSStyleSheet, which does
  // not trigger MutationObserver. To handle that case, poll once per animation
  // frame for the first few seconds after mount to pick up any late additions.
  // After that, observer coverage is sufficient for the renderer's lifetime.
  let frame = 0
  let stopped = false
  const startTime = performance.now()
  const refresh = () => {
    if (stopped) return
    for (const src of findInjectedStyles()) {
      adoptStyle(src)
      const clone = mirrored.get(src)
      if (clone && clone.textContent !== src.textContent) {
        clone.textContent = src.textContent
      }
    }
    // Stop polling after 5 seconds; observers handle the long tail.
    if (performance.now() - startTime < 5000) {
      frame = requestAnimationFrame(refresh)
    }
  }
  frame = requestAnimationFrame(refresh)

  return () => {
    stopped = true
    if (frame) cancelAnimationFrame(frame)
    headObserver.disconnect()
    contentObserver.disconnect()
    mirrorContainer.remove()
  }
}
