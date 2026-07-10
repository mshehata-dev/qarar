import type { RuleNode, ValueNode } from "@qarar/spec";

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
// Value resolution
// ---------------------------------------------------------------------------

function resolveValue(node: ValueNode, data: Record<string, unknown>): unknown {
  switch (node.type) {
    case "field":
      return resolvePath(data, node.path);
    case "string":
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
  return node.type === "field" ? node.path : JSON.stringify((node as { value?: unknown }).value ?? null);
}

// ---------------------------------------------------------------------------
// Comparison execution
// ---------------------------------------------------------------------------

function compare(operator: string, left: unknown, right: unknown): boolean {
  switch (operator) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
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
