# Qarar — Strategic Product & Engineering Roadmap

This roadmap defines the strategic direction, release milestones, and architecture deliverables for **Qarar** (formerly OpenRules) — an open standard and high-throughput platform for portable business rules, visual authoring, database query pushdown, and explainable decisioning.

---

## Strategic Vision Alignment

> **"OpenAPI for Business Rules"**  
> Define a business rule once in portable AST JSON, and evaluate it anywhere: in-memory across multiple languages (TypeScript, Go, Python, Java), push it down directly into database query engines (SQL, MongoDB, Elasticsearch), author it visually in low-code UIs, and generate natural-language explanations for non-technical stakeholders.

---

## Release Milestones Overview

| Milestone | Version | Focus | Status |
| :--- | :--- | :--- | :--- |
| **Milestone 0: Core Foundation** | `v0.0.1` – `v0.0.4` | Headless AST, TS engine, explainability, SQL/Mongo pushdown, SDK fluent builder, benchmark suite | **Completed** (in `dev`) |
| **Milestone 1: Monorepo Consolidation & Beta Release** | `v0.1.0` | Production release of `dev`, merge to `main`, `@qarar/react-builder` consolidation, linter setup | **Target: Q4 2026** |
| **Milestone 2: Polyglot Engines & Query Pushdown** | `v0.2.0` | Native Go engine (`qarar-go`), parameterized SQL compiler, Elasticsearch query builder | **Target: Q1 2027** |
| **Milestone 3: Visual Rule Studio & Low-Code Platform** | `v0.3.0` | Hosted/self-hostable Rule Studio app, rule versioning, schema registry, batch testing sandbox | **Target: Q2 2027** |
| **Milestone 4: AI Rule Co-Pilot & Ecosystem** | `v1.0.0` | Natural language rule synthesis, automated rule explanations, marketplace template gallery | **Target: Q3 2027** |

---

## Detailed Milestone Breakdown

```
[Milestone 0: Core Foundation]  -->  [Milestone 1: Consolidation & Beta]  -->  [Milestone 2: Polyglot Engines]
       (v0.0.1 - v0.0.4)                         (v0.1.0)                             (v0.2.0)
         COMPLETED                               NEXT UP                               PLANNED
            │                                       │                                     │
            ▼                                       ▼                                     ▼
 • JSON AST Spec (Zod)                   • Merge `dev` to `main`               • Native Go Engine (`qarar-go`)
 • JS/TS In-Memory Engine                • Unified React Builder               • Python Engine (`qarar-py`)
 • Explainability & Traces               • Add Monorepo Linter (ESLint/Biome)  • Parameterized SQL queries
 • SQL & Mongo Compilers                 • Astro Sitemap & Docs Hosting        • Elasticsearch Pushdown
 • Fluent SDK Builder                    • NPM Public Release v0.1.0           • Date/Time & Math functions
 • Decision Tables Engine
 • Benchmark Suite (5.9M ops/s)
 • Astro Starlight Docs
```

---

### Milestone 0: Core Foundation & Monorepo Infrastructure (Completed)
- [x] **Portable AST Specification (`@qarar/spec`)**:
  - Zod schemas for Scalar values, Field nodes, Arrays, Comparisons, and Logical groups (`and`, `or`, `not`).
  - Between condition node (`left`, `min`, `max`).
  - Decision Table AST schema (`DecisionTable`, `DecisionBranch`, `mode: "first" | "all"`, `defaultOutput`).
- [x] **Deterministic JS Evaluation Engine (`@qarar/engine-js`)**:
  - Dot-notation field path resolution (e.g., `customer.profile.tier`).
  - 16+ comparison & string operators (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `contains`, `startsWith`, `endsWith`, `matches`, `isNull`, `isNotNull`).
  - Tree-structured execution traces for explainability.
  - Decision table evaluator with branch trace capture.
- [x] **Explainability Engine (`@qarar/explainability`)**:
  - Human-readable natural language sentences for condition outcomes.
  - `explainFailures()` extractor for support & operations triage.
  - Custom field labels and indentation for nested logical trees.
- [x] **Database Query Pushdown Compilers**:
  - SQL compiler (`@qarar/compiler-sql`) with multiple column identifier strategies (`snake`, `quote`, `path`).
  - MongoDB compiler (`@qarar/compiler-mongo`) targeting native aggregation & filter objects (`$and`, `$or`, `$nor`, `$regex`).
- [x] **Unified Public SDK (`@qarar/sdk`)**:
  - Fluent chained builder API: `rule("name").where("field").gte(value).and(...).build()`.
  - Switch/Case builder: `switchOn("table").case(condition, output).default(fallback).build()`.
  - High-performance executable wrapper: `compileRule()`.
  - Type-safe schema validator: `createQarar(ZodSchema)`.
- [x] **Visual UI Package (`@qarar/react-builder`)**:
  - Reusable React component `<RuleBuilder />` and data models (`fromAST`, `toAST`).
- [x] **Shared Design Tokens (`@qarar/theme`)**:
  - Standardized CSS tokens for light & dark themes.
- [x] **Benchmark Suite (`@qarar/benchmark`)**:
  - Micro-benchmarks demonstrating ~5.9M evaluate ops/sec.
  - Deterministic batch dataset generator for 10k–1M records.
  - CLI runner with percentile reporting (p50, p95, p99, memory delta).
- [x] **Documentation Portal (`apps/docs`)**:
  - Astro Starlight documentation portal with 28+ content pages, guides, API reference, and live interactive playground.

---

### Milestone 1: Monorepo Consolidation & Beta Release (v0.1.0)
*Target: Immediate / Q4 2026*

**Objective:** Clean up tech debt, consolidate duplicate UI components, synchronize branches, and publish official `v0.1.0` beta to npm.

- [ ] **Branch Synchronization**:
  - Review 5 pending commits on `dev` branch.
  - Open and merge PR from `dev` into `main`.
  - Trigger automated GitHub Release workflow.
- [ ] **Consolidate Visual Builder**:
  - Refactor `apps/playground` to consume `@qarar/react-builder` directly instead of maintaining internal copies of `ConditionRow.tsx` and `LogicGroup.tsx`.
  - Support Decision Table visual editing in `@qarar/react-builder`.
- [ ] **Code Quality & Tooling Fixes**:
  - Implement ESLint / Prettier or Biome across all monorepo packages so `pnpm run lint` executes real checks.
  - Configure `site` property in `apps/docs/astro.config.mjs` to eliminate Astro sitemap build warning.
  - Update `AVAILABLE_VERSIONS` in `apps/playground/src/App.tsx` from `0.0.2` to reflect current versions (`0.0.4`, `0.1.0`).
- [ ] **Packaging & Export Audit**:
  - Audit dual CJS/ESM exports and TypeScript declaration maps (`.d.ts.map`) across `@qarar/sdk` and `@qarar/react-builder`.
  - Verify standalone consumption in external projects with zero workspace dependency leakage.

---

### Milestone 2: Polyglot Engines & Query Pushdown (v0.2.0)
*Target: Q1 2027*

**Objective:** Expand Qarar beyond the Node.js/TypeScript ecosystem into high-performance backend runtimes and databases.

- [ ] **Native Go Engine (`qarar-go`)**:
  - Standalone Go library that accepts Qarar JSON AST.
  - High-performance in-memory evaluation for microservices and API gateways.
  - Full parity with `@qarar/engine-js` test cases and execution traces.
- [ ] **Native Python Engine (`qarar-python`)**:
  - Python package for data engineering, pandas/polars pipelines, and machine learning feature stores.
- [ ] **Parameterized SQL Compiler**:
  - Extend `@qarar/compiler-sql` to produce parameterized SQL (`$1, $2` for PostgreSQL, `?` for MySQL/SQLite) alongside parameter value arrays to prevent SQL injection risks.
- [ ] **Elasticsearch & OpenSearch Compiler (`@qarar/compiler-elastic`)**:
  - Compile AST to native Elasticsearch Query DSL (`bool: { must, filter, should, must_not }`).
- [ ] **Extended Function & Date Operators**:
  - Date comparisons: `before`, `after`, `withinLast(duration)`.
  - Array operators: `hasAny`, `hasAll`, `isEmpty`, `isNotEmpty`.
  - Mathematical operators: arithmetic expressions in left/right operands.

---

### Milestone 3: Visual Rule Studio & Low-Code Platform (v0.3.0)
*Target: Q2 2027*

**Objective:** Transition from an SDK monorepo to an end-to-end rule management platform for business teams.

- [ ] **Qarar Studio App (`apps/studio`)**:
  - Standalone web application for managing organization-wide rule repositories.
  - RBAC: Authors (business users), Approvers (managers), Consumers (engineers).
  - Version control for rules: draft, published, archived, with visual side-by-side diffing.
- [ ] **Schema Registry & Ingestion**:
  - Connect database schemas, OpenAPI/JSON-Schema endpoints, or CSV files to auto-generate rule field definitions.
  - Live data preview and dynamic autocomplete during rule construction.
- [ ] **Batch Test Runner & Simulator**:
  - Test new rule revisions against historical transaction or customer datasets.
  - Impact analysis: "This rule change would increase approvals by 4.2% and reject 120 existing accounts."

---

### Milestone 4: AI Rule Co-Pilot & Ecosystem (v1.0.0)
*Target: Q3 2027*

**Objective:** Enterprise readiness, AI-assisted rule authoring, standard specification freeze, and marketplace.

- [ ] **Natural Language Rule Co-Pilot**:
  - Prompt-driven rule generation: "Reject transactions over \$5,000 originating outside the home country unless 2FA is verified".
  - LLM integration producing validated Qarar AST + verification against user schema.
  - Automated natural language rule summaries for audits and compliance.
- [ ] **Rule Template Marketplace**:
  - Curated, community-tested rule packs:
    - *FinTech & Payments*: Anti-Fraud, AML, Chargeback risk gates.
    - *E-Commerce*: Tiered discounts, promo code stacking, VIP qualification.
    - *SaaS*: Seat limits, feature entitlement flags, usage overage warnings.
    - *Healthcare & Compliance*: Consent gates, HIPAA access verification.
- [ ] **Chrome Browser Extension**:
  - Record live browser DOM data and network payloads to instantly test rules or generate test fixtures.
- [ ] **Specification Standardization (RFC 1.0)**:
  - Formal freeze of Qarar Specification v1.0.
  - Comprehensive compliance test suite runnable across all language implementations (TypeScript, Go, Python, Java).

---

## Technical Governance

1. **Rule JSON AST is the Universal Contract**: Engines in any programming language must produce identical boolean outputs and structured traces for any given rule and input data.
2. **Schema-Driven Authoring**: User interfaces must never hardcode field names; all visual editors are driven by schema definitions.
3. **Zero Runtime Execution in Specification**: The specification defines types and validation schemas only.
4. **Explainability by Default**: Every rule execution produces a deterministic audit trace suitable for compliance and non-technical explanation.
