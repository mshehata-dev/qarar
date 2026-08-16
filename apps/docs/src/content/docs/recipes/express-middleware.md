---
title: Express Middleware Integration Recipe
description: Enforce business rules as middleware guards in Node.js API endpoints.
---

Protect API routes dynamically with Express middleware powered by `@qarar/sdk`.

## Recipe Code

```ts
import express from "express";
import { compileRule, checkRule } from "@qarar/sdk";

const app = express();
app.use(express.json());

// Load rule from DB or config
const premiumGate = compileRule(myRule);

function enforceRuleMiddleware(req, res, next) {
  const context = {
    user: req.user,
    body: req.body,
  };

  const check = checkRule(myRule, context);
  if (!check.result) {
    return res.status(403).json({
      error: "Access Denied by Business Rule",
      reasons: check.reasons,
    });
  }

  next();
}

app.post("/api/premium-feature", enforceRuleMiddleware, (req, res) => {
  res.json({ message: "Welcome to Premium Feature!" });
});
```
