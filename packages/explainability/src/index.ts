import type { TraceEntry } from "@qarar/engine-js";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ExplainOptions {
  /** Field label map — override raw paths with friendly names */
  fieldLabels?: Record<string, string>;
  /** Include passing conditions in the explanation. Default: true */
  includePassing?: boolean;
  /** Indent character(s) per level. Default: "  " (2 spaces) */
  indent?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
  // Convert dot-path to readable label: "customer.age" → "Customer age"
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

// ---------------------------------------------------------------------------
// Single-line sentence for a comparison
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Recursive tree builder
// ---------------------------------------------------------------------------

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

  // Logical node
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert an evaluation trace to a human-readable multi-line explanation.
 *
 * @example
 * const { trace } = evaluate(rule, data);
 * console.log(explain(trace));
 * // ❌ All of the following must be true:
 * //   ❌ Age must be greater than 18 (was 16)
 * //   ✅ Plan must be "premium"
 */
export function explain(trace: TraceEntry, options: ExplainOptions = {}): string {
  return explainNode(trace, options, 0).join("\n");
}

/**
 * Return only the failing conditions as a flat list of sentences.
 * Useful for displaying concise error messages to end users.
 */
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

  // Logical — recurse into children
  return entry.children.flatMap((c) => collectFailures(c, options));
}
