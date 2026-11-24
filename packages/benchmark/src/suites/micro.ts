/**
 * Microbenchmark suite for isolated core operations.
 */

import { evaluate, compileRule, checkRule, compileToSQL, compileToMongo } from "@qarar/sdk";
import { BenchmarkRunner } from "../runner.js";
import type { BenchmarkResult } from "../types.js";
import {
  ecommerceSimpleRule,
  ecommerceMediumRule,
  ecommerceComplexRule,
  fintechFraudRule,
  arrayOperationsRule,
  dateOperationsRule,
  dynamicFieldRule,
} from "../fixtures.js";
import { DatasetGenerator } from "../generator.js";

export async function runMicroSuite(runner: BenchmarkRunner = new BenchmarkRunner()): Promise<BenchmarkResult[]> {
  const gen = new DatasetGenerator(12345);
  const sampleEcom = gen.generateECommerce(0);
  const sampleFintech = gen.generateFinTech(0);

  const results: BenchmarkResult[] = [];

  // 1. Simple Rule evaluate vs compileRule
  const compiledSimple = compileRule(ecommerceSimpleRule);
  results.push(
    await runner.runMicro(
      "evaluate() - Simple (age >= 18)",
      "micro",
      () => evaluate(ecommerceSimpleRule, sampleEcom as unknown as Record<string, unknown>),
      { targetIterations: 100000 }
    )
  );

  results.push(
    await runner.runMicro(
      "compileRule() - Simple (age >= 18)",
      "micro",
      () => compiledSimple(sampleEcom as unknown as Record<string, unknown>),
      { targetIterations: 100000 }
    )
  );

  // 2. Medium Rule evaluate vs compileRule
  const compiledMedium = compileRule(ecommerceMediumRule);
  results.push(
    await runner.runMicro(
      "evaluate() - Medium (age >= 18 AND tier IN [...] AND cart >= 100)",
      "micro",
      () => evaluate(ecommerceMediumRule, sampleEcom as unknown as Record<string, unknown>),
      { targetIterations: 100000 }
    )
  );

  results.push(
    await runner.runMicro(
      "compileRule() - Medium (age >= 18 AND tier IN [...] AND cart >= 100)",
      "micro",
      () => compiledMedium(sampleEcom as unknown as Record<string, unknown>),
      { targetIterations: 100000 }
    )
  );

  // 3. Complex Rule evaluate
  const compiledComplex = compileRule(ecommerceComplexRule);
  results.push(
    await runner.runMicro(
      "evaluate() - Complex (Nested AND/OR + In + Between)",
      "micro",
      () => evaluate(ecommerceComplexRule, sampleEcom as unknown as Record<string, unknown>),
      { targetIterations: 100000 }
    )
  );

  results.push(
    await runner.runMicro(
      "compileRule() - Complex (Nested AND/OR + In + Between)",
      "micro",
      () => compiledComplex(sampleEcom as unknown as Record<string, unknown>),
      { targetIterations: 100000 }
    )
  );

  // 4. FinTech Fraud Rule evaluate
  results.push(
    await runner.runMicro(
      "evaluate() - FinTech Fraud Rule",
      "micro",
      () => evaluate(fintechFraudRule, sampleFintech as unknown as Record<string, unknown>),
      { targetIterations: 100000 }
    )
  );

  // 5. Full Pipeline: checkRule (validation + evaluation + explainability string reasons)
  results.push(
    await runner.runMicro(
      "checkRule() - Full Pipeline (Validation + Eval + Explainability)",
      "micro",
      () => checkRule(ecommerceMediumRule, sampleEcom as unknown as Record<string, unknown>),
      { targetIterations: 50000 }
    )
  );

  // 6. Database Pushdown Compilers
  results.push(
    await runner.runMicro(
      "compileToSQL() - AST to SQL WHERE expression",
      "compiler",
      () => compileToSQL(ecommerceComplexRule),
      { targetIterations: 100000 }
    )
  );

  results.push(
    await runner.runMicro(
      "compileToMongo() - AST to MongoDB Filter Object",
      "compiler",
      () => compileToMongo(ecommerceComplexRule),
      { targetIterations: 100000 }
    )
  );

  // 7. Dynamic Fields, Array Ops & Date Ops (Stress Benchmarks)
  const sampleArray = {
    cart: {
      categories: ["books", "electronics", "home"],
    },
  };
  const now = Date.now();
  const sampleDate = {
    order: {
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    user: {
      registeredAt: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
  const sampleDynamic = {
    cart: {
      total: 350,
      itemCount: 4,
    },
    customer: {
      creditLimit: 500,
      maxItems: 10,
    },
  };

  results.push(
    await runner.runMicro(
      "evaluate() - Dynamic Field Comparison (cart.total <= {{customer.creditLimit}})",
      "micro",
      () => evaluate(dynamicFieldRule, sampleDynamic),
      { targetIterations: 100000 }
    )
  );

  results.push(
    await runner.runMicro(
      "evaluate() - Array Ops (arrayContains + arrayLengthGte)",
      "micro",
      () => evaluate(arrayOperationsRule, sampleArray),
      { targetIterations: 100000 }
    )
  );

  results.push(
    await runner.runMicro(
      "evaluate() - Date Ops (withinLast + olderThan)",
      "micro",
      () => evaluate(dateOperationsRule, sampleDate),
      { targetIterations: 100000 }
    )
  );

  results.push(
    await runner.runMicro(
      "compileToSQL() - Dynamic Fields & Array Ops",
      "compiler",
      () => compileToSQL(dynamicFieldRule),
      { targetIterations: 100000 }
    )
  );

  results.push(
    await runner.runMicro(
      "compileToMongo() - Dynamic Fields ($expr) & Array Ops",
      "compiler",
      () => compileToMongo(dynamicFieldRule),
      { targetIterations: 100000 }
    )
  );

  return results;
}
