/**
 * Types and interfaces for the @qarar/benchmark suite.
 */

export interface LatencyPercentiles {
  minUs: number;
  meanUs: number;
  p50Us: number;
  p90Us: number;
  p95Us: number;
  p99Us: number;
  maxUs: number;
  stdDevUs: number;
}

export interface MemorySnapshot {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
}

export interface MemoryDelta {
  before: MemorySnapshot;
  after: MemorySnapshot;
  deltaHeapMB: number;
  peakRssMB: number;
}

export interface BenchmarkResult {
  name: string;
  category: "micro" | "dataset" | "decision" | "compiler";
  iterations: number;
  durationMs: number;
  opsPerSec: number;
  avgLatencyUs: number;
  percentiles?: LatencyPercentiles;
  memory?: MemoryDelta;
  notes?: string;
}

export interface DatasetBenchmarkResult extends BenchmarkResult {
  datasetDomain: "ecommerce" | "fintech" | "healthcare";
  totalRows: number;
  matchedRows: number;
  matchRatePercent: number;
  throughputRowsPerSec: number;
}

export interface BenchmarkRunnerOptions {
  warmupIterations?: number;
  targetIterations?: number;
  minDurationMs?: number;
  capturePercentiles?: boolean;
  captureMemory?: boolean;
}

export interface CLIOptions {
  suite: "all" | "micro" | "dataset" | "decision";
  rows: number;
  format: "table" | "json" | "markdown";
  exportPath?: string;
  domain?: "ecommerce" | "fintech" | "healthcare" | "all";
}
