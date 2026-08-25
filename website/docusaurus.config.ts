import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'OmniSpec',
  // Tagline doubles as the site-wide default meta description (used on pages
  // without their own frontmatter description), so keep it keyword-rich.
  tagline:
    'The open-source React renderer for interactive OpenAPI, Swagger & AsyncAPI documentation',
  // Theme-aware favicon via two files: the light SVG is the default/fallback
  // (also covers browsers without prefers-color-scheme), the dark SVG overrides
  // when the browser chrome is dark. headTags hrefs are literal, so they include
  // the baseUrl (/omnispec/) prefix.
  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'icon', type: 'image/svg+xml', href: '/omnispec/img/favicon-light.svg' },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/omnispec/img/favicon-dark.svg',
        media: '(prefers-color-scheme: dark)',
      },
    },
  ],

  future: {
    v4: true,
  },

  url: 'https://apiboost.github.io',
  baseUrl: '/omnispec/',

  organizationName: 'apiboost',
  projectName: 'omnispec',

  // First-pass: existing docs contain cross-file links and raw-markdown constructs.
  // Warn (don't fail the build) until the full IA rewrite lands.
  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  markdown: {
    // Treat .md as CommonMark so inline `<omnispec-renderer>` etc. aren't parsed as JSX.
    format: 'md',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/apiboost/omnispec/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Default social-card image for og:image / twitter:image. Docusaurus resolves
    // this to an absolute URL (url + baseUrl) so pasted links render a real card.
    // Pages can override per-page with frontmatter `image`.
    image: 'img/og-image.png',
    // Site-wide SEO/social meta. Per-page frontmatter `description` overrides the
    // tagline-derived description; these add keywords and Open Graph/Twitter tags.
    metadata: [
      {
        name: 'keywords',
        content:
          'OmniSpec, OpenAPI, Swagger, AsyncAPI, API documentation, React API docs renderer, Try-It, code samples, Web Component, open source, Redoc and SwaggerUI alternative',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'Apiboost OmniSpec — open-source renderer for OpenAPI and AsyncAPI documentation',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      // The logo is a full lockup (icon + wordmark), so no separate title text.
      title: '',
      logo: {
        alt: 'Apiboost OmniSpec',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
        href: '/',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/demo',
          label: 'Live Demo',
          position: 'left',
        },
        {
          href: 'https://github.com/apiboost/omnispec',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=navbar&utm_campaign=pro',
          label: 'Pro',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Configuration', to: '/docs/configuration' },
            { label: 'API Reference', to: '/docs/api-reference' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/apiboost/omnispec' },
            { label: 'npm', href: 'https://www.npmjs.com/package/@apiboost/omnispec' },
          ],
        },
        {
          title: 'Apiboost',
          items: [
            { label: 'OmniSpec Pro', href: 'https://apiboost.com/omnispec?utm_source=omnispec&utm_medium=footer&utm_campaign=pro' },
            { label: 'Apiboost', href: 'https://apiboost.com?utm_source=omnispec&utm_medium=footer&utm_campaign=corporate' },
            { label: 'LinkedIn', href: 'https://www.linkedin.com/company/apiboost' },
            { label: 'Contact', href: 'https://apiboost.com/contact?utm_source=omnispec&utm_medium=footer&utm_campaign=contact' },
          ],
        },
      ],
      copyright: `Apiboost OmniSpec™ is an open-source multi-spec rendering component developed and maintained by Apiboost. © ${new Date().getFullYear()} Apiboost. All Rights Reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
