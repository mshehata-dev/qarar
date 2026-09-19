import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  redirects: {
    '/theme': '/playground/',
  },
  integrations: [
    starlight({
      title: 'Qarar Platform Docs',
      description: 'The Open Standard & High-Throughput Engine for Dynamic Business Rules AST, Evaluation, & Explainability',
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction & Architecture', link: '/getting-started/introduction/' },
            { label: 'Installation', link: '/getting-started/installation/' },
            { label: 'Quickstart (5 Minutes)', link: '/getting-started/quickstart/' },
          ],
        },
        {
          label: 'Interactive Studio',
          items: [
            { label: 'Live Playground', link: '/playground/' },
          ],
        },
        {
          label: 'Core Concepts',
          items: [
            { label: 'AST Specification', link: '/concepts/ast-specification/' },
            { label: 'Rule Engine & Evaluation', link: '/concepts/engine-and-evaluation/' },
            { label: 'Explainability & Traces', link: '/concepts/explainability/' },
            { label: 'Decision Tables & Switch Cases', link: '/concepts/decision-tables-switch-cases/' },
            { label: 'Database Query Pushdown', link: '/concepts/database-pushdown/' },
            { label: 'Performance & Benchmarks', link: '/concepts/performance-optimization/' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: '@qarar/sdk (Core)', link: '/api/sdk/' },
            { label: 'Fluent Rule Builder', link: '/api/fluent-builder/' },
            { label: 'Engine & checkRule', link: '/api/engine-and-check/' },
            { label: 'SQL & Mongo Compilers', link: '/api/database-compilers/' },
            { label: 'React RuleBuilder UI', link: '/api/react-builder/' },
            { label: 'Zod Schema Validation', link: '/api/schema-validation/' },
            { label: 'Benchmark CLI Tool', link: '/api/benchmark-cli/' },
          ],
        },
        {
          label: 'Production Recipes',
          items: [
            { label: 'Dynamic Database Rules', link: '/recipes/dynamic-db-rules/' },
            { label: 'E-Commerce Discounts', link: '/recipes/ecommerce-discounts/' },
            { label: 'FinTech Fraud Shield', link: '/recipes/fintech-fraud-gate/' },
            { label: 'Healthcare HIPAA Consent', link: '/recipes/healthcare-hipaa-consent/' },
            { label: 'SaaS Feature Entitlements', link: '/recipes/saas-entitlements/' },
            { label: 'Express Middleware Guard', link: '/recipes/express-middleware/' },
            { label: 'Next.js App Router Guard', link: '/recipes/nextjs-app-router/' },
            { label: 'NestJS Auth Guard', link: '/recipes/nest-js-guard/' },
            { label: 'Airline Loyalty Upgrade', link: '/recipes/airline-loyalty-upgrade/' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
    react(),
  ],
});
