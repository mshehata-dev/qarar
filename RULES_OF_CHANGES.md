# Qarar — Rules of Changes & Engineering Standards

These rules define the engineering standards, architectural invariants, git workflow, and quality gates for contributing code to the **Qarar** monorepo. Every contributor and AI agent must adhere strictly to these principles.

---

## 1. Core Architectural Invariants

### Rule 1: The Spec-First Principle
Every new operator, node type, AST change, or data type must be introduced first in `@qarar/spec` with Zod schema validation and TypeScript types before any runtime implementation.
- No package may invent custom AST structures that are not defined and validated in `@qarar/spec`.
- Backward compatibility: AST schemas must remain portable and backward compatible. Breaking AST changes require a major version bump.

### Rule 2: Zero Execution Logic in Specification
The `@qarar/spec` package must contain **zero runtime execution or compilation logic**. It is strictly a type definition and validation library.

### Rule 3: Headless Core Engines
`@qarar/engine-js`, `@qarar/compiler-sql`, `@qarar/compiler-mongo`, and `@qarar/explainability` must remain pure headless TypeScript libraries.
- **Zero DOM, React, or browser dependencies** in core engine packages.
- Field resolution and comparisons must be deterministic and side-effect free.

### Rule 4: Mandatory Execution Traces & Explainability
Any evaluation node executed by `@qarar/engine-js` must produce a structured `TraceEntry`.
- Trace nodes must capture: operator, field path, actual value, expected value, and boolean pass/fail status.
- `@qarar/explainability` must be able to convert any trace into a clear, natural-language sentence without throwing exceptions.

### Rule 5: Single Public SDK Entrypoint
For JavaScript and TypeScript consumers, `@qarar/sdk` is the single public entrypoint.
- Keep the public API clean, ergonomic, and fluent: `rule()`, `checkRule()`, `compileRule()`, `createQarar()`, `switchOn()`.
- Internal compilers (`@qarar/compiler-sql`, `@qarar/compiler-mongo`) are exposed optionally under subpaths or internal wrappers and are not published as standalone npm packages.

### Rule 6: Schema-Driven UI
Visual components (`@qarar/react-builder` and `apps/playground`) must never hardcode domain-specific fields (e.g. `customer.age`, `cart.total`).
- Field names, types, and valid operators must be driven dynamically by a schema configuration (`SchemaConfig` / `FieldDefinition[]`).

---

## 2. Git & Branching Strategy

```text
  feature branch (feat/...) ──┐
                              ▼
                         [ dev ]  ◄── Primary integration branch (PR checks required)
                              │
                              ▼ (Automated / tested release)
                        [ main ]  ◄── Production releases (Triggers npm publish & tagging)
```

### Branch Roles
1. **`main`**: Production release branch.
   - Protected. Direct pushes are restricted to automated release jobs.
   - Every merge into `main` automatically triggers CI, version bumping, Git tagging, and npm publishing.
2. **`dev`**: Active integration branch.
   - All feature branches and pull requests target `dev`.
   - Must always be in a passing, buildable state (`turbo run typecheck test build`).
3. **Feature branches**:
   - Branch off `dev`.
   - Naming convention:
     - `feat/<short-description>` (e.g., `feat/date-operators`)
     - `fix/<bug-description>` (e.g., `fix/mongo-regex-escaping`)
     - `docs/<topic>` (e.g., `docs/recipes-update`)
     - `refactor/<name>` (e.g., `refactor/unify-builder-components`)
     - `perf/<target>` (e.g., `perf/engine-memoization`)
     - `ci/<workflow>` (e.g., `ci/node-lts-upgrade`)

---

## 3. Commit Message Standards (Conventional Commits)

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Allowed Types
- `feat`: New feature or operator for users/integrators.
- `fix`: Bug fix.
- `docs`: Documentation only changes.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `perf`: Performance improvement (benchmarks recommended).
- `test`: Adding or correcting tests.
- `ci`: Changes to CI/CD workflows and scripts.
- `chore`: Maintenance, dependencies, or tool updates.

### Allowed Scopes
`spec`, `engine-js`, `sdk`, `react-builder`, `explainability`, `sql`, `mongo`, `benchmark`, `playground`, `docs`, `theme`.

### Examples
- `feat(spec): add date comparison operators (before, after)`
- `fix(sql): escape single quotes in string literals`
- `docs(sdk): add code examples for switch-case builder`
- `perf(engine-js): optimize field path resolution with cache`

### Breaking Changes
Breaking changes must include an exclamation mark after the type/scope and a `BREAKING CHANGE:` footer:
```text
feat(spec)!: change comparison node right operand schema

BREAKING CHANGE: right operand must now be an explicit ValueNode instead of raw literal.
```

---

## 4. Synchronized Versioning Protocol

The monorepo uses **synchronized versioning** across all packages (`@qarar/*`).
- **Rule:** Never manually edit `"version"` in individual `package.json` files.
- **How to bump versions:**
  ```bash
  # Patch bump (0.0.4 -> 0.0.5)
  pnpm run version:bump patch

  # Minor bump (0.0.4 -> 0.1.0)
  pnpm run version:bump minor

  # Explicit version
  pnpm run version:bump 0.1.0
  ```
- The version bump script (`scripts/bump-version.mjs`) automatically scans and updates:
  - Root `package.json`
  - All packages in `packages/*`
  - All apps in `apps/*`
  - All examples in `examples/*`

---

## 5. Quality & Verification Gates

Before submitting a pull request or merging changes, execute the full local verification pipeline:

```bash
# 1. Typecheck all packages
pnpm run typecheck

# 2. Run all unit tests
pnpm run test

# 3. Build all packages and applications (including docs & playground)
pnpm run build

# 4. Verify the published test app smoke test
pnpm run smoke:sdk:published
```

### Test Coverage Requirements
1. **New Operators:** Must add unit tests in:
   - `packages/spec/src/__tests__/` (Zod validation pass/fail tests)
   - `packages/engine-js/src/__tests__/` (evaluation truth table)
   - `packages/explainability/src/__tests__/` (human-readable string generation)
   - `packages/compiler-sql/src/__tests__/` and `packages/compiler-mongo/src/__tests__/` (pushdown compilation)
   - `packages/sdk/src/__tests__/` (fluent builder method chaining)
2. **Bug Fixes:** Every fix must be accompanied by a regression test verifying the bug was resolved.

### Performance Gates
Any change to `@qarar/engine-js` or `@qarar/sdk/src/engine.ts` must not cause performance regression:
```bash
pnpm bench:micro
```
- Simple evaluations (`age >= 18`) must achieve **> 2,000,000 ops/second** on modern hardware.
- Memory allocation should remain neutral or negative.

---

## 6. Documentation Standards

1. Any public API change in `@qarar/sdk` must be documented in:
   - `packages/sdk/README.md`
   - `apps/docs/src/content/docs/api/`
2. Architectural decisions and milestone updates must be reflected in:
   - `ROADMAP.md`
   - `PROGRESS.md`
