---
title: AST Specification
description: Technical breakdown of the portable Qarar JSON Rule AST specification.
---

Qarar rules are represented as technology-agnostic JSON AST trees (`RuleNode`).

## Top-Level Rule Shape

```ts
interface Rule {
  id: string;
  name: string;
  description?: string;
  version: string;
  root: RuleNode;
}
```

## Logical Gates

- **`and`**: Resolves `true` if all child conditions pass.
  ```json
  { "type": "and", "conditions": [ ... ] }
  ```
- **`or`**: Resolves `true` if at least one child condition passes.
  ```json
  { "type": "or", "conditions": [ ... ] }
  ```
- **`not`**: Inverts the inner child condition.
  ```json
  { "type": "not", "condition": { ... } }
  ```

## Comparison Operators

| Operator | Description | Right Value Format |
| :--- | :--- | :--- |
| `eq` | Equals | Scalar (`string`, `number`, `boolean`, `null`) |
| `neq` | Not equals | Scalar |
| `gt` | Greater than | `number` |
| `gte` | Greater than or equal | `number` |
| `lt` | Less than | `number` |
| `lte` | Less than or equal | `number` |
| `in` | Set membership | `array` of scalars |
| `notIn` | Set non-membership | `array` of scalars |
| `between` | Numeric range | `min` and `max` nodes |
| `contains` | Case-insensitive substring match | `string` |
| `startsWith` | Case-insensitive prefix match | `string` |
| `endsWith` | Case-insensitive suffix match | `string` |
| `matches` | Regex pattern test | `string` (regex pattern) |
| `isNull` | Null or undefined check | `{ type: "null" }` |
| `isNotNull` | Non-null check | `{ type: "null" }` |
