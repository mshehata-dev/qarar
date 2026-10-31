# Qarar

**Qarar** is an open standard and high-throughput platform for portable business rules, visual authoring, database query pushdown, and explainable decisioning.

Define a rule once as a portable JSON AST, and evaluate it anywhere: in-memory in JavaScript/TypeScript (>5.9M ops/sec), push it down directly into database queries (SQL, MongoDB), author it visually in React, or explain failure reasons to non-technical users in plain English.

---

## Quick Navigation

- 🗺️ **[Strategic Roadmap](ROADMAP.md)**: Product direction, upcoming milestones, and long-term vision.
- 📊 **[Progress Tracker](PROGRESS.md)**: Real-time package readiness matrix, test coverage, and benchmark stats.
- 📐 **[Rules of Changes](RULES_OF_CHANGES.md)**: Architectural invariants, git branching strategy, commit conventions, and quality gates.
- 🤝 **[Contributing Guide](CONTRIBUTING.md)**: Developer setup and workflow guidelines.
- 🔭 **[Project Vision](PROJECT_VISION.md)**: Core philosophy and long-term design principles.

---

## What Qarar Provides

- **Deterministic Rule Evaluation**: In-memory rule engine with deep execution traces (`evaluate`, `compileRule`).
- **Human-Readable Explainability**: Automated natural-language failure explanations (`explainFailures`) for operations and customer support.
- **Decision Tables & Switch Cases**: Dynamic multi-branch evaluation with `first` or `all` match modes.
- **Database Query Pushdown**: Compile portable rule ASTs directly into SQL (`WHERE` clauses) and MongoDB query filters.
- **Fluent Rule Builder**: Type-safe chained API for declaring complex business logic (`rule().where().and().build()`).
- **Visual Rule Builder**: Embeddable React component (`@qarar/react-builder`) driven by dynamic schema configurations.
- **Interactive Playground & Documentation**: Full Astro Starlight documentation portal (`apps/docs`) and developer playground (`apps/playground`).

---

## Monorepo Packages & Apps

| Package / App | Path | Description |
| :--- | :--- | :--- |
| **`@qarar/sdk`** | `packages/sdk` | Primary public SDK exposing builder, engine, validator, and explainability. |
| **`@qarar/spec`** | `packages/spec` | Portable JSON AST schemas, operator definitions, and Zod validators. |
| **`@qarar/engine-js`** | `packages/engine-js` | High-throughput in-memory evaluation engine with execution traces. |
| **`@qarar/explainability`** | `packages/explainability` | Natural-language explanation generator and failure triage extractor. |
| **`@qarar/react-builder`** | `packages/react-builder` | Low-code React visual rule builder component. |
| **`@qarar/theme`** | `packages/theme` | Unified design tokens and CSS themes (dark/light). |
| **`@qarar/compiler-sql`** | `packages/compiler-sql` | Rule AST to SQL WHERE compiler (`snake`, `quote`, `path` column styles). |
| **`@qarar/compiler-mongo`** | `packages/compiler-mongo` | Rule AST to MongoDB filter object compiler. |
| **`@qarar/benchmark`** | `packages/benchmark` | High-throughput benchmarking suite and dataset generator. |
| **`@qarar/playground`** | `apps/playground` | Vite + React interactive rule-testing studio. |
| **`@qarar/docs`** | `apps/docs` | Astro Starlight documentation portal and interactive sandbox. |

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Run typechecks & test suites across all packages
pnpm run typecheck
pnpm run test

# 3. Build all packages and applications
pnpm run build

# 4. Run performance microbenchmarks
pnpm bench:micro

# 5. Launch local development servers
pnpm --filter @qarar/playground dev  # Playground at http://localhost:5173
pnpm --filter @qarar/docs dev        # Documentation at http://localhost:4321
```

---

## SDK Usage Example

```ts
import { rule, checkRule, compileToSQL, compileToMongo } from "@qarar/sdk";

// 1. Build a portable rule using the fluent builder
const loyaltyRule = rule("Gold Tier Loyalty Promotion")
  .id("promo-gold-v1")
  .where("customer.points").gte(1000)
  .and("customer.status").eq("active")
  .build();

// 2. Evaluate against incoming data with one-shot check
const input = { customer: { points: 1250, status: "active" } };
const check = checkRule(loyaltyRule, input);

console.log("Passed:", check.result); // true
console.log("Failures:", check.reasons); // []

// 3. Pushdown query to SQL or MongoDB
const sql = compileToSQL(loyaltyRule, { columnStyle: "snake" });
console.log("SQL WHERE:", sql.sql);
// customer_points >= 1000 AND customer_status = 'active'

const mongo = compileToMongo(loyaltyRule);
console.log("Mongo Filter:", JSON.stringify(mongo.filter));
// {"$and":[{"customer.points":{"$gte":1000}},{"customer.status":{"$eq":"active"}}]}
```

---

## License

[MIT](LICENSE)
