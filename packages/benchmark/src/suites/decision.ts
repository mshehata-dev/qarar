/**
 * Decision Table scaling benchmark suite (10, 50, 100 branches).
 */

import { evaluateDecisionTable } from "@qarar/sdk";
import { BenchmarkRunner } from "../runner.js";
import type { BenchmarkResult } from "../types.js";
import { createPricingTable } from "../fixtures.js";
import { DatasetGenerator } from "../generator.js";

export async function runDecisionTableSuite(
  runner: BenchmarkRunner = new BenchmarkRunner()
): Promise<BenchmarkResult[]> {
  const gen = new DatasetGenerator(555);
  const sampleEcom = gen.generateECommerce(0) as unknown as Record<string, unknown>;

  const results: BenchmarkResult[] = [];

  // 1. 10 Branches (First Match vs All Matches)
  const table10First = createPricingTable(10);
  table10First.mode = "first";
  results.push(
    await runner.runMicro(
      "DecisionTable (10 branches, mode: first)",
      "decision",
      () => evaluateDecisionTable(table10First, sampleEcom),
      { targetIterations: 50000 }
    )
  );

  const table10All = createPricingTable(10);
  table10All.mode = "all";
  results.push(
    await runner.runMicro(
      "DecisionTable (10 branches, mode: all)",
      "decision",
      () => evaluateDecisionTable(table10All, sampleEcom),
      { targetIterations: 50000 }
    )
  );

  // 2. 50 Branches (First Match vs All Matches)
  const table50First = createPricingTable(50);
  table50First.mode = "first";
  results.push(
    await runner.runMicro(
      "DecisionTable (50 branches, mode: first)",
      "decision",
      () => evaluateDecisionTable(table50First, sampleEcom),
      { targetIterations: 30000 }
    )
  );

  const table50All = createPricingTable(50);
  table50All.mode = "all";
  results.push(
    await runner.runMicro(
      "DecisionTable (50 branches, mode: all)",
      "decision",
      () => evaluateDecisionTable(table50All, sampleEcom),
      { targetIterations: 30000 }
    )
  );

  return results;
}
