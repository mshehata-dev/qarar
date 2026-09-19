/**
 * Statistical benchmarking engine with nanosecond precision and memory profiling.
 */

import { performance } from "node:perf_hooks";
import type {
  BenchmarkResult,
  BenchmarkRunnerOptions,
  LatencyPercentiles,
  MemoryDelta,
  MemorySnapshot,
} from "./types.js";

export function getMemorySnapshot(): MemorySnapshot {
  const mem = process.memoryUsage();
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;
  return {
    heapUsedMB: toMB(mem.heapUsed),
    heapTotalMB: toMB(mem.heapTotal),
    rssMB: toMB(mem.rss),
    externalMB: toMB(mem.external),
  };
}

export function computePercentiles(samplesUs: number[]): LatencyPercentiles {
  if (samplesUs.length === 0) {
    return { minUs: 0, meanUs: 0, p50Us: 0, p90Us: 0, p95Us: 0, p99Us: 0, maxUs: 0, stdDevUs: 0 };
  }

  // Sort ascending for quantile calculation
  const sorted = [...samplesUs].sort((a, b) => a - b);
  const n = sorted.length;
  const minUs = sorted[0];
  const maxUs = sorted[n - 1];

  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const meanUs = sum / n;

  const quantile = (q: number) => {
    const pos = (n - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  };

  const p50Us = quantile(0.5);
  const p90Us = quantile(0.9);
  const p95Us = quantile(0.95);
  const p99Us = quantile(0.99);

  // Variance & Standard Deviation
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - meanUs, 2), 0) / n;
  const stdDevUs = Math.sqrt(variance);

  const round = (v: number) => Math.round(v * 1000) / 1000;

  return {
    minUs: round(minUs),
    meanUs: round(meanUs),
    p50Us: round(p50Us),
    p90Us: round(p90Us),
    p95Us: round(p95Us),
    p99Us: round(p99Us),
    maxUs: round(maxUs),
    stdDevUs: round(stdDevUs),
  };
}

export class BenchmarkRunner {
  /**
   * Benchmarks an isolated micro-operation repeatedly over many iterations.
   */
  async runMicro(
    name: string,
    category: BenchmarkResult["category"],
    fn: () => unknown,
    options: BenchmarkRunnerOptions = {}
  ): Promise<BenchmarkResult> {
    const warmup = options.warmupIterations ?? 2000;
    const targetIterations = options.targetIterations ?? 100000;
    const capturePercentiles = options.capturePercentiles ?? true;

    // 1. Warmup loop to allow V8 JIT compiler optimization
    for (let i = 0; i < warmup; i++) {
      fn();
    }

    // Force GC if node was launched with --expose-gc
    const g = globalThis as unknown as { gc?: () => void };
    if (typeof g.gc === "function") {
      g.gc();
    }

    const memBefore = getMemorySnapshot();
    const samplesUs: number[] = capturePercentiles ? [] : [];

    // 2. High-precision measurement run
    const startTimeNs = process.hrtime.bigint();

    if (capturePercentiles) {
      // Sample a subset if target iterations is huge to prevent sample array allocation skew
      const sampleStride = targetIterations > 200000 ? Math.floor(targetIterations / 100000) : 1;
      for (let i = 0; i < targetIterations; i++) {
        if (i % sampleStride === 0) {
          const t0 = process.hrtime.bigint();
          fn();
          const t1 = process.hrtime.bigint();
          samplesUs.push(Number(t1 - t0) / 1000); // Nanoseconds to microseconds
        } else {
          fn();
        }
      }
    } else {
      for (let i = 0; i < targetIterations; i++) {
        fn();
      }
    }

    const endTimeNs = process.hrtime.bigint();
    const memAfter = getMemorySnapshot();

    const durationMs = Number(endTimeNs - startTimeNs) / 1_000_000;
    const opsPerSec = Math.round((targetIterations / (durationMs / 1000)));
    const avgLatencyUs = Math.round(((durationMs * 1000) / targetIterations) * 1000) / 1000;

    const percentiles = capturePercentiles ? computePercentiles(samplesUs) : undefined;
    const memory: MemoryDelta = {
      before: memBefore,
      after: memAfter,
      deltaHeapMB: Math.round((memAfter.heapUsedMB - memBefore.heapUsedMB) * 100) / 100,
      peakRssMB: Math.max(memBefore.rssMB, memAfter.rssMB),
    };

    return {
      name,
      category,
      iterations: targetIterations,
      durationMs: Math.round(durationMs * 100) / 100,
      opsPerSec,
      avgLatencyUs,
      percentiles,
      memory,
    };
  }

  /**
   * Benchmarks evaluation across an entire dataset array in batch mode.
   */
  async runDatasetBatch<T extends Record<string, unknown>>(
    name: string,
    dataset: T[],
    evaluateFn: (item: T) => boolean
  ): Promise<{
    matchedCount: number;
    durationMs: number;
    throughputRowsPerSec: number;
    avgLatencyUs: number;
    percentiles: LatencyPercentiles;
    memory: MemoryDelta;
  }> {
    const g = globalThis as unknown as { gc?: () => void };
    if (typeof g.gc === "function") {
      g.gc();
    }

    const memBefore = getMemorySnapshot();
    const count = dataset.length;
    const samplesUs: number[] = [];
    const sampleStride = count > 100000 ? Math.floor(count / 50000) : 1;

    let matchedCount = 0;
    const startTimeNs = process.hrtime.bigint();

    for (let i = 0; i < count; i++) {
      if (i % sampleStride === 0) {
        const t0 = process.hrtime.bigint();
        const res = evaluateFn(dataset[i]);
        const t1 = process.hrtime.bigint();
        samplesUs.push(Number(t1 - t0) / 1000);
        if (res) matchedCount++;
      } else {
        if (evaluateFn(dataset[i])) matchedCount++;
      }
    }

    const endTimeNs = process.hrtime.bigint();
    const memAfter = getMemorySnapshot();

    const durationMs = Number(endTimeNs - startTimeNs) / 1_000_000;
    const throughputRowsPerSec = Math.round(count / (durationMs / 1000));
    const avgLatencyUs = Math.round(((durationMs * 1000) / count) * 1000) / 1000;
    const percentiles = computePercentiles(samplesUs);

    const memory: MemoryDelta = {
      before: memBefore,
      after: memAfter,
      deltaHeapMB: Math.round((memAfter.heapUsedMB - memBefore.heapUsedMB) * 100) / 100,
      peakRssMB: Math.max(memBefore.rssMB, memAfter.rssMB),
    };

    return {
      matchedCount,
      durationMs: Math.round(durationMs * 100) / 100,
      throughputRowsPerSec,
      avgLatencyUs,
      percentiles,
      memory,
    };
  }
}
