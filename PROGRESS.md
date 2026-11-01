# Qarar — Project Status & Progress Tracker

> **Last Updated:** November 2026  
> **Current Version:** `v0.0.4`  
> **Active Branch:** `main` (Synchronized with `dev`)  
> **Monorepo Build Status:** 🟢 All 12 packages and applications building cleanly (`pnpm exec turbo run build`)  
> **Test Status:** 🟢 100% passing across 16 test tasks (`pnpm exec turbo run test`)  
> **Linter Status:** 🟢 100% passing across 12 packages with Biome (`pnpm run lint`)  
> **Smoke Test Status:** 🟢 100% passing (`pnpm run smoke:sdk:published`)  

---

## 1. Monorepo Package Readiness Matrix

| Package / App | Path | Type | Tests / Checks | Status | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`@qarar/spec`** | `packages/spec` | Public | 12 tests + Biome | 🟢 Production | Core portable AST schemas, operator definitions, and Decision Table Zod types. |
| **`@qarar/engine-js`** | `packages/engine-js` | Public | 30 tests + Biome | 🟢 Production | In-memory evaluation engine with execution trace generation and switch-case/decision table support. |
| **`@qarar/explainability`** | `packages/explainability` | Public | 13 tests + Biome | 🟢 Production | Human-readable explanation generator and failure extractor (`explainFailures`). |
| **`@qarar/compiler-sql`** | `packages/compiler-sql` | Internal | 16 tests + Biome | 🟢 Stable | AST to SQL `WHERE` clause compiler supporting `snake`, `quote`, and `path` column styles. |
| **`@qarar/compiler-mongo`** | `packages/compiler-mongo` | Internal | 16 tests + Biome | 🟢 Stable | AST to MongoDB filter object compiler supporting `$and`, `$or`, `$nor`, `$in`, `$regex`. |
| **`@qarar/sdk`** | `packages/sdk` | Public | 21 tests + Biome | 🟢 Production | Main public npm package. Exposes fluent builder API (`rule()`, `switchOn()`), validator, engine, compilers, and schema helper (`createQarar`). |
| **`@qarar/react-builder`** | `packages/react-builder` | Public | 15 tests + Biome | 🟢 Production | Visual rule-builder UI component (`<RuleBuilder />`) for embedding in web applications. |
| **`@qarar/theme`** | `packages/theme` | Public | TS check + Biome | 🟢 Production | Unified design tokens, theme variables, and CSS stylesheets for Qarar UI components. |
| **`@qarar/benchmark`** | `packages/benchmark` | Internal | 8 tests + Biome | 🟢 Production | Performance benchmark suite with micro-benchmarks, dataset generators, and percentile reporting CLI. |
| **`@qarar/playground`** | `apps/playground` | App | Build check + Biome | 🟢 Production | Interactive React + Vite testing studio migrated to `@qarar/react-builder`, test data, and AST inspection. |
| **`@qarar/docs`** | `apps/docs` | App | Astro check + Biome | 🟢 Production | Astro + Starlight documentation portal with 28+ content pages, sitemap, and interactive playground component. |
| **`qarar-published-test-app`** | `examples/published-test-app` | Example | E2E smoke + Biome | 🟢 Passing | Standalone Node.js app verifying all 5 core SDK features against workspace packages. |

---

## 2. Test Suite & Verification Summary

```text
Vitest Test Results:
 • @qarar/spec:           2 test files,  12 passed (100%)
 • @qarar/engine-js:       2 test files,  30 passed (100%)
 • @qarar/explainability:  1 test file,   13 passed (100%)
 • @qarar/compiler-sql:    1 test file,   16 passed (100%)
 • @qarar/compiler-mongo:  1 test file,   16 passed (100%)
 • @qarar/sdk:             4 test files,  21 passed (100%)
 • @qarar/benchmark:       1 test file,    8 passed (100%)
 • @qarar/react-builder:   1 test file,   15 passed (100%)
Total Vitest Tests:       13 test files, 131 tests passed (0 failures)

Biome Linter Results:
 • Checked 12 packages / 86 files (0 errors, 0 warnings)
 • turbo run lint: 12 successful, 12 total
```

---

## 3. High-Throughput Performance Snapshot

Results from `@qarar/benchmark` executed on Node.js v22 (Apple Silicon):

| Target Operation | Throughput | Mean Latency | p50 | p95 |
| :--- | :--- | :--- | :--- | :--- |
| **`evaluate()` — Simple (`age >= 18`)** | **6,422,900 ops/sec** | 0.16 µs | 0.08 µs | 0.21 µs |
| **`compileRule()` — Simple** | **6,902,542 ops/sec** | 0.14 µs | 0.08 µs | 0.13 µs |
| **`evaluate()` — Medium (Logical AND/OR)** | **2,745,666 ops/sec** | 0.36 µs | 0.25 µs | 0.58 µs |
| **`evaluate()` — Complex (Deep nested trees)** | **1,584,402 ops/sec** | 0.63 µs | 0.50 µs | 1.33 µs |
| **`compileToSQL()` — Pushdown** | **660,558 ops/sec** | 1.51 µs | 1.33 µs | 1.58 µs |
| **`compileToMongo()` — Pushdown** | **1,404,596 ops/sec** | 0.71 µs | 0.63 µs | 0.67 µs |

---

## 4. Immediate Action Items Status (Release Preparation)

| ID | Issue | Impact | Status | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **ACTION-01** | Merge `dev` to `main` | High | 🟢 Completed | `dev` merged cleanly into `main`. |
| **ACTION-02** | Playground builder duplication | Medium | 🟢 Completed | `apps/playground` migrated to use `@qarar/react-builder`; deleted `ConditionRow.tsx`, `LogicGroup.tsx`, and `builderModel.ts`. |
| **ACTION-03** | Monorepo linter (`turbo run lint` skipped) | Medium | 🟢 Completed | Installed and configured `@biomejs/biome`, wired `"lint": "biome lint ."` into all 12 package manifests. |
| **ACTION-04** | Astro docs sitemap warning | Low | 🟢 Completed | Added `site: 'https://qarar.dev'` to `apps/docs/astro.config.mjs`, sitemap builds with 0 warnings. |
| **ACTION-05** | Playground version selector hardcoded `0.0.2` | Low | 🟢 Completed | Updated `AVAILABLE_VERSIONS` in `apps/playground/src/App.tsx` with `0.0.4`, `0.0.3`, `0.0.2`. |
| **ACTION-06** | Full release pipeline verification | High | 🟢 Completed | Executed `typecheck`, `test`, `build`, `lint`, and `smoke:sdk:published` with 100% pass rate. |

---

## 5. Next Steps Tracker

- [x] **Task 1: Configure Workspace Linter (Biome)**
- [x] **Task 2: Unify React Builder in Playground**
- [x] **Task 3: Fix Astro Sitemap Config**
- [x] **Task 4: Update Playground Version Selector**
- [x] **Task 5: Synchronize `dev` to `main`**
- [ ] **Task 6: Parameterized SQL Compiler** (`packages/compiler-sql` params array support)
