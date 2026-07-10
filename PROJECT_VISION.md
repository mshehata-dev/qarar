# Qarar - Project Vision & Architecture

## Executive Summary

Qarar is an open standard and platform for creating, managing, testing, explaining, and executing business rules.

The goal is not to build another rule engine.

The goal is to create an ecosystem similar to what OpenAPI did for APIs:

* A portable rule specification.
* Multiple language implementations.
* Visual rule authoring.
* AI-assisted rule generation.
* Rule testing and explainability.
* Multiple execution targets.

Qarar should allow a rule created once to be:

* Executed in TypeScript
* Executed in Go
* Executed in Java
* Executed in Python
* Executed in Dart/Flutter
* Converted to SQL
* Converted to MongoDB queries
* Converted to Elasticsearch queries
* Converted to GraphQL filters

without modifying the rule definition.

---

# Core Philosophy

The primary users of Qarar are NOT software engineers.

Target users:

* Account Managers
* Customer Success Teams
* Technical Support
* Operations Teams
* Product Managers
* Business Analysts
* Risk Teams
* Compliance Teams

Engineers are consumers and integrators.

Business users are the authors.

The platform must therefore prioritize:

1. Simplicity
2. Explainability
3. Visual authoring
4. Testing
5. Collaboration
6. AI assistance

over raw technical complexity.

---

# Product Vision

Qarar should become a complete Rule Studio.

Users should be able to:

1. Describe rules in natural language.
2. Generate rules visually.
3. Test rules against sample data.
4. Understand why rules passed or failed.
5. Share and reuse rules.
6. Export rules to multiple runtimes.

---

# Architecture Overview

```text
                Qarar Studio

 ┌────────────────────────────────────┐
 │ Natural Language Rule Creation     │
 └────────────────────────────────────┘
                  │
                  ▼

 ┌────────────────────────────────────┐
 │ Visual Rule Builder                │
 └────────────────────────────────────┘
                  │
                  ▼

 ┌────────────────────────────────────┐
 │ Qarar Specification            │
 │ Portable Rule JSON AST             │
 └────────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼

  Rule Engine  SQL      Mongo
  TypeScript   Compiler Compiler

        ▼
   Evaluation
   Trace
   Explainability
```

---

# JavaScript Packaging Strategy

To keep adoption simple, Qarar should present a single primary JavaScript npm package:

* `@qarar/sdk`

This SDK should expose validation, evaluation, and explainability from one import surface.
Additional runtimes (Go/Java/Python/etc.) are separate implementations, not required for JavaScript users.

Note: SQL and Mongo compilers are internal tools in this repository and are not part of the public npm publishing plan.

---

# Monorepo Structure

```text
qarar/

├── apps/
│   ├── playground
│   ├── studio
│   └── docs
│
├── packages/
│   ├── spec
│   ├── engine-js
│   ├── compiler-sql
│   ├── compiler-mongo
│   ├── react-builder
│   ├── explainability
│   ├── schema-system
│   └── test-suite
│
├── examples/
│
└── docs/
```

---

# Core Components

## 1. Specification Package

Purpose:

Define the official Qarar standard.

Responsibilities:

* AST definitions
* Operator definitions
* Versioning
* Validation schemas
* Serialization rules

This package must contain zero runtime execution logic.

---

## 2. Engine Package

Purpose:

Execute Qarar AST.

Responsibilities:

* Rule evaluation
* Field resolution
* Operator execution
* Evaluation traces

Public API:

```ts
evaluate(rule, data)
```

Result:

```ts
{
  result: boolean,
  trace: [...]
}
```

---

## 3. Visual Builder

Purpose:

Allow non-technical users to build rules.

Must be schema-driven.

No hardcoded business fields.

The builder should consume metadata such as:

```json
{
  "field": "customer.age",
  "label": "Customer Age",
  "type": "number",
  "operators": ["gt", "gte", "lt"]
}
```

The UI is generated from schema definitions.

---

## 4. Playground

Purpose:

Test rules.

This is considered a first-class product.

Features:

* Rule editor
* Visual builder
* Sample data editor
* Execution result viewer
* Trace viewer
* Rule explanation panel

The playground should become the equivalent of:

* Swagger UI
* Postman
* GraphQL Playground

for business rules.

---

## 5. Explainability Engine

Purpose:

Answer:

"Why did this rule pass?"

or

"Why did this rule fail?"

Example:

```json
{
  "result": false,
  "trace": [
    {
      "field": "age",
      "actual": 16,
      "expected": ">18",
      "passed": false
    }
  ]
}
```

This feature is critical for support and operations teams.

---

# Rule Representation

Use explicit AST nodes.

Avoid language-specific expressions.

Good:

```json
{
  "type": "gt",
  "left": {
    "type": "field",
    "path": "customer.age"
  },
  "right": {
    "type": "number",
    "value": 18
  }
}
```

Bad:

```js
customer.age > 18
```

Rules must remain portable.

---

# Universal Type System

Supported types:

```text
string
number
boolean
date
datetime
enum
array
object
```

No language-specific types should exist in the specification.

---

# Initial Operator Set

Logical:

* and
* or
* not

Comparison:

* eq
* neq
* gt
* gte
* lt
* lte

Future:

* contains
* startsWith
* endsWith
* in
* between
* regex

---

# AI-Assisted Rule Creation

Future but strategic.

User writes:

```text
Customers in Egypt over 18 with Premium subscriptions.
```

AI generates:

1. Qarar AST
2. Visual builder structure
3. Human-readable explanation

The visual builder and generated rule must always stay synchronized.

---

# Explainability UI

Example:

```text
AND
├── Age > 18 ❌
│   └── Actual: 16
│
└── Country = EG ✅
```

This is a key differentiator.

Support teams should understand rule behavior without involving engineering.

---

# Future Features

## Rule Marketplace

Reusable rules:

* Fraud Detection
* Eligibility
* Promotions
* Discounts
* Loyalty Programs

---

## Rule Recorder

Observe user actions and generate rule structures.

Example:

User selects:

Country = Egypt
Plan = Premium

Generated rule:

```json
{
  ...
}
```

---

## Browser Extension

Allow support teams to:

* Capture live page data
* Generate test payloads
* Launch Playground automatically

Example:

```json
{
  "country": "EG",
  "plan": "PREMIUM",
  "age": 25
}
```

---

# MVP Scope

## Phase 1

Specification

* AST
* Validation
* Type definitions

Engine

* Field resolution
* Basic operators
* Evaluation trace

Playground

* Rule editor
* JSON editor
* Test data editor
* Trace viewer

Builder

* AND
* OR
* NOT
* Comparison operators

---

## Phase 2

* Go Engine
* SQL Compiler
* Mongo Compiler
* Elasticsearch Compiler

---

## Phase 3

* AI Rule Generation
* Rule Marketplace
* Browser Extension
* Rule Recorder
* Collaboration Features

---

# Beta Launch Readiness Checklist (Current Playground)

Before public beta, verify the following in the playground:

1. Rule authoring
   * Builder and JSON modes both work and stay synchronized.
   * Dynamic schema updates based on user-provided JSON/CSV/Form data.
2. Data handling
   * CSV key-value and header-row formats parse correctly.
   * Large payload guardrails and clear validation errors are shown.
3. Operator coverage
   * Core set: eq, neq, gt, gte, lt, lte, in, notIn, between.
   * String set: contains, notContains, startsWith, endsWith, matches, notMatches.
   * Nullability set: isNull, isNotNull.
4. Explainability + compilers
   * Evaluation trace is visible and understandable.
   * SQL and Mongo outputs compile and can be copied.
5. UAT regression
   * Run built-in UAT example set and confirm expected pass/fail outcomes.
6. Workspace quality
   * Theme switching (dark/light) and side navigation are stable.
   * Workspace persistence (load/save/reset) behaves predictably.

---

# Non-Negotiable Principles

1. Specification first.
2. Builder is schema-driven.
3. Rules are portable.
4. No language-specific syntax.
5. Explainability is mandatory.
6. Testing is a first-class feature.
7. AI should enhance, not replace, visual authoring.
8. Every feature must support non-technical users.
9. Qarar JSON is the source of truth.
10. Long-term goal: become the industry-standard format for business rules.
