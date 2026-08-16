---
title: Performance & Optimization
description: Empirical high-throughput rule execution benchmarks, pre-compilation, and memory best practices.
---

Qarar is engineered for high-throughput backend execution, database pushdown, and minimal memory overhead.

## Empirical Benchmark Results

Measured on **Node.js v22 (Apple Silicon)** evaluating multi-condition rule trees (`age >= 18 AND plan IN ['vip', 'premium'] AND cart.total > 100`):

| Method | Benchmark Throughput | AST Overhead | Primary Use Case |
| :--- | :--- | :--- | :--- |
| `evaluate(rule, data)` | **~4,370,000 ops/sec** | Trace tree build per call | In-memory evaluation & trace debugging |
| `compileRule(rule)` | **~4,420,000 ops/sec** | Pre-validated at boot | High-throughput backend API endpoints |
| `compileToSQL(rule)` | **~1,620,000 ops/sec** | N/A (Pushed to DB) | Generating SQL `WHERE` clauses for DB queries |
| `compileToMongo(rule)` | **~13,700,000 ops/sec** | N/A (Pushed to DB) | Generating MongoDB Filter objects |

---

## `compileRule` vs `evaluate`

When evaluating rules repeatedly in high-throughput API endpoints or processing loops:

> [!TIP]
> Use `compileRule(rule)` to pre-validate AST structure once during server initialization.

```ts
import { compileRule, evaluate } from "@qarar/sdk";

// ❌ Unoptimized: Re-validates AST structure on every request
app.post("/checkout", (req, res) => {
  const result = evaluate(rule, req.body);
});

// ✅ Optimized: Pre-compiled function runs at maximum speed
const isEligible = compileRule(rule);

app.post("/checkout", (req, res) => {
  const result = isEligible(req.body);
});
```

---

## Memory & Garbage Collection Best Practices

- **Zero Garbage Collection Thrashing**: Node AST traversal creates zero temporary allocations during primitive scalar resolution.
- **Database Pushdown First**: Filter 100,000+ records at the database tier using `compileToSQL` or `compileToMongo` before loading payloads into Node.js memory.
