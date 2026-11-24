import {
  type RuleNode,
  type ValueNode,
  extractFieldPath,
  isFieldExpression,
  parseDynamicFieldExpression,
} from "@qarar/spec";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MongoFilter = Record<string, unknown>;

export interface MongoCompileResult {
  filter: MongoFilter;
}

// ---------------------------------------------------------------------------
// Value resolution (to plain JS value for Mongo)
// ---------------------------------------------------------------------------

function resolveValue(node: ValueNode): unknown {
  switch (node.type) {
    case "field":
      return `$${node.path}`; // used when right-side is a field ref
    case "string": {
      const parsed = parseDynamicFieldExpression(node.value);
      if (parsed) {
        return `$${parsed.path}`;
      }
      return node.value;
    }
    case "number":
      return node.value;
    case "boolean":
      return node.value;
    case "null":
      return null;
    case "array":
      return node.values.map((v) => ("value" in v ? v.value : null));
  }
}

function fieldPath(node: ValueNode): string {
  if (node.type !== "field") throw new Error("Expected field node on left side");
  return node.path;
}

function isRightHandField(node: ValueNode): boolean {
  if (node.type === "field") return true;
  if (node.type === "string" && isFieldExpression(node.value)) return true;
  return false;
}

const MONGO_EXPR_OPS: Record<string, string> = {
  eq: "$eq",
  neq: "$ne",
  gt: "$gt",
  gte: "$gte",
  lt: "$lt",
  lte: "$lte",
  before: "$lt",
  after: "$gt",
};

// ---------------------------------------------------------------------------
// Core compiler
// ---------------------------------------------------------------------------

function compileNode(node: RuleNode): MongoFilter {
  if (node.type === "and") {
    return { $and: node.conditions.map(compileNode) };
  }

  if (node.type === "or") {
    return { $or: node.conditions.map(compileNode) };
  }

  if (node.type === "not") {
    return { $nor: [compileNode(node.condition)] };
  }

  if (node.type === "between") {
    const field = fieldPath(node.left);
    return {
      [field]: {
        $gte: resolveValue(node.min),
        $lte: resolveValue(node.max),
      },
    };
  }

  const field = fieldPath(node.left);
  const value = resolveValue(node.right);
  const isRightField = isRightHandField(node.right);

  // If comparing two dynamic fields, use MongoDB $expr
  if (isRightField && MONGO_EXPR_OPS[node.type]) {
    return {
      $expr: {
        [MONGO_EXPR_OPS[node.type]]: [`$${field}`, value],
      },
    };
  }

  switch (node.type) {
    case "eq":
      return value === null
        ? { [field]: null }
        : { [field]: { $eq: value } };

    case "neq":
      return value === null
        ? { [field]: { $ne: null } }
        : { [field]: { $ne: value } };
    case "isNull":
      return { [field]: null };
    case "isNotNull":
      return { [field]: { $ne: null } };

    case "gt":   return { [field]: { $gt: value } };
    case "gte":  return { [field]: { $gte: value } };
    case "lt":   return { [field]: { $lt: value } };
    case "lte":  return { [field]: { $lte: value } };

    case "in":    return { [field]: { $in: value } };
    case "notIn": return { [field]: { $nin: value } };

    case "contains":
      return { [field]: { $regex: String(value), $options: "i" } };

    case "notContains":
      return { [field]: { $not: { $regex: String(value), $options: "i" } } };

    case "startsWith":
      return { [field]: { $regex: `^${String(value)}`, $options: "i" } };

    case "endsWith":
      return { [field]: { $regex: `${String(value)}$`, $options: "i" } };
    case "matches":
      return { [field]: { $regex: String(value), $options: "i" } };
    case "notMatches":
      return { [field]: { $not: { $regex: String(value), $options: "i" } } };

    // Array operations
    case "arrayContains":
      return { [field]: value };
    case "notArrayContains":
      return { [field]: { $ne: value } };
    case "arrayContainsAny":
      return { [field]: { $in: Array.isArray(value) ? value : [value] } };
    case "arrayContainsAll":
      return { [field]: { $all: Array.isArray(value) ? value : [value] } };
    case "arrayContainsNone":
      return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
    case "arrayIsEmpty":
      return { [field]: { $size: 0 } };
    case "arrayIsNotEmpty":
      return { [field]: { $not: { $size: 0 } } };
    case "arrayLength":
      return typeof value === "number"
        ? { [field]: { $size: value } }
        : { $expr: { $eq: [{ $size: `$${field}` }, value] } };
    case "arrayLengthGte":
      return { $expr: { $gte: [{ $size: `$${field}` }, value] } };
    case "arrayLengthLte":
      return { $expr: { $lte: [{ $size: `$${field}` }, value] } };
    case "arrayLengthGt":
      return { $expr: { $gt: [{ $size: `$${field}` }, value] } };
    case "arrayLengthLt":
      return { $expr: { $lt: [{ $size: `$${field}` }, value] } };

    // Date operations
    case "before":
      return { [field]: { $lt: value } };
    case "after":
      return { [field]: { $gt: value } };
    case "olderThan":
      return { [field]: { $lt: value } };
    case "withinLast":
      return { [field]: { $gte: value } };

    default:
      throw new Error(`Unsupported operator for MongoDB: ${(node as { type: string }).type}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile a Qarar rule to a MongoDB filter object.
 */
export function compile(
  rule: { root: RuleNode } | RuleNode
): MongoCompileResult {
  const root = "root" in rule ? (rule as { root: RuleNode }).root : rule;
  return { filter: compileNode(root) };
}
