import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Qarar Platform Docs',
      description: 'The Open Standard & Engine for Business Rules AST, Evaluation, & Explainability',
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Interactive Studio',
          items: [
            { label: 'Live Playground', link: '/playground/' },
          ],
        },
        {
          label: 'Core Concepts',
          autogenerate: { directory: 'concepts' },
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Real-World Recipes',
          autogenerate: { directory: 'recipes' },
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
    react(),
  ],
});
