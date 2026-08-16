---
title: SQL & MongoDB Compilers API
description: Convert portable Qarar rule ASTs to SQL WHERE clauses and MongoDB query filters.
---

## `compileToSQL(rule, options?)`

Compiles a rule AST into a SQL `WHERE` clause string:

```ts
import { compileToSQL } from "@qarar/sdk";

const { sql } = compileToSQL(rule, { columnStyle: "snake" });
// Result: "customer_age >= 18 AND customer_plan IN ('vip', 'premium')"
```

### Options

- `columnStyle`:
  - `"snake"`: Converts dots to underscores (`customer_age`).
  - `"path"`: Preserves dot notation (`customer.age`).
  - `"quote"`: Double quotes field paths (`"customer"."age"`).

---

## `compileToMongo(rule)`

Compiles a rule AST into a MongoDB filter object:

```ts
import { compileToMongo } from "@qarar/sdk";

const { filter } = compileToMongo(rule);
// Result: { $and: [{ "customer.age": { $gte: 18 } }, ...] }
```
