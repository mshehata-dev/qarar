# Contributing to Qarar

Thank you for your interest in contributing to **Qarar**!

Qarar is a monorepo for portable business rules, visual authoring, database query pushdown, and explainable decisioning.

---

## Quick Navigation

- 🗺️ **[Strategic Roadmap](file:///Users/ms/playground/OpenRules/ROADMAP.md)**: Product direction, upcoming milestones, and long-term features.
- 📊 **[Progress Tracker](file:///Users/ms/playground/OpenRules/PROGRESS.md)**: Current package statuses, test coverage, benchmark numbers, and technical debt.
- 📐 **[Rules of Changes](file:///Users/ms/playground/OpenRules/RULES_OF_CHANGES.md)**: Architectural invariants, git branching strategy, commit conventions, and verification gates.
- 🔭 **[Project Vision](file:///Users/ms/playground/OpenRules/PROJECT_VISION.md)**: Philosophy and long-term design principles.

---

## Local Development Setup

### Prerequisites
- **Node.js**: v22 LTS (recommended: v22.x)
- **pnpm**: v9.1.0+ (`corepack enable && corepack prepare pnpm@9.1.0 --activate`)

### Installation & Build

```bash
# Clone the repository
git clone git@github.com:mshehata-dev/qarar.git
cd qarar

# Install dependencies
pnpm install

# Build all packages and applications
pnpm run build

# Run all test suites
pnpm run test

# Run micro-benchmarks
pnpm bench:micro
```

### Running Applications Locally

```bash
# Run the Interactive Playground
pnpm --filter @qarar/playground dev

# Run the Documentation Portal
pnpm --filter @qarar/docs dev
```

---

## Development Workflow

1. Always branch off `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/your-feature-name
   ```
2. Follow the architectural rules in **[RULES_OF_CHANGES.md](file:///Users/ms/playground/OpenRules/RULES_OF_CHANGES.md)**.
3. Write Vitest unit tests for any new or modified logic.
4. Verify your changes locally:
   ```bash
   pnpm run typecheck
   pnpm run test
   pnpm run build
   ```
5. Use Conventional Commits (`feat:`, `fix:`, `docs:`, `perf:`, etc.).
6. Open a Pull Request targeting the `dev` branch.
