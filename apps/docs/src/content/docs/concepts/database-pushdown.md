---
title: Database Query Pushdown
description: Compiling portable Qarar rule ASTs to SQL and MongoDB queries.
---

When executing business rules across large datasets, running evaluation in Node.js memory can cause severe performance bottlenecks.

Qarar resolves this by enabling **Database Pushdown**:

```text
                  Qarar Rule AST
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
    SQL Compiler                MongoDB Compiler
         │                             │
         ▼                             ▼
SELECT * FROM users WHERE ...   collection.find({ ... })
```

## Compiling to SQL

```ts
import { compileToSQL } from "@qarar/sdk";

const { sql } = compileToSQL(rule, { columnStyle: "snake" });
const query = `SELECT * FROM customers WHERE ${sql}`;
```

## Compiling to MongoDB

```ts
import { compileToMongo } from "@qarar/sdk";

const { filter } = compileToMongo(rule);
const results = await db.collection("customers").find(filter).toArray();
```
