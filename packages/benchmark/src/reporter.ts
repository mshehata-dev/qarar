/**
 * Result formatters: ANSI colored terminal tables, Markdown tables, and JSON reports.
 */

import type { BenchmarkResult, DatasetBenchmarkResult } from "./types.js";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m\x1b[30m",
};

export class BenchmarkReporter {
  static formatConsole(results: BenchmarkResult[]): string {
    const lines: string[] = [];

    lines.push("");
    lines.push(`${ANSI.bold}${ANSI.cyan}⚡ Qarar Benchmark & Performance Report${ANSI.reset}`);
    lines.push(`${ANSI.dim}Platform: Node.js ${process.version} (${process.platform} ${process.arch})${ANSI.reset}`);
    lines.push(`${ANSI.dim}Timestamp: ${new Date().toISOString()}${ANSI.reset}`);
    lines.push("");

    // Group by category
    const categories: BenchmarkResult["category"][] = ["micro", "dataset", "decision", "compiler"];
    const categoryLabels: Record<string, string> = {
      micro: "🔬 Micro-Operations (In-Memory Execution)",
      dataset: "📊 Large Dataset Stress Tests",
      decision: "🔀 Decision Table Multi-Branch Scaling",
      compiler: "🗄️ Database Query Pushdown Compilers",
    };

    for (const cat of categories) {
      const catResults = results.filter((r) => r.category === cat);
      if (catResults.length === 0) continue;

      lines.push(`${ANSI.bold}${ANSI.yellow}${categoryLabels[cat] || cat}${ANSI.reset}`);
      lines.push(
        `${ANSI.dim}─`.repeat(105) + ANSI.reset
      );

      // Header row
      const header = [
        "Benchmark Target".padEnd(46),
        "Throughput (ops/s)".padStart(20),
        "Avg (µs)".padStart(11),
        "p50 (µs)".padStart(10),
        "p95 (µs)".padStart(10),
        "Heap (MB)".padStart(12),
      ].join(" ");
      lines.push(`${ANSI.bold}${header}${ANSI.reset}`);
      lines.push(`${ANSI.dim}─`.repeat(105) + ANSI.reset);

      for (const res of catResults) {
        const name = res.name.length > 44 ? res.name.slice(0, 41) + "..." : res.name;
        const throughput = `${res.opsPerSec.toLocaleString()} ops/s`;
        const avg = `${res.avgLatencyUs.toFixed(2)} µs`;
        const p50 = res.percentiles ? `${res.percentiles.p50Us.toFixed(2)} µs` : "-";
        const p95 = res.percentiles ? `${res.percentiles.p95Us.toFixed(2)} µs` : "-";
        const heap = res.memory ? `${res.memory.deltaHeapMB >= 0 ? "+" : ""}${res.memory.deltaHeapMB.toFixed(2)} MB` : "-";

        // Color coding throughput
        const colorThroughput =
          res.opsPerSec >= 2_000_000
            ? ANSI.green
            : res.opsPerSec >= 500_000
            ? ANSI.cyan
            : res.opsPerSec >= 100_000
            ? ANSI.yellow
            : ANSI.white;

        const row = [
          name.padEnd(46),
          `${colorThroughput}${throughput.padStart(20)}${ANSI.reset}`,
          avg.padStart(11),
          p50.padStart(10),
          p95.padStart(10),
          `${ANSI.dim}${heap.padStart(12)}${ANSI.reset}`,
        ].join(" ");

        lines.push(row);

        // Print extra notes for dataset match rate
        if (res.notes) {
          lines.push(`   ${ANSI.dim}↳ ${res.notes}${ANSI.reset}`);
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  static formatMarkdown(results: BenchmarkResult[]): string {
    const lines: string[] = [];

    lines.push("### Qarar Empirical Performance Benchmarks");
    lines.push("");
    lines.push(`*Generated on Node.js ${process.version} (${process.platform} ${process.arch}) on ${new Date().toISOString().split("T")[0]}*`);
    lines.push("");
    lines.push("| Benchmark Target | Category | Throughput | Avg Latency | p50 (Median) | p95 | Heap Delta |");
    lines.push("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |");

    for (const res of results) {
      const p50 = res.percentiles ? `${res.percentiles.p50Us} µs` : "N/A";
      const p95 = res.percentiles ? `${res.percentiles.p95Us} µs` : "N/A";
      const heap = res.memory ? `${res.memory.deltaHeapMB >= 0 ? "+" : ""}${res.memory.deltaHeapMB} MB` : "N/A";

      lines.push(
        `| **${res.name}** | \`${res.category}\` | **${res.opsPerSec.toLocaleString()} ops/sec** | ${res.avgLatencyUs} µs | ${p50} | ${p95} | ${heap} |`
      );
    }

    lines.push("");
    return lines.join("\n");
  }

  static formatJson(results: BenchmarkResult[]): string {
    const payload = {
      platform: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: process.env.NUMBER_OF_PROCESSORS || "unknown",
      },
      timestamp: new Date().toISOString(),
      results,
    };
    return JSON.stringify(payload, null, 2);
  }
}
