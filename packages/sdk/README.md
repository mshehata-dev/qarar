# @qarar/sdk

Single-package Qarar SDK for JavaScript/TypeScript.

## Install

```bash
pnpm add @qarar/sdk
```

## Usage

```ts
import { safeValidateRule, evaluate, explainFailures } from "@qarar/sdk";

const parsed = safeValidateRule(ruleJson);
if (!parsed.success) {
  throw parsed.error;
}

const result = evaluate(parsed.data, inputData);
const failures = explainFailures(result.trace);
```

## Exports

- `@qarar/sdk` (recommended): core public SDK
- `@qarar/sdk/spec`
- `@qarar/sdk/engine`
- `@qarar/sdk/explainability`

## Publish

From repository root:

```bash
pnpm --filter @qarar/sdk build
pnpm --filter @qarar/sdk test
pnpm --filter @qarar/sdk publish --access public
```

> SQL and Mongo compilers are internal packages and are not part of the public SDK publish surface.
