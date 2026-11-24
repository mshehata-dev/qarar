import { describe, it, expect } from "vitest";
import { DatasetGenerator } from "../generator.js";
import { computePercentiles, getMemorySnapshot, BenchmarkRunner } from "../runner.js";
import { ecommerceSimpleRule } from "../fixtures.js";
import { evaluate } from "@qarar/sdk";

describe("Benchmark Suite Unit Tests", () => {
  describe("DatasetGenerator", () => {
    it("generates deterministic records with fixed seed", () => {
      const gen1 = new DatasetGenerator(12345);
      const gen2 = new DatasetGenerator(12345);

      const ecom1 = gen1.generateECommerce(0);
      const ecom2 = gen2.generateECommerce(0);
      expect(ecom1).toEqual(ecom2);

      const fintech1 = gen1.generateFinTech(1);
      const fintech2 = gen2.generateFinTech(1);
      expect(fintech1).toEqual(fintech2);
    });

    it("generates batches across all domains", () => {
      const gen = new DatasetGenerator();
      const ecomBatch = gen.generateBatch(50, "ecommerce");
      expect(ecomBatch).toHaveLength(50);
      expect(ecomBatch[0]).toHaveProperty("customer");
      expect(ecomBatch[0]).toHaveProperty("cart");

      const fintechBatch = gen.generateBatch(30, "fintech");
      expect(fintechBatch).toHaveLength(30);
      expect(fintechBatch[0]).toHaveProperty("transaction");
      expect(fintechBatch[0]).toHaveProperty("risk");

      const healthBatch = gen.generateBatch(20, "healthcare");
      expect(healthBatch).toHaveLength(20);
      expect(healthBatch[0]).toHaveProperty("patient");
      expect(healthBatch[0]).toHaveProperty("claim");
    });

    it("supports memory-friendly chunking generator", () => {
      const gen = new DatasetGenerator();
      let total = 0;
      for (const chunk of gen.generateChunks(100, 25, "ecommerce")) {
        expect(chunk.length).toBeLessThanOrEqual(25);
        total += chunk.length;
      }
      expect(total).toBe(100);
    });
  });

  describe("Statistics and Percentiles", () => {
    it("computes accurate percentiles for uniform samples", () => {
      const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stats = computePercentiles(samples);

      expect(stats.minUs).toBe(10);
      expect(stats.maxUs).toBe(100);
      expect(stats.meanUs).toBe(55);
      expect(stats.p50Us).toBe(55);
      expect(stats.p90Us).toBe(91);
      expect(stats.stdDevUs).toBeGreaterThan(0);
    });

    it("handles empty and single element samples", () => {
      const empty = computePercentiles([]);
      expect(empty.p50Us).toBe(0);

      const single = computePercentiles([42]);
      expect(single.minUs).toBe(42);
      expect(single.p50Us).toBe(42);
      expect(single.maxUs).toBe(42);
    });

    it("captures valid memory snapshots", () => {
      const mem = getMemorySnapshot();
      expect(mem.heapUsedMB).toBeGreaterThan(0);
      expect(mem.rssMB).toBeGreaterThan(0);
    });
  });

  describe("BenchmarkRunner execution", () => {
    it("executes micro-benchmark and captures metrics", async () => {
      const runner = new BenchmarkRunner();
      let counter = 0;

      const result = await runner.runMicro(
        "test-micro",
        "micro",
        () => { counter++; },
        { warmupIterations: 100, targetIterations: 1000 }
      );

      expect(result.iterations).toBe(1000);
      expect(result.opsPerSec).toBeGreaterThan(0);
      expect(result.avgLatencyUs).toBeGreaterThan(0);
      expect(result.percentiles).toBeDefined();
      expect(counter).toBe(1100);
    });

    it("executes batch dataset benchmark", async () => {
      const runner = new BenchmarkRunner();
      const gen = new DatasetGenerator();
      const dataset = gen.generateBatch<Record<string, unknown>>(500, "ecommerce");

      const result = await runner.runDatasetBatch(
        "test-dataset",
        dataset,
        (row) => evaluate(ecommerceSimpleRule, row).result
      );

      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.throughputRowsPerSec).toBeGreaterThan(0);
      expect(result.matchedCount).toBeGreaterThanOrEqual(0);
    });
  });
});
