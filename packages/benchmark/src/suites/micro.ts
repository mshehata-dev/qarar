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

  // 5. Full Pipeline: checkRule (Zod validation + evaluation + explainability string reasons)
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

  return results;
}
