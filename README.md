# Qarar

Qarar is a rules and decisioning monorepo with:

- A public JavaScript/TypeScript SDK: `@qarar/sdk`
- A web playground app: `@qarar/playground`
- Internal compiler packages for SQL and Mongo targets

## What Qarar provides

- Rule schema validation (`safeValidateRule`)
- Deterministic rule evaluation with trace output (`evaluate`)
- Human-readable failure explanations (`explainFailures`)
- Playground for visual rule building, test data input, and compiled output inspection

## Monorepo packages

- `@qarar/sdk` (public)
- `@qarar/spec`
- `@qarar/engine-js`
- `@qarar/explainability`
- `@qarar/compiler-sql` (internal/private)
- `@qarar/compiler-mongo` (internal/private)
- `@qarar/playground` (app)

## Local development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm --filter @qarar/playground dev
```

## SDK usage

```ts
import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";

const parsed = safeValidateRule(ruleJson);
if (!parsed.success) throw parsed.error;

const result = evaluate(parsed.data, inputData);
const failures = explainFailures(result.trace);
```

## Publish the SDK

```bash
pnpm run publish:sdk:check
pnpm run publish:sdk
pnpm run smoke:sdk:published
```

> Note: SQL and Mongo compilers are internal packages and are not part of the public SDK surface.
