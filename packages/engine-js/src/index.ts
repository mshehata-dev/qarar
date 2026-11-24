import { type RuleNode, type ValueNode, extractFieldPath, parseDynamicFieldExpression } from "@qarar/spec";

// ---------------------------------------------------------------------------
// Trace types
// ---------------------------------------------------------------------------

export type TraceEntry =
  | {
      type: "comparison";
      operator: string;
      field: string;
      actual: unknown;
      expected: unknown;
      passed: boolean;
    }
  | {
      type: "between";
      field: string;
      actual: unknown;
      min: unknown;
      max: unknown;
      passed: boolean;
    }
  | {
      type: "logical";
      operator: "and" | "or" | "not";
      passed: boolean;
      children: TraceEntry[];
    };

export interface EvaluationResult {
  result: boolean;
  trace: TraceEntry;
}

// ---------------------------------------------------------------------------
// Field resolution — supports dot-notation paths like "customer.age"
// ---------------------------------------------------------------------------

function resolvePath(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

// ---------------------------------------------------------------------------
// Date & Duration Parsing Helpers (Zero Dependency UTC / Epoch)
// ---------------------------------------------------------------------------

function parseDateMs(val: unknown): number | null {
  if (typeof val === "number" && !Number.isNaN(val)) {
    return val;
  }
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (val instanceof Date) {
    return val.getTime();
  }
  return null;
}

function parseDurationMs(durationStr: unknown): number | null {
  if (typeof durationStr === "number" && !Number.isNaN(durationStr)) return durationStr;
  if (typeof durationStr !== "string") return null;

  const match = durationStr.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return null;

  const amount = parseFloat(match[1]);
  const unit = match[2] || "ms";

  switch (unit) {
    case "s":
    case "sec":
    case "second":
    case "seconds":
      return amount * 1000;
    case "m":
    case "min":
    case "minute":
    case "minutes":
      return amount * 60 * 1000;
    case "h":
    case "hr":
    case "hour":
    case "hours":
      return amount * 3600 * 1000;
    case "d":
    case "day":
    case "days":
      return amount * 86400 * 1000;
    case "w":
    case "wk":
    case "week":
    case "weeks":
      return amount * 7 * 86400 * 1000;
    case "mo":
    case "month":
    case "months":
      return amount * 30 * 86400 * 1000;
    case "y":
    case "yr":
    case "year":
    case "years":
      return amount * 365 * 86400 * 1000;
    case "ms":
    case "millisecond":
    case "milliseconds":
      return amount;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Value resolution
// ---------------------------------------------------------------------------

function resolveValue(node: ValueNode, data: Record<string, unknown>): unknown {
  switch (node.type) {
    case "field":
      return resolvePath(data, node.path);
    case "string": {
      const parsed = parseDynamicFieldExpression(node.value);
      if (parsed) {
        const base = resolvePath(data, parsed.path);
        if (parsed.offsetOperator && parsed.offsetDuration) {
          const baseMs = parseDateMs(base);
          const offsetMs = parseDurationMs(parsed.offsetDuration);
          if (baseMs !== null && offsetMs !== null) {
            const adjustedMs = parsed.offsetOperator === "+" ? baseMs + offsetMs : baseMs - offsetMs;
            return new Date(adjustedMs).toISOString();
          }
        }
        return base;
      }
      return node.value;
    }
    case "number":
    case "boolean":
      return node.value;
    case "null":
      return null;
    case "array":
      return node.values.map((v) => ("value" in v ? v.value : null));
  }
}

function fieldLabel(node: ValueNode): string {
  if (node.type === "field") return node.path;
  if (node.type === "string") {
    const dynamicField = extractFieldPath(node.value);
    if (dynamicField) return `{{ ${dynamicField} }}`;
    return JSON.stringify(node.value);
  }
  return JSON.stringify((node as { value?: unknown }).value ?? null);
}

// ---------------------------------------------------------------------------
// Comparison execution
// ---------------------------------------------------------------------------

function compare(operator: string, left: unknown, right: unknown): boolean {
  switch (operator) {
    case "eq": {
      if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right)) return false;
        if (left.length !== right.length) return false;
        return left.every((val, i) => val === right[i]);
      }
      return left === right;
    }
    case "neq":
      return !compare("eq", left, right);
    case "isNull":
      return left === null || left === undefined;
    case "isNotNull":
      return left !== null && left !== undefined;
    case "gt":
      return typeof left === "number" && typeof right === "number" ? left > right : false;
    case "gte":
      return typeof left === "number" && typeof right === "number" ? left >= right : false;
    case "lt":
      return typeof left === "number" && typeof right === "number" ? left < right : false;
    case "lte":
      return typeof left === "number" && typeof right === "number" ? left <= right : false;
    case "in":
      return Array.isArray(right) ? right.includes(left) : false;
    case "notIn":
      return Array.isArray(right) ? !right.includes(left) : true;
    case "contains":
      return typeof left === "string" && typeof right === "string"
        ? left.toLowerCase().includes(right.toLowerCase())
        : false;
    case "notContains":
      return typeof left === "string" && typeof right === "string"
        ? !left.toLowerCase().includes(right.toLowerCase())
        : false;
    case "startsWith":
      return typeof left === "string" && typeof right === "string"
        ? left.toLowerCase().startsWith(right.toLowerCase())
        : false;
    case "endsWith":
      return typeof left === "string" && typeof right === "string"
        ? left.toLowerCase().endsWith(right.toLowerCase())
        : false;
    case "matches":
      if (typeof left !== "string" || typeof right !== "string") return false;
      return new RegExp(right, "i").test(left);
    case "notMatches":
      if (typeof left !== "string" || typeof right !== "string") return false;
      return !new RegExp(right, "i").test(left);

    // Array Operations
    case "arrayContains":
      return Array.isArray(left) ? left.includes(right) : false;
    case "notArrayContains":
      return Array.isArray(left) ? !left.includes(right) : false;
    case "arrayContainsAny": {
      if (!Array.isArray(left)) return false;
      const targets = Array.isArray(right) ? right : [right];
      return targets.some((item) => left.includes(item));
    }
    case "arrayContainsAll": {
      if (!Array.isArray(left)) return false;
      const targets = Array.isArray(right) ? right : [right];
      if (targets.length === 0) return true;
      return targets.every((item) => left.includes(item));
    }
    case "arrayContainsNone": {
      if (!Array.isArray(left)) return false;
      const targets = Array.isArray(right) ? right : [right];
      return !targets.some((item) => left.includes(item));
    }
    case "arrayIsEmpty":
      return Array.isArray(left) && left.length === 0;
    case "arrayIsNotEmpty":
      return Array.isArray(left) && left.length > 0;
    case "arrayLength":
      return Array.isArray(left) && typeof right === "number" ? left.length === right : false;
    case "arrayLengthGte":
      return Array.isArray(left) && typeof right === "number" ? left.length >= right : false;
    case "arrayLengthLte":
      return Array.isArray(left) && typeof right === "number" ? left.length <= right : false;
    case "arrayLengthGt":
      return Array.isArray(left) && typeof right === "number" ? left.length > right : false;
    case "arrayLengthLt":
      return Array.isArray(left) && typeof right === "number" ? left.length < right : false;

    // Date & Time Operations
    case "before": {
      const l = parseDateMs(left);
      const r = parseDateMs(right);
      return l !== null && r !== null ? l < r : false;
    }
    case "after": {
      const l = parseDateMs(left);
      const r = parseDateMs(right);
      return l !== null && r !== null ? l > r : false;
    }
    case "olderThan": {
      const l = parseDateMs(left);
      const dur = parseDurationMs(right);
      if (l === null || dur === null) return false;
      return (Date.now() - l) > dur;
    }
    case "withinLast": {
      const l = parseDateMs(left);
      const dur = parseDurationMs(right);
      if (l === null || dur === null) return false;
      const now = Date.now();
      return l <= now && (now - l) <= dur;
    }

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

// ---------------------------------------------------------------------------
// Core evaluator
// ---------------------------------------------------------------------------

function evaluateNode(node: RuleNode, data: Record<string, unknown>): TraceEntry {
  if (node.type === "and") {
    const children = node.conditions.map((c) => evaluateNode(c, data));
    const passed = children.every((c) => c.passed);
    return { type: "logical", operator: "and", passed, children };
  }

  if (node.type === "or") {
    const children = node.conditions.map((c) => evaluateNode(c, data));
    const passed = children.some((c) => c.passed);
    return { type: "logical", operator: "or", passed, children };
  }

  if (node.type === "not") {
    const child = evaluateNode(node.condition, data);
    return {
      type: "logical",
      operator: "not",
      passed: !child.passed,
      children: [child],
    };
  }

  if (node.type === "between") {
    const actual = resolveValue(node.left, data);
    const min = resolveValue(node.min, data);
    const max = resolveValue(node.max, data);
    const passed =
      typeof actual === "number" &&
      typeof min === "number" &&
      typeof max === "number"
        ? actual >= min && actual <= max
        : false;
    return {
      type: "between",
      field: fieldLabel(node.left),
      actual,
      min,
      max,
      passed,
    };
  }

  // Comparison node
  const left = resolveValue(node.left, data);
  const right = resolveValue(node.right, data);
  const passed = compare(node.type, left, right);

  return {
    type: "comparison",
    operator: node.type,
    field: fieldLabel(node.left),
    actual: left,
    expected: right,
    passed,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function evaluate(
  rule: { root: RuleNode },
  data: Record<string, unknown>
): EvaluationResult {
  const trace = evaluateNode(rule.root, data);
  return { result: trace.passed, trace };
}

export { evaluateDecisionTable, type DecisionTableResult, type BranchEvaluation } from "./decisionTable.js";
