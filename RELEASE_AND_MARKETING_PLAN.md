# Qarar — Master Release, Deployment & Community Launch Plan

> **Objective:** End-to-end execution blueprint from codebase pre-release hygiene to public npm release, automated docs deployment on `qarar.dev`, AI agent indexing (`llms.txt`), technical articles, and developer community marketing.
> **Target Version:** `v0.1.0` (Milestone 1 Beta)  
> **Status:** Ready for Execution  

---

## Architecture of the Plan

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Package Hygiene & Manifest Audit                                         │
│   • Whitelist dist/ in spec, engine-js, explainability                           │
│   • Set @qarar/benchmark to private: true                                        │
│   • Add README.md files for all published npm packages                           │
└────────────────────────┬─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────────────────────┐
│ PHASE 2: Docs Upgrades, Custom Domain & AI Indexing                              │
│   • Add llms.txt & llms-full.txt for Cursor / Claude Code / ChatGPT indexing     │
│   • Add AI Agents & LLM Function Calling recipe in apps/docs                     │
│   • Add CNAME (qarar.dev) in apps/docs/public                                    │
└────────────────────────┬─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────────────────────┐
│ PHASE 3: CI/CD Workflows & GitHub Repository Configuration                       │
│   • Create .github/workflows/deploy-docs.yml (GitHub Pages / Cloudflare)         │
│   • Configure GitHub repo secrets (NPM_TOKEN) and Actions Write Permissions      │
└────────────────────────┬─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────────────────────┐
│ PHASE 4: Release Execution & Smoke Verification                                  │
│   • Run monorepo release checks (lint, typecheck, test, build)                   │
│   • git push origin main ➔ Automated v0.1.0 release & npm publish               │
│   • Verify external consumer install via examples/published-test-app             │
└────────────────────────┬─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────────────────────┐
│ PHASE 5: Community Launch, Articles & Distribution                               │
│   • Hacker News ("Show HN") launch post                                          │
│   • Reddit (r/typescript, r/node) problem-first technical post                   │
│   • Dev.to / Hashnode deep-dive technical article                                │
│   • Awesome-lists pull requests & GitHub release announcement                    │
└────────────────────────┬─────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────────────────────┐
│ PHASE 6: AI Ecosystem & Agent Discovery (Post-Launch)                            │
│   • Create @qarar/mcp-server for Claude Desktop, Cursor, and Antigravity         │
│   • Add LangChain / Vercel AI SDK integration examples                           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

# Phase 1: Package Hygiene & Manifest Audit

### Objective
Ensure that every package published to npm contains only production build files (`dist/`), has explicit public access, has its own descriptive `README.md`, and that internal test tools like `@qarar/benchmark` are marked `private: true`.

---

### Step 1.1: Fix Package Manifests (`spec`, `engine-js`, `explainability`)

#### File 1: `packages/spec/package.json`
* **Changes:** Add `"files": ["dist", "README.md", "LICENSE"]` and `"publishConfig": { "access": "public" }` and `"license": "MIT"`.
```json
{
  "name": "@qarar/spec",
  "version": "0.0.4",
  "description": "Qarar specification — AST types and Zod schemas",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "lint": "biome lint ."
  },
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

#### File 2: `packages/engine-js/package.json`
* **Changes:** Add `"files"`, `"publishConfig"`, and `"license": "MIT"`.
```json
{
  "name": "@qarar/engine-js",
  "version": "0.0.4",
  "description": "Qarar JavaScript/TypeScript engine — evaluate rules with full trace",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "lint": "biome lint ."
  },
  "dependencies": {
    "@qarar/spec": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

#### File 3: `packages/explainability/package.json`
* **Changes:** Add `"files"`, `"publishConfig"`, and `"license": "MIT"`.
```json
{
  "name": "@qarar/explainability",
  "version": "0.0.4",
  "description": "Qarar trace → human-readable explanation generator",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "lint": "biome lint ."
  },
  "dependencies": {
    "@qarar/engine-js": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

#### File 4: `packages/benchmark/package.json`
* **Changes:** Set `"private": true` so this internal benchmarking harness is not accidentally published to npm.
```json
{
  "name": "@qarar/benchmark",
  "version": "0.0.4",
  "private": true,
  "description": "High-throughput performance benchmarking suite for Qarar",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  ...
}
```

---

### Step 1.2: Add Missing Package `README.md` Files
Every published package needs a clean README explaining what it does, with installation and links to the main docs at `https://qarar.dev`.

* **`packages/spec/README.md`**: Portable AST Zod schemas and types.
* **`packages/engine-js/README.md`**: High-throughput deterministic in-memory JS rule evaluator.
* **`packages/explainability/README.md`**: Natural language explanations for execution failures (`explainFailures`).
* **`packages/compiler-sql/README.md`**: Qarar AST to SQL `WHERE` clause compiler.
* **`packages/compiler-mongo/README.md`**: Qarar AST to MongoDB filter object compiler.
* **`packages/react-builder/README.md`**: Visual `<RuleBuilder />` React component.
* **`packages/theme/README.md`**: Design tokens and CSS stylesheets for Qarar UI components.

---

# Phase 2: Documentation Upgrades, Custom Domain & AI Indexing

### Objective
Prepare `apps/docs` for custom domain hosting (`qarar.dev`), make all docs readable by AI agents via `llms.txt`, and publish an AI/LLM integration guide.

---

### Step 2.1: Add `CNAME` for Custom Domain
#### File: `apps/docs/public/CNAME`
```text
qarar.dev
```

---

### Step 2.2: Add `llms.txt` and `llms-full.txt` (AI Agent Indexing)
AI agents (Cursor, Claude Code, GitHub Copilot, ChatGPT, Perplexity) crawl `/llms.txt` to understand libraries without reading messy HTML.

#### File: `apps/docs/public/llms.txt`
```markdown
# Qarar (قرارات) — The Open Standard for Business Rules & Decisioning

> Qarar is an open-standard, ultra-high-throughput (6M+ ops/sec) business rules engine and AST platform with database query pushdown (SQL & MongoDB) and plain-English explainability.

## Documentation Overview
- [Introduction](https://qarar.dev/getting-started/introduction/)
- [Installation & Quickstart](https://qarar.dev/getting-started/quickstart/)
- [Interactive Rule Studio](https://qarar.dev/playground/)
- [Core AST Specification](https://qarar.dev/concepts/ast-specification/)
- [High-Throughput Evaluation Engine](https://qarar.dev/concepts/engine-and-evaluation/)
- [Database Pushdown (SQL & MongoDB)](https://qarar.dev/concepts/database-pushdown/)
- [Explainability & Failure Reasons](https://qarar.dev/concepts/explainability/)
- [React RuleBuilder UI](https://qarar.dev/api/react-builder/)
- [AI Agents & LLM Function Calling](https://qarar.dev/recipes/ai-agents-llm/)

## Core Code Examples

### 1. Fluent Builder & Evaluation
```ts
import { rule, evaluate, explainFailures } from "@qarar/sdk";

// Define a rule
const fraudCheck = rule("Fraud Guard")
  .where("transaction.amount").gt(1000)
  .and("customer.isKycVerified").eq(false)
  .build();

// Evaluate payload
const result = evaluate(fraudCheck, {
  transaction: { amount: 1500 },
  customer: { isKycVerified: false }
});

console.log(result.result); // true (triggered)
```

### 2. Database Pushdown (SQL & Mongo)
```ts
import { compileToSQL, compileToMongo } from "@qarar/sdk";

// Compile directly to SQL WHERE clause
const { sql } = compileToSQL(fraudCheck);
// "transaction.amount > 1000 AND customer.isKycVerified = false"

// Compile to MongoDB filter
const { filter } = compileToMongo(fraudCheck);
// { "$and": [{ "transaction.amount": { "$gt": 1000 } }, { "customer.isKycVerified": false }] }
```

### 3. Plain-English Explainability
```ts
import { explainFailures } from "@qarar/sdk";

const failures = explainFailures(result.trace);
console.log(failures);
// ["customer.isKycVerified (false) equals false"]
```
```

#### File: `apps/docs/public/llms-full.txt`
* Contains the complete consolidated markdown text of all guides and API references for deep AI context ingestion.

---

### Step 2.3: Add "AI Agents & LLM Function Calling" Recipe
#### File: `apps/docs/src/content/docs/recipes/ai-agents-llm.mdx`
A dedicated guide showing how to use Qarar with OpenAI Structured Outputs, Gemini Function Calling, or Claude:
```markdown
---
title: AI Agents & LLM Function Calling
description: Generate safe, deterministic business rules from natural language prompts using LLMs and Qarar AST schemas.
---

Qarar's JSON AST is the ideal format for AI Agents. Rather than having LLMs output executable code (which carries severe security risks with `eval()`), the LLM outputs validated Qarar AST JSON adhering to `@qarar/spec`.

### Architecture: Natural Language ➔ Qarar AST ➔ Zero-Deploy Execution

```text
User Prompt: "Reject users with credit score below 620 unless income > 80k"
                     │
                     ▼
             LLM (OpenAI / Gemini)
       Structured Output (Zod Schema)
                     │
                     ▼
           Validated Qarar AST JSON
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    compileToSQL()          evaluate()
   (Postgres Query)      (6M ops/sec in JS)
```

### Code Example: OpenAI Structured Output with Qarar
```ts
import { RuleSchema } from "@qarar/sdk";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI();

const completion = await openai.beta.chat.completions.parse({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: "You are a business logic generator. Output valid Qarar rule ASTs according to the schema."
    },
    {
      role: "user",
      content: "Flag transactions where amount > 5000 and country != 'EG'"
    }
  ],
  response_format: zodResponseFormat(RuleSchema, "rule_ast"),
});

const generatedRule = completion.choices[0].message.parsed;
// generatedRule is guaranteed valid Qarar AST!
```
```

---

# Phase 3: CI/CD Workflows & GitHub Configuration

### Objective
Automate the deployment of documentation to GitHub Pages (or Cloudflare Pages) on every push to `main`, and verify repository secrets.

---

### Step 3.1: Create Docs Deployment Workflow
#### File: `.github/workflows/deploy-docs.yml`
```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'apps/docs/**'
      - 'packages/**'
      - '.github/workflows/deploy-docs.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build monorepo packages
        run: pnpm run build

      - name: Build documentation with Astro
        run: pnpm --filter @qarar/docs build

      - name: Setup GitHub Pages
        uses: actions/configure-pages@v4

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/docs/dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

### Step 3.2: Verify GitHub Actions Secrets & Permissions
1. **Add `NPM_TOKEN`**:
   - Go to GitHub: `https://github.com/mshehata-dev/qarar/settings/secrets/actions`
   - Create secret `NPM_TOKEN` with a Granular/Automation token from `npmjs.com` that has publish rights for `@qarar/*`.
2. **Enable Workflow Permissions**:
   - Go to: `https://github.com/mshehata-dev/qarar/settings/actions`
   - Under **Workflow permissions**, select **"Read and write permissions"** and check **"Allow GitHub Actions to create and approve pull requests"**.
3. **Configure Custom Domain DNS (if using `qarar.dev`)**:
   - In your DNS provider (Cloudflare, Namecheap, Google Domains):
     - `CNAME` record: `qarar.dev` $\rightarrow$ `mshehata-dev.github.io` (or Cloudflare Pages URL).

---

# Phase 4: Release Execution & Smoke Verification

### Objective
Execute the full local pipeline test, push commits to `main`, allow `.github/workflows/release.yml` to publish `v0.1.0`, and run real-world verification.

---

### Step 4.1: Local Release Verification Command
```bash
# Verify 100% pass across lint, typecheck, test, and build
pnpm run release:check
```

### Step 4.2: Trigger Production Release
```bash
git push origin main
```
*What happens automatically:*
1. GitHub Actions detects `main` push.
2. Identifies `feat:` commits $\rightarrow$ auto-bumps version from `0.0.4` to `0.1.0`.
3. Commits `chore(release): v0.1.0 [skip ci]` and pushes git tag `v0.1.0`.
4. Executes `pnpm -r publish --access public` to publish all packages to npmjs.org.
5. Generates the official GitHub Release with release notes.

### Step 4.3: External Consumer Smoke Test
Test that an external application installs and executes `v0.1.0` cleanly from the public npm registry:
```bash
cd examples/published-test-app
# Update dependency to published version
npm install @qarar/sdk@latest
npm start
```

---

# Phase 5: Community Launch, Articles & Distribution

### Objective
Drive initial developer awareness, GitHub stars, and organic adoption across developer communities.

---

### Post 1: Hacker News ("Show HN")
* **Target:** `news.ycombinator.com`
* **Title:** `Show HN: Qarar – An open standard for business rules (6M ops/s, SQL pushdown, zero-deploy)`
* **Content:**
```markdown
Hey HN! We built Qarar (https://qarar.dev), an open standard and ultra-high-throughput business rules platform.

The problem:
In almost every company, business rules (discounts, fraud detection, eligibility criteria) are hardcoded in if/else statements. Every time marketing or operations changes a threshold, developers have to edit code, submit a PR, wait for QA, and redeploy servers.

Even worse: if you check a rule in memory (Node.js), you also need to query matching records from PostgreSQL or Mongo. Developers end up duplicating the logic in SQL and in TypeScript, which drifts and causes subtle bugs.

How Qarar works:
1. Portable JSON AST: Rules are defined once in an OpenAPI-style JSON AST validated by Zod.
2. Ultra-High Performance: Evaluates in-memory at ~6.4M ops/sec with <0.2 µs latency.
3. Database Pushdown: The exact same AST compiles directly to SQL WHERE clauses and MongoDB filter objects.
4. Plain-English Explainability: When a rule fails, `explainFailures()` explains why in human-readable English for non-technical support teams.
5. Visual Rule Builder: An open-source React component (`@qarar/react-builder`) you can embed directly in your internal admin dashboard.

Everything is 100% open source under the MIT license.

- Live Interactive Studio: https://qarar.dev/playground/
- GitHub: https://github.com/mshehata-dev/qarar
- Docs: https://qarar.dev

Would love to hear your feedback on the AST specification and compilers!
```

---

### Post 2: Reddit (`r/typescript`, `r/node`, `r/webdev`)
* **Title:** `Stop duplicating your business logic between PostgreSQL queries and TypeScript code`
* **Content:**
Focus on the practical architectural pain of keeping in-memory filters and SQL queries in sync, demonstrating how `rule().where().gte().build()` compiles to both in-memory evaluation and SQL `WHERE` clauses.

---

### Post 3: Deep-Dive Article (Dev.to / Hashnode / Medium)
* **Title:** *How We Built a Zero-Deploy Business Rules Engine with TypeScript, ASTs, and 6M ops/sec*
* **Outline:**
  1. The hidden tech debt of hardcoded `if/else` ladders.
  2. Why `eval()` and string-based rule runners are dangerous in production.
  3. Designing a portable AST with Zod (`@qarar/spec`).
  4. Pushing down logic: How we translate AST nodes into PostgreSQL `WHERE` and MongoDB filters.
  5. The interactive React rule builder and live trace explainability.
  6. Getting started in 5 minutes with Next.js / Express.

---

### Post 4: Awesome Lists Submissions
Submit PRs to:
- `github.com/sindresorhus/awesome-nodejs` (Under Business Tools / Logic)
- `github.com/dzharii/awesome-typescript`
- `github.com/stoeffel/awesome-fp-js`

---

# Phase 6: AI Ecosystem & Agent Discovery (Post-Launch)

### Objective
Make Qarar the standard choice for AI Agents (Cursor, Claude, Copilot, LangChain, Vercel AI SDK).

1. **`@qarar/mcp-server`**:
   - Create a Model Context Protocol server exposing:
     - `validate_rule`: Validates a Qarar AST against schemas.
     - `test_rule`: Runs a test against mock payloads and returns traces.
     - `pushdown_sql`: Generates SQL `WHERE` clauses from AST.
   - Allows users to add Qarar directly to their Claude Desktop / Cursor configuration.
2. **LangChain & Vercel AI SDK Integration Guide**:
   - Publish a template showing how to use `generateObject()` with `RuleSchema` to build agentic rule-generation workflows.

---

## Action Tracker

- [ ] **Phase 1: Update package manifests (`spec`, `engine-js`, `explainability`, `benchmark`)**
- [ ] **Phase 1: Add README.md files to all packages**
- [ ] **Phase 2: Add `llms.txt` and `llms-full.txt` to `apps/docs/public`**
- [ ] **Phase 2: Add `CNAME` (`qarar.dev`) in `apps/docs/public`**
- [ ] **Phase 2: Add AI Agents recipe in `apps/docs`**
- [ ] **Phase 3: Create `.github/workflows/deploy-docs.yml`**
- [ ] **Phase 3: Verify `NPM_TOKEN` and Actions Write Permissions on GitHub**
- [ ] **Phase 4: Run `pnpm run release:check`**
- [ ] **Phase 4: Push to `main` and verify `v0.1.0` release on npm and GitHub**
- [ ] **Phase 5: Publish Show HN & Reddit posts with live `qarar.dev` links**
- [ ] **Phase 6: Begin `@qarar/mcp-server` implementation**
