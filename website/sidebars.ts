import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// Curated information architecture (progressive disclosure): evaluator →
// integrator → power user. Titles come from each doc's frontmatter.
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Introduction',
      collapsed: false,
      items: ['getting-started', 'concepts', 'free-vs-pro'],
    },
    {
      type: 'category',
      label: 'Integrations',
      items: [
        'integrations-overview',
        'integrations/docusaurus',
        'framework-integration',
        'web-component',
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
      label: 'Try-It & Backend',
      items: ['try-it', 'backend-integration'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'api-reference',
        'vendor-extensions',
        'external-refs',
        'migration',
        'troubleshooting',
      ],
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
