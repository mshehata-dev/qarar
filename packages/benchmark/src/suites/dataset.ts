/**
 * Large dataset stress testing suite (10,000 to 1,000,000+ rows).
 */

import { evaluate, compileRule } from "@qarar/sdk";
import { BenchmarkRunner } from "../runner.js";
import type { DatasetBenchmarkResult } from "../types.js";
import {
  ecommerceMediumRule,
  fintechFraudRule,
  healthcareConsentRule,
} from "../fixtures.js";
import { DatasetGenerator, DomainType } from "../generator.js";

export interface DatasetSuiteOptions {
  rows?: number;
  domain?: DomainType | "all";
}

export async function runDatasetSuite(
  options: DatasetSuiteOptions = {},
  runner: BenchmarkRunner = new BenchmarkRunner()
): Promise<DatasetBenchmarkResult[]> {
  const rowCount = options.rows ?? 100000;
  const domain = options.domain ?? "ecommerce";
  const gen = new DatasetGenerator(999);

  const results: DatasetBenchmarkResult[] = [];

  const domainsToRun: DomainType[] =
    domain === "all" ? ["ecommerce", "fintech", "healthcare"] : [domain];

  for (const currentDomain of domainsToRun) {
    let ruleToUse = ecommerceMediumRule;
    if (currentDomain === "fintech") ruleToUse = fintechFraudRule;
    if (currentDomain === "healthcare") ruleToUse = healthcareConsentRule;

    const compiled = compileRule(ruleToUse);

    // 1. Generate Dataset
    const dataset = gen.generateBatch<Record<string, unknown>>(rowCount, currentDomain);

    // 2. Test evaluate() across the dataset
    const evalBatch = await runner.runDatasetBatch(
      `evaluate() on ${rowCount.toLocaleString()} ${currentDomain} rows`,
      dataset,
      (row) => evaluate(ruleToUse, row).result
    );

    const matchRatePercent = Math.round((evalBatch.matchedCount / rowCount) * 10000) / 100;

    results.push({
      name: `evaluate() - ${currentDomain.toUpperCase()} (${rowCount.toLocaleString()} rows)`,
      category: "dataset",
      datasetDomain: currentDomain,
      totalRows: rowCount,
      matchedRows: evalBatch.matchedCount,
      matchRatePercent,
      iterations: rowCount,
      durationMs: evalBatch.durationMs,
      opsPerSec: evalBatch.throughputRowsPerSec,
      avgLatencyUs: evalBatch.avgLatencyUs,
      throughputRowsPerSec: evalBatch.throughputRowsPerSec,
      percentiles: evalBatch.percentiles,
      memory: evalBatch.memory,
      notes: `Matched: ${evalBatch.matchedCount.toLocaleString()} / ${rowCount.toLocaleString()} (${matchRatePercent}%)`,
    });

    // 3. Test compileRule() closure across the dataset
    const compiledBatch = await runner.runDatasetBatch(
      `compileRule() on ${rowCount.toLocaleString()} ${currentDomain} rows`,
      dataset,
      (row) => compiled(row).result
    );

    results.push({
      name: `compileRule() - ${currentDomain.toUpperCase()} (${rowCount.toLocaleString()} rows)`,
      category: "dataset",
      datasetDomain: currentDomain,
      totalRows: rowCount,
      matchedRows: compiledBatch.matchedCount,
      matchRatePercent,
      iterations: rowCount,
      durationMs: compiledBatch.durationMs,
      opsPerSec: compiledBatch.throughputRowsPerSec,
      avgLatencyUs: compiledBatch.avgLatencyUs,
      throughputRowsPerSec: compiledBatch.throughputRowsPerSec,
      percentiles: compiledBatch.percentiles,
      memory: compiledBatch.memory,
      notes: `Pre-compiled closure throughput`,
    });
  }

  return results;
}
