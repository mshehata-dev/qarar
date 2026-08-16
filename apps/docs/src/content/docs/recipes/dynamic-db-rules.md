---
title: Dynamic No-Deploy Rules (Database / Redis / CMS)
description: Store, cache, and execute dynamic JSON rules from PostgreSQL, MongoDB, Redis, or CMS without code redeployments.
---

This recipe shows how to build a dynamic rule engine architecture where business logic lives in a database or cache, allowing instant logic updates without code deployments.

## Architecture

```text
  Admin Portal (React)           Database / Redis             Node.js API Server
 ┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
 │ <RuleBuilder />    ├──────►│ Stores JSON AST    ├──────►│ checkRule(json)    │
 │ Modifies JSON Rule │       │ (e.g. Postgres/Redis)│     │ Instant execution  │
 └────────────────────┘       └────────────────────┘       └────────────────────┘
```

## 1. Database Schema (Postgres / Prisma / TypeORM)

Store Qarar rule ASTs as a `jsonb` or `text` column:

```sql
CREATE TABLE business_rules (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) DEFAULT '1',
  ast JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Dynamic Fetching & Caching Service

Cache rules in Redis or in-memory LRU cache with dynamic invalidation:

```ts
import { checkRule, Rule } from "@qarar/sdk";
import Redis from "ioredis";

const redis = new Redis();

export async function executeDynamicRule(ruleId: string, payload: Record<string, unknown>) {
  // 1. Try fetching JSON rule from Redis cache
  let ruleJSON: Rule;
  const cached = await redis.get(`rule:${ruleId}`);

  if (cached) {
    ruleJSON = JSON.parse(cached);
  } else {
    // 2. Fetch from Database
    const record = await db.query("SELECT ast FROM business_rules WHERE id = $1", [ruleId]);
    ruleJSON = record.rows[0].ast;
    
    // Cache for fast subsequent requests
    await redis.set(`rule:${ruleId}`, JSON.stringify(ruleJSON), "EX", 300);
  }

  // 3. Execute dynamic JSON rule
  return checkRule(ruleJSON, payload);
}
```

## 3. Updating Rules Without Redeploying

When a business user edits a rule in the admin panel:

1. Update the `ast` column in PostgreSQL.
2. Invalidate the Redis key `redis.del("rule:promo-summer")`.
3. The very next user request loads the new JSON rule automatically.

> [!TIP]
> **Zero downtime, zero commits, zero build server wait time!**
