#!/usr/bin/env node

/**
 * CLI runner for @qarar/benchmark
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BenchmarkRunner } from "./runner.js";
import { BenchmarkReporter } from "./reporter.js";
import { runMicroSuite } from "./suites/micro.js";
import { runDatasetSuite } from "./suites/dataset.js";
import { runDecisionTableSuite } from "./suites/decision.js";
import type { BenchmarkResult, CLIOptions } from "./types.js";

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    suite: "all",
    rows: 100000,
    format: "table",
    domain: "ecommerce",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--suite" && args[i + 1]) {
      const s = args[++i].toLowerCase();
      if (["all", "micro", "dataset", "decision"].includes(s)) {
        options.suite = s as CLIOptions["suite"];
      }
    } else if (arg === "--rows" && args[i + 1]) {
      const r = parseInt(args[++i], 10);
      if (!Number.isNaN(r) && r > 0) options.rows = r;
    } else if (arg === "--format" && args[i + 1]) {
      const f = args[++i].toLowerCase();
      if (["table", "json", "markdown"].includes(f)) {
        options.format = f as CLIOptions["format"];
      }
    } else if (arg === "--domain" && args[i + 1]) {
      const d = args[++i].toLowerCase();
      if (["ecommerce", "fintech", "healthcare", "all"].includes(d)) {
        options.domain = d as CLIOptions["domain"];
      }
    } else if (arg === "--export" && args[i + 1]) {
      options.exportPath = args[++i];
    }
  }

  return options;
}

function printHelp() {
  console.log(`
⚡ Qarar Performance & Large Dataset Benchmark Tool

USAGE:
  qarar-bench [options]
  pnpm bench [options]

OPTIONS:
  --suite <name>      Which benchmark suite to execute:
                      • all      - Run all benchmark suites (default)
                      • micro    - Run in-memory AST and pushdown microbenchmarks
                      • dataset  - Run large dataset batch stress tests
                      • decision - Run Decision Table scaling tests

  --rows <number>     Number of records to evaluate in dataset tests (default: 100000).
                      Try 10000 (10k), 100000 (100k), or 1000000 (1M).

  --domain <type>     Synthetic domain schema to benchmark:
                      • ecommerce  - Orders, carts, tiers (default)
                      • fintech    - Fraud risk, velocity, KYC
                      • healthcare - HIPAA consent, claims
                      • all        - Benchmark across all 3 domains

  --format <type>     Output format:
                      • table    - ANSI colorized terminal tables (default)
                      • markdown - Clean Markdown table for docs or PRs
                      • json     - Structured JSON payload

  --export <file>     Write formatted output to a file (e.g. results.json or perf.md).

EXAMPLES:
  pnpm bench                                 # Run full benchmark suite
  pnpm bench --suite dataset --rows 1000000  # 1M row stress test
  pnpm bench --suite micro --format markdown # Microbenchmarks in Markdown
  pnpm bench --export ./benchmark.json --format json
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runner = new BenchmarkRunner();
  const allResults: BenchmarkResult[] = [];

  console.log(`\n🚀 Initializing Qarar Benchmark Suite [suite: ${options.suite}, rows: ${options.rows.toLocaleString()}]...`);

  if (options.suite === "all" || options.suite === "micro") {
    console.log(`⏱️  Running Microbenchmarks (100k iterations/test)...`);
    const microResults = await runMicroSuite(runner);
    allResults.push(...microResults);
  }

  if (options.suite === "all" || options.suite === "decision") {
    console.log(`⏱️  Running Decision Table Multi-Branch Benchmarks...`);
    const decisionResults = await runDecisionTableSuite(runner);
    allResults.push(...decisionResults);
  }

  if (options.suite === "all" || options.suite === "dataset") {
    console.log(`⏱️  Running Dataset Stress Test (${options.rows.toLocaleString()} rows)...`);
    const datasetResults = await runDatasetSuite(
      { rows: options.rows, domain: options.domain },
      runner
    );
    allResults.push(...datasetResults);
  }

  // Format and output
  let formattedOutput = "";
  if (options.format === "json") {
    formattedOutput = BenchmarkReporter.formatJson(allResults);
  } else if (options.format === "markdown") {
    formattedOutput = BenchmarkReporter.formatMarkdown(allResults);
  } else {
    formattedOutput = BenchmarkReporter.formatConsole(allResults);
  }

  console.log(formattedOutput);

  // Optional export to file
  if (options.exportPath) {
    const fullPath = resolve(process.cwd(), options.exportPath);
    writeFileSync(fullPath, formattedOutput, "utf-8");
    console.log(`✅ Benchmark results exported to: ${fullPath}\n`);
  }
}

main().catch((err) => {
  console.error("❌ Benchmark error:", err);
  process.exit(1);
});
