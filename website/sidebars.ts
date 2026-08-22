import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// Curated information architecture (progressive disclosure): evaluator →
// integrator → power user. Titles come from each doc's frontmatter.
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['getting-started', 'free-vs-pro'],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'framework-integration',
        'web-component',
        'try-it',
        'backend-integration',
        'migration',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'configuration',
        'theming',
        'template_customization/sidebar',
        'template_customization/slots',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['api-reference', 'vendor-extensions', 'external-refs', 'troubleshooting'],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: ['security'],
    },
    {
      type: 'category',
      label: 'Pro',
      items: ['grpc-support'],
    },
  ],
};

export default sidebars;
