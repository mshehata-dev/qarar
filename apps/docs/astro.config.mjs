import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

const site = process.env.DOCS_SITE || 'https://qarar.dev';
const base = process.env.DOCS_BASE !== undefined ? (process.env.DOCS_BASE || undefined) : undefined;

function subpathPrefixPlugin() {
  return {
    name: 'subpath-prefix-plugin',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const rawBase = process.env.DOCS_BASE;
        if (!rawBase || rawBase === '/' || rawBase === '') return;
        const cleanBase = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
        const normalizedBase = cleanBase.endsWith('/') ? cleanBase.slice(0, -1) : cleanBase;
        const subpath = normalizedBase.slice(1);

        const targetDir = typeof dir === 'string' ? dir : fileURLToPath(dir);

        function walk(currentDir) {
          let results = [];
          if (!fs.existsSync(currentDir)) return results;
          const list = fs.readdirSync(currentDir);
          for (const item of list) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
              results = results.concat(walk(fullPath));
            } else if (fullPath.endsWith('.html')) {
              results.push(fullPath);
            }
          }
          return results;
        }

        const files = walk(targetDir);

        for (const file of files) {
          let content = fs.readFileSync(file, 'utf8');
          let modified = false;

          const hrefRegex = new RegExp(`href="\\/(?!(${subpath}\\/|_astro\\/|favicon\\.svg|sitemap|#))([^"]*)"`, 'g');
          if (hrefRegex.test(content)) {
            content = content.replace(hrefRegex, `href="${normalizedBase}/$2"`);
            modified = true;
          }

          const metaRegex = new RegExp(`content="0;url=\\/(?!${subpath}\\/)([^"]*)"`, 'g');
          if (metaRegex.test(content)) {
            content = content.replace(metaRegex, `content="0;url=${normalizedBase}/$1"`);
            modified = true;
          }

          if (modified) {
            fs.writeFileSync(file, content, 'utf8');
          }
        }
      },
    },
  };
}

export default defineConfig({
  site,
  base,
  redirects: {
    '/theme': '/playground/',
    '/getting-started/': '/getting-started/quickstart/',
    '/getting-started/introduction/': '/getting-started/quickstart/',
    '/getting-started/installation/': '/getting-started/quickstart/',
    '/concepts/ast-specification/': '/concepts/engine-and-evaluation/',
    '/concepts/explainability/': '/concepts/engine-and-evaluation/',
    '/concepts/performance-optimization/': '/concepts/benchmarks-and-performance/',
    '/api/fluent-builder/': '/api/sdk/',
    '/api/engine-and-check/': '/api/sdk/',
    '/api/database-compilers/': '/api/sdk/',
    '/api/schema-validation/': '/api/sdk/',
    '/api/benchmark-cli/': '/concepts/benchmarks-and-performance/',
    '/recipes/': '/recipes/express-fastify/',
    '/recipes/framework-guards/': '/recipes/express-fastify/',
    '/recipes/business-patterns/': '/recipes/ecommerce-discounts/',
    '/recipes/express-middleware/': '/recipes/express-fastify/',
    '/recipes/nest-js-guard/': '/recipes/nestjs-guard/',
    '/recipes/dynamic-db-rules/': '/recipes/database-storage/',
    '/recipes/saas-entitlements/': '/recipes/database-storage/',
    '/recipes/airline-loyalty-upgrade/': '/recipes/ecommerce-discounts/',
    '/recipes/healthcare-hipaa-consent/': '/recipes/fintech-fraud-gate/',
  },
  integrations: [
    starlight({
      title: 'Qarar',
      logo: {
        src: './src/assets/logo.svg',
        alt: 'Qarar Logo',
        replacesTitle: false,
      },
      description: 'Zero-deploy dynamic business rules in JSON with in-memory evaluation and database pushdown.',
      social: {
        github: 'https://github.com/mshehata-dev/qarar',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Quickstart & Setup', link: '/getting-started/quickstart/' },
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
            { label: 'Rule Engine & Evaluation', link: '/concepts/engine-and-evaluation/' },
            { label: 'Decision Tables & Switch Cases', link: '/concepts/decision-tables-switch-cases/' },
            { label: 'Database Query Pushdown', link: '/concepts/database-pushdown/' },
            { label: 'Benchmarks & Performance', link: '/concepts/benchmarks-and-performance/' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: '@qarar/sdk Reference', link: '/api/sdk/' },
            { label: 'React Visual Builder', link: '/api/react-builder/' },
          ],
        },
        {
          label: 'Production Recipes',
          items: [
            { label: 'Express & Fastify Middleware', link: '/recipes/express-fastify/' },
            { label: 'Next.js Server & Client', link: '/recipes/nextjs-app-router/' },
            { label: 'NestJS Guards & Decorators', link: '/recipes/nestjs-guard/' },
            { label: 'Database Storage & Redis Cache', link: '/recipes/database-storage/' },
            { label: 'E-Commerce Pricing Matrix', link: '/recipes/ecommerce-discounts/' },
            { label: 'FinTech Fraud & Risk Gates', link: '/recipes/fintech-fraud-gate/' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
    react(),
    subpathPrefixPlugin(),
  ],
  vite: {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    ssr: {
      noExternal: ['@qarar/react-builder'],
    },
  },
});
