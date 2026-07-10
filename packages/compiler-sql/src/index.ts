import type { RuleNode, ValueNode } from "@qarar/spec";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SqlCompileOptions {
  /**
   * Column name style.
   * - "path"  : use field path as-is          → customer.age
   * - "snake" : convert dots to underscores    → customer_age
   * - "quote" : double-quote path segments     → "customer"."age"
   */
  columnStyle?: "path" | "snake" | "quote";
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface SqlCompileResult {
  /** The compiled WHERE clause (without the "WHERE" keyword). */
  sql: string;
  /** Reserved for future parameterized query support. */
  params: unknown[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function columnName(path: string, style: "path" | "snake" | "quote"): string {
  switch (style) {
    case "snake":
      return path.replace(/\./g, "_");
    case "quote":
      return path
        .split(".")
        .map((s) => `"${s}"`)
        .join(".");
    default:
      return path;
  }
}

function escapeString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function compileLiteral(node: ValueNode, colStyle: "path" | "snake" | "quote"): string {
  switch (node.type) {
    case "field":
      return columnName(node.path, colStyle);
    case "string":
      return escapeString(node.value);
    case "number":
      return String(node.value);
    case "boolean":
      return node.value ? "TRUE" : "FALSE";
    case "null":
      return "NULL";
    case "array":
      return (
        "(" +
        node.values
          .map((v) => {
            if (v.type === "null") return "NULL";
            if (v.type === "string") return escapeString(v.value);
            return String(v.value);
          })
          .join(", ") +
        ")"
      );
  }
}

const OP_MAP: Record<string, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

// ---------------------------------------------------------------------------
// Core compiler
// ---------------------------------------------------------------------------

function compileNode(
  node: RuleNode,
  colStyle: "path" | "snake" | "quote",
  nested: boolean
): string {
  if (node.type === "and" || node.type === "or") {
    const keyword = node.type.toUpperCase();
    const parts = node.conditions.map((c) => compileNode(c, colStyle, true));
    const joined = parts.join(` ${keyword} `);
    return nested ? `(${joined})` : joined;
  }

  if (node.type === "not") {
    const inner = compileNode(node.condition, colStyle, false);
    return `NOT (${inner})`;
  }

  if (node.type === "between") {
    const col = compileLiteral(node.left, colStyle);
    const min = compileLiteral(node.min, colStyle);
    const max = compileLiteral(node.max, colStyle);
    return `${col} BETWEEN ${min} AND ${max}`;
  }

  // String-like operators
  const col = compileLiteral(node.left, colStyle);

  if (node.type === "isNull") {
    return `${col} IS NULL`;
  }
  if (node.type === "isNotNull") {
    return `${col} IS NOT NULL`;
  }
  if (node.type === "contains") {
    const val = node.right.type === "string" ? node.right.value : "";
    return `${col} LIKE ${escapeString(`%${val}%`)}`;
  }
  if (node.type === "notContains") {
    const val = node.right.type === "string" ? node.right.value : "";
    return `${col} NOT LIKE ${escapeString(`%${val}%`)}`;
  }
  if (node.type === "startsWith") {
    const val = node.right.type === "string" ? node.right.value : "";
    return `${col} LIKE ${escapeString(`${val}%`)}`;
  }
  if (node.type === "endsWith") {
    const val = node.right.type === "string" ? node.right.value : "";
    return `${col} LIKE ${escapeString(`%${val}`)}`;
  }
  if (node.type === "matches") {
    const val = node.right.type === "string" ? node.right.value : "";
    return `${col} REGEXP ${escapeString(val)}`;
  }
  if (node.type === "notMatches") {
    const val = node.right.type === "string" ? node.right.value : "";
    return `${col} NOT REGEXP ${escapeString(val)}`;
  }
  if (node.type === "in") {
    const list = compileLiteral(node.right, colStyle);
    return `${col} IN ${list}`;
  }
  if (node.type === "notIn") {
    const list = compileLiteral(node.right, colStyle);
    return `${col} NOT IN ${list}`;
  }

  // Standard comparison
  const sqlOp = OP_MAP[node.type];
  if (!sqlOp) throw new Error(`Unsupported operator for SQL: ${node.type}`);

  const right = compileLiteral(node.right, colStyle);

  if (node.right.type === "null") {
    return node.type === "eq" ? `${col} IS NULL` : `${col} IS NOT NULL`;
  }

  return `${col} ${sqlOp} ${right}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function compile(
  rule: { root: RuleNode } | RuleNode,
  options: SqlCompileOptions = {}
): SqlCompileResult {
  const colStyle = options.columnStyle ?? "snake";
  const root = "root" in rule ? (rule as { root: RuleNode }).root : rule;
  const sql = compileNode(root, colStyle, false);
  return { sql, params: [] };
}
