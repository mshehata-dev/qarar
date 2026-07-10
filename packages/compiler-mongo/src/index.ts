import type { RuleNode, ValueNode } from "@qarar/spec";

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
    case "string":
      return node.value;
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

  // All comparison and string operators
  const field = fieldPath(node.left);
  const value = resolveValue(node.right);

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

    default:
      throw new Error(`Unsupported operator for MongoDB: ${(node as { type: string }).type}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile an Qarar rule to a MongoDB filter object.
 *
 * @example
 * const { filter } = compile(rule);
 * collection.find(filter);
 */
export function compile(rule: { root: RuleNode } | RuleNode): MongoCompileResult {
  const root = "root" in rule ? (rule as { root: RuleNode }).root : rule;
  return { filter: compileNode(root) };
}
