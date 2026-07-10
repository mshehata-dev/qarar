import type { TraceEntry } from "./engine.js";

export interface ExplainOptions {
  fieldLabels?: Record<string, string>;
  includePassing?: boolean;
  indent?: string;
}

const OPERATOR_PHRASES: Record<string, string> = {
  eq: "must be",
  neq: "must not be",
  gt: "must be greater than",
  gte: "must be at least",
  lt: "must be less than",
  lte: "must be at most",
  in: "must be one of",
  notIn: "must not be any of",
  contains: "must contain",
  notContains: "must not contain",
  startsWith: "must start with",
  endsWith: "must end with",
};

function formatField(path: string, labels?: Record<string, string>): string {
  if (labels?.[path]) return labels[path];
  const last = path.split(".").pop() ?? path;
  return last.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

function statusIcon(passed: boolean): string {
  return passed ? "✅" : "❌";
}

function comparisonSentence(entry: Extract<TraceEntry, { type: "comparison" }>, options: ExplainOptions): string {
  const field = formatField(entry.field, options.fieldLabels);
  const phrase = OPERATOR_PHRASES[entry.operator] ?? `must satisfy ${entry.operator}`;
  const expected = formatValue(entry.expected);
  const icon = statusIcon(entry.passed);

  if (entry.passed) {
    return `${icon} ${field} ${phrase} ${expected}`;
  }
  return `${icon} ${field} ${phrase} ${expected} (was ${formatValue(entry.actual)})`;
}

function betweenSentence(entry: Extract<TraceEntry, { type: "between" }>, options: ExplainOptions): string {
  const field = formatField(entry.field, options.fieldLabels);
  const icon = statusIcon(entry.passed);
  if (entry.passed) {
    return `${icon} ${field} must be between ${formatValue(entry.min)} and ${formatValue(entry.max)}`;
  }
  return `${icon} ${field} must be between ${formatValue(entry.min)} and ${formatValue(entry.max)} (was ${formatValue(entry.actual)})`;
}

function explainNode(
  entry: TraceEntry,
  options: ExplainOptions,
  depth: number
): string[] {
  const pad = (options.indent ?? "  ").repeat(depth);
  const includePassing = options.includePassing !== false;

  if (entry.type === "comparison") {
    if (!includePassing && entry.passed) return [];
    return [`${pad}${comparisonSentence(entry, options)}`];
  }

  if (entry.type === "between") {
    if (!includePassing && entry.passed) return [];
    return [`${pad}${betweenSentence(entry, options)}`];
  }

  const icon = statusIcon(entry.passed);
  const label =
    entry.operator === "not"
      ? `${icon} None of the following must be true:`
      : entry.operator === "and"
        ? `${icon} All of the following must be true:`
        : `${icon} At least one of the following must be true:`;

  const childLines = entry.children.flatMap((child) =>
    explainNode(child, options, depth + 1)
  );

  if (childLines.length === 0 && includePassing) {
    return [`${pad}${label}`, `${pad}${(options.indent ?? "  ")}(no conditions)`];
  }

  return [`${pad}${label}`, ...childLines];
}

export function explain(trace: TraceEntry, options: ExplainOptions = {}): string {
  return explainNode(trace, options, 0).join("\n");
}

export function explainFailures(trace: TraceEntry, options: ExplainOptions = {}): string[] {
  return collectFailures(trace, options);
}

function collectFailures(entry: TraceEntry, options: ExplainOptions): string[] {
  if (entry.passed) return [];

  if (entry.type === "comparison") {
    return [comparisonSentence(entry, options)];
  }

  if (entry.type === "between") {
    return [betweenSentence(entry, options)];
  }

  return entry.children.flatMap((c) => collectFailures(c, options));
}
