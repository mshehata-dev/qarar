// ---------------------------------------------------------------------------
// Qarar Core Specification — Zero Dependencies Pure TypeScript AST
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Value Nodes
// ---------------------------------------------------------------------------

export interface FieldNode {
  type: "field";
  path: string;
}

export interface StringValue {
  type: "string";
  value: string;
}

export interface NumberValue {
  type: "number";
  value: number;
}

export interface BooleanValue {
  type: "boolean";
  value: boolean;
}

export interface NullValue {
  type: "null";
}

export type ScalarValue = StringValue | NumberValue | BooleanValue | NullValue;

export interface ArrayValue {
  type: "array";
  values: ScalarValue[];
}

export type ValueNode = FieldNode | ScalarValue | ArrayValue;

// ---------------------------------------------------------------------------
// Comparison Operators
// ---------------------------------------------------------------------------

export const COMPARISON_OPERATORS = [
  "eq",
  "neq",
  "isNull",
  "isNotNull",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "notIn",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "matches",
  "notMatches",
] as const;

export type ComparisonOp = (typeof COMPARISON_OPERATORS)[number];

const COMPARISON_OP_SET: Set<string> = new Set(COMPARISON_OPERATORS);

export interface ComparisonNode {
  type: ComparisonOp;
  left: ValueNode;
  right: ValueNode;
}

export interface BetweenNode {
  type: "between";
  left: ValueNode;
  min: ValueNode;
  max: ValueNode;
}

export interface AndNode {
  type: "and";
  conditions: RuleNode[];
}

export interface OrNode {
  type: "or";
  conditions: RuleNode[];
}

export interface NotNode {
  type: "not";
  condition: RuleNode;
}

export type RuleNode = ComparisonNode | BetweenNode | AndNode | OrNode | NotNode;

// ---------------------------------------------------------------------------
// Top-Level Rule
// ---------------------------------------------------------------------------

export interface Rule {
  id: string;
  name: string;
  description?: string;
  version: string;
  root: RuleNode;
}

// ---------------------------------------------------------------------------
// Validation Error Structure
// ---------------------------------------------------------------------------

export interface ValidationErrorIssue {
  path: string[];
  message: string;
}

export class ValidationError extends Error {
  readonly issues: ValidationErrorIssue[];

  constructor(message: string, issues: ValidationErrorIssue[] = []) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

// ---------------------------------------------------------------------------
// Pure TypeScript Fast Validators
// ---------------------------------------------------------------------------

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function validateScalar(val: unknown, path: string[], issues: ValidationErrorIssue[]): val is ScalarValue {
  if (!isObject(val)) {
    issues.push({ path, message: "Scalar value must be an object" });
    return false;
  }
  const t = val.type;
  if (t === "string") {
    if (typeof val.value !== "string") {
      issues.push({ path: [...path, "value"], message: "Expected string value" });
      return false;
    }
    return true;
  }
  if (t === "number") {
    if (typeof val.value !== "number" || Number.isNaN(val.value)) {
      issues.push({ path: [...path, "value"], message: "Expected number value" });
      return false;
    }
    return true;
  }
  if (t === "boolean") {
    if (typeof val.value !== "boolean") {
      issues.push({ path: [...path, "value"], message: "Expected boolean value" });
      return false;
    }
    return true;
  }
  if (t === "null") {
    return true;
  }
  issues.push({ path: [...path, "type"], message: `Invalid scalar type: "${String(t)}"` });
  return false;
}

export function validateValueNode(val: unknown, path: string[], issues: ValidationErrorIssue[]): val is ValueNode {
  if (!isObject(val)) {
    issues.push({ path, message: "ValueNode must be an object" });
    return false;
  }
  const t = val.type;
  if (t === "field") {
    if (typeof val.path !== "string" || val.path.length === 0) {
      issues.push({ path: [...path, "path"], message: "Field path must be a non-empty string" });
      return false;
    }
    return true;
  }
  if (t === "array") {
    if (!Array.isArray(val.values) || val.values.length === 0) {
      issues.push({ path: [...path, "values"], message: "Array values must be a non-empty array" });
      return false;
    }
    let allValid = true;
    for (let i = 0; i < val.values.length; i++) {
      if (!validateScalar(val.values[i], [...path, "values", String(i)], issues)) {
        allValid = false;
      }
    }
    return allValid;
  }
  return validateScalar(val, path, issues);
}

export function validateRuleNode(node: unknown, path: string[], issues: ValidationErrorIssue[]): node is RuleNode {
  if (!isObject(node)) {
    issues.push({ path, message: "RuleNode must be an object" });
    return false;
  }

  const type = node.type;
  if (typeof type !== "string") {
    issues.push({ path: [...path, "type"], message: "RuleNode type must be a string" });
    return false;
  }

  if (type === "and" || type === "or") {
    if (!Array.isArray(node.conditions) || node.conditions.length === 0) {
      issues.push({ path: [...path, "conditions"], message: `${type.toUpperCase()} conditions must be a non-empty array` });
      return false;
    }
    let allValid = true;
    for (let i = 0; i < node.conditions.length; i++) {
      if (!validateRuleNode(node.conditions[i], [...path, "conditions", String(i)], issues)) {
        allValid = false;
      }
    }
    return allValid;
  }

  if (type === "not") {
    if (!node.condition) {
      issues.push({ path: [...path, "condition"], message: "NOT node requires a condition" });
      return false;
    }
    return validateRuleNode(node.condition, [...path, "condition"], issues);
  }

  if (type === "between") {
    let valid = true;
    if (!node.left || !validateValueNode(node.left, [...path, "left"], issues)) valid = false;
    if (!node.min || !validateValueNode(node.min, [...path, "min"], issues)) valid = false;
    if (!node.max || !validateValueNode(node.max, [...path, "max"], issues)) valid = false;
    return valid;
  }

  if (COMPARISON_OP_SET.has(type)) {
    let valid = true;
    if (!node.left || !validateValueNode(node.left, [...path, "left"], issues)) valid = false;
    if (!node.right || !validateValueNode(node.right, [...path, "right"], issues)) valid = false;
    return valid;
  }

  issues.push({ path: [...path, "type"], message: `Unknown operator or node type: "${type}"` });
  return false;
}

export function validateRule(input: unknown): Rule {
  const result = safeValidateRule(input);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

export function safeValidateRule(input: unknown): ValidationResult<Rule> {
  const issues: ValidationErrorIssue[] = [];

  if (!isObject(input)) {
    issues.push({ path: [], message: "Rule must be an object" });
    return { success: false, error: new ValidationError("Invalid Rule input", issues) };
  }

  if (typeof input.id !== "string" || input.id.length === 0) {
    issues.push({ path: ["id"], message: "Rule id must be a non-empty string" });
  }

  if (typeof input.name !== "string" || input.name.length === 0) {
    issues.push({ path: ["name"], message: "Rule name must be a non-empty string" });
  }

  if (input.description !== undefined && typeof input.description !== "string") {
    issues.push({ path: ["description"], message: "Rule description must be a string" });
  }

  const version = typeof input.version === "string" && input.version.length > 0 ? input.version : "1";

  if (!input.root) {
    issues.push({ path: ["root"], message: "Rule root is required" });
  } else {
    validateRuleNode(input.root, ["root"], issues);
  }

  if (issues.length > 0) {
    return {
      success: false,
      error: new ValidationError(`Rule validation failed with ${issues.length} error(s): ${issues[0].message}`, issues),
    };
  }

  return {
    success: true,
    data: {
      id: input.id as string,
      name: input.name as string,
      description: input.description as string | undefined,
      version,
      root: input.root as RuleNode,
    },
  };
}

// ---------------------------------------------------------------------------
// Decision Table Specification & Validators
// ---------------------------------------------------------------------------

export interface DecisionBranch<T = unknown> {
  id: string;
  name?: string;
  description?: string;
  condition: RuleNode;
  output: T;
}

export interface DecisionTable<T = unknown> {
  id: string;
  name: string;
  description?: string;
  version: string;
  mode?: "first" | "all";
  defaultOutput: T;
  branches: DecisionBranch<T>[];
}

export function validateDecisionTable<T = unknown>(input: unknown): DecisionTable<T> {
  const res = safeValidateDecisionTable<T>(input);
  if (!res.success) {
    throw res.error;
  }
  return res.data;
}

export function safeValidateDecisionTable<T = unknown>(input: unknown): ValidationResult<DecisionTable<T>> {
  const issues: ValidationErrorIssue[] = [];

  if (!isObject(input)) {
    issues.push({ path: [], message: "DecisionTable must be an object" });
    return { success: false, error: new ValidationError("Invalid DecisionTable input", issues) };
  }

  if (typeof input.id !== "string" || input.id.length === 0) {
    issues.push({ path: ["id"], message: "DecisionTable id must be a non-empty string" });
  }

  if (typeof input.name !== "string" || input.name.length === 0) {
    issues.push({ path: ["name"], message: "DecisionTable name must be a non-empty string" });
  }

  if (input.description !== undefined && typeof input.description !== "string") {
    issues.push({ path: ["description"], message: "DecisionTable description must be a string" });
  }

  const version = typeof input.version === "string" && input.version.length > 0 ? input.version : "1";
  const mode = input.mode === "all" ? "all" : "first";

  if (!("defaultOutput" in input)) {
    issues.push({ path: ["defaultOutput"], message: "DecisionTable requires defaultOutput" });
  }

  if (!Array.isArray(input.branches)) {
    issues.push({ path: ["branches"], message: "DecisionTable branches must be an array" });
  } else {
    for (let i = 0; i < input.branches.length; i++) {
      const b = input.branches[i];
      const bPath = ["branches", String(i)];
      if (!isObject(b)) {
        issues.push({ path: bPath, message: "Branch must be an object" });
        continue;
      }
      if (typeof b.id !== "string" || b.id.length === 0) {
        issues.push({ path: [...bPath, "id"], message: "Branch id must be a non-empty string" });
      }
      if (!b.condition) {
        issues.push({ path: [...bPath, "condition"], message: "Branch condition is required" });
      } else {
        validateRuleNode(b.condition, [...bPath, "condition"], issues);
      }
      if (!("output" in b)) {
        issues.push({ path: [...bPath, "output"], message: "Branch output is required" });
      }
    }
  }

  if (issues.length > 0) {
    return {
      success: false,
      error: new ValidationError(`DecisionTable validation failed with ${issues.length} error(s)`, issues),
    };
  }

  return {
    success: true,
    data: {
      id: input.id as string,
      name: input.name as string,
      description: input.description as string | undefined,
      version,
      mode,
      defaultOutput: input.defaultOutput as T,
      branches: input.branches as DecisionBranch<T>[],
    },
  };
}

// ---------------------------------------------------------------------------
// Schema Helpers (Zero-dependency drop-in .parse() and .safeParse() API)
// ---------------------------------------------------------------------------

export const RuleSchema = {
  parse: (input: unknown): Rule => validateRule(input),
  safeParse: (input: unknown) => safeValidateRule(input),
};

export const DecisionTableSchema = {
  parse: <T = unknown>(input: unknown): DecisionTable<T> => validateDecisionTable<T>(input),
  safeParse: <T = unknown>(input: unknown) => safeValidateDecisionTable<T>(input),
};

export const FieldNodeSchema = {
  parse: (input: unknown): FieldNode => {
    if (!isObject(input) || input.type !== "field" || typeof input.path !== "string" || !input.path) {
      throw new ValidationError("Invalid FieldNode");
    }
    return input as unknown as FieldNode;
  },
};

export const ValueNodeSchema = {
  parse: (input: unknown): ValueNode => {
    const issues: ValidationErrorIssue[] = [];
    if (!validateValueNode(input, [], issues)) {
      throw new ValidationError("Invalid ValueNode", issues);
    }
    return input as ValueNode;
  },
};

export const DecisionBranchSchema = {
  parse: <T = unknown>(input: unknown): DecisionBranch<T> => {
    if (!isObject(input) || typeof input.id !== "string" || !input.condition || !("output" in input)) {
      throw new ValidationError("Invalid DecisionBranch");
    }
    return input as unknown as DecisionBranch<T>;
  },
};
