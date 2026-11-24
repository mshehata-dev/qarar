# Contributing to Qarar

Thank you for your interest in contributing to **Qarar**! Qarar is an open-source, high-throughput business rules engine with dynamic AST evaluation, database query pushdown (SQL & MongoDB), and zero external runtime dependencies in core packages.

We welcome contributions of all kinds: bug reports, documentation enhancements, operator additions, performance optimizations, and integrations.

---

## 🏛️ Monorepo Architecture

Qarar is structured as a Turborepo + pnpm monorepo:

```
qarar/
├── packages/
│   ├── spec/             # Core AST interfaces, operator types, validation (zero dependencies)
│   ├── engine-js/        # High-performance in-memory evaluation engine (zero dependencies)
│   ├── compiler-sql/     # Parameterized SQL WHERE clause compiler (PostgreSQL, MySQL, SQLite)
│   ├── compiler-mongo/   # MongoDB MQL compiler ($expr and standard filter trees)
│   ├── explainability/   # Audit trails, execution traces, and explain trees
│   ├── sdk/              # Unified public API and fluent rule builder (zero dependencies)
│   ├── react-builder/    # Visual React rule builder component and ChipInput
│   ├── theme/            # Shared design tokens and CSS variables
│   └── benchmark/        # Performance benchmark harness and dataset generator
├── apps/
│   ├── docs/             # Documentation portal (Astro Starlight)
│   └── playground/       # Interactive live web playground
└── examples/
    └── published-test-app/ # Real-world consumer integration test application
```

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **pnpm**: `v9.x` (Enable with `corepack enable pnpm` or `npm install -g pnpm`)
- **Git**: Configured with your developer identity

### Initial Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/qarar.git
   cd qarar
   ```

2. **Checkout the `dev` branch** (all development happens on `dev`):
   ```bash
   git checkout dev
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Build all packages**:
   ```bash
   pnpm run build
   ```

5. **Run test suites**:
   ```bash
   pnpm run test
   ```

---

## 🌿 Branching Strategy & Workflow

To maintain production stability, we follow a strict branching model:

```
[Your Feature Branch] ──(PR)──> [dev] ──(Maintainer PR)──> [main] (Release Tag)
```

1. **Never target `main` directly**:
   - `main` is protected and strictly reserved for production releases.
   - All external Pull Requests must target the `dev` branch.
2. **Create a descriptive feature branch from `dev`**:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/array-set-intersection
   ```
3. **Keep branches updated**:
   - Rebase or merge from `origin/dev` regularly to avoid merge conflicts.

---

## 📐 Engineering Guidelines & Quality Standards

### 1. Zero External Runtime Dependencies
- Core packages (`@qarar/spec`, `@qarar/engine-js`, `@qarar/sdk`, `@qarar/compiler-sql`, `@qarar/compiler-mongo`) **must have 0 external runtime dependencies**.
- Do not introduce runtime packages like lodash, moment, validator, or date-fns. Use native JavaScript and modern Web APIs.

### 2. Backward Compatibility
- AST formats and rule schemas are serialized in databases across thousands of deployments.
- Never make breaking schema changes without a documented migration strategy. New operators and fields must be strictly additive.

### 3. Type Safety & Strict Coercion
- All code must pass strict TypeScript checks (`pnpm run typecheck`).
- Dynamic evaluations and field comparisons must guard against prototype pollution (`__proto__`, `constructor`) and handle edge cases gracefully (NaN, null, undefined).

### 4. Unit Test Coverage
- Every bug fix must include a reproducing regression test.
- Every new operator, builder method, or compiler capability must include exhaustive tests covering valid cases, boundary conditions, and invalid inputs.

---

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature or capability (e.g. `feat(sdk): add duration offset math to date builder`)
- `fix:` A bug fix (e.g. `fix(react-builder): coerce array length input to number`)
- `docs:` Documentation only changes (e.g. `docs: update benchmark methodology`)
- `perf:` Performance improvements (e.g. `perf(engine-js): optimize AST traversal`)
- `test:` Adding or updating tests (e.g. `test(spec): add decision table edge cases`)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `chore:` Maintenance, dependency updates, or build tooling changes

---

## 🚀 Common Verification Commands

Before opening your Pull Request, run the full verification pipeline locally:

```bash
# 1. Run ESLint across all packages
pnpm run lint

# 2. Check TypeScript types across the monorepo
pnpm run typecheck

# 3. Run all unit tests
pnpm run test

# 4. Verify clean build of all packages and docs
pnpm run build
pnpm --filter @qarar/docs build
```

---

## 📬 Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request on GitHub against `mshehata-dev/qarar` with base branch **`dev`**.
3. Fill out the Pull Request template completely.
4. Ensure all automated CI checks pass.
5. The maintainer (`@mshehata-dev`) will review your PR and provide feedback.

Thank you for helping make Qarar the best business rules engine in the TypeScript ecosystem!
