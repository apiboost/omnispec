import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'OmniSpec',
  tagline: 'Render OpenAPI & AsyncAPI documentation in React',
  favicon: 'img/favicon.ico',

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
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'OmniSpec',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/apiboost/omnispec',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.apiboost.com',
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
            {label: 'Getting Started', to: '/docs/getting-started'},
            {label: 'Configuration', to: '/docs/configuration'},
            {label: 'API Reference', to: '/docs/api-reference'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: 'https://github.com/apiboost/omnispec'},
            {label: 'npm', href: 'https://www.npmjs.com/package/@apiboost/omnispec'},
          ],
        },
        {
          title: 'Apiboost',
          items: [
            {label: 'OmniSpec Pro', href: 'https://www.apiboost.com'},
            {label: 'Contact', href: 'https://www.apiboost.com/contact'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Apiboost, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
