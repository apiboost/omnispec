import type { ReactNode } from 'react'

/**
 * Shadows @theme/SearchMetadata to render nothing.
 *
 * The stock component injects Docusaurus "fingerprint" meta tags into every
 * page's <head> (docusaurus_version, docusaurus_tag, docusaurus_locale, and the
 * Algolia docsearch:* equivalents). Those tags exist solely to feed Algolia
 * DocSearch / third-party search crawlers. This site configures no such search,
 * so the tags are pure fingerprint noise — returning null removes them.
 *
 * If Algolia DocSearch is ever added, delete this file so the default component
 * (which the crawler relies on) is restored.
 */
export default function SearchMetadata(): ReactNode {
  return null
}
