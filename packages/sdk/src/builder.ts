import {
  type Rule,
  type RuleNode,
  type ValueNode,
  type FieldNode,
  type ScalarValue,
  validateRule,
  type DecisionBranch,
  type DecisionTable,
  validateDecisionTable,
  extractFieldPath,
  parseDynamicFieldExpression,
} from "./spec.js";

// ---------------------------------------------------------------------------
// Value Coercion and Helpers
// ---------------------------------------------------------------------------

export type ValueInput =
  | string
  | number
  | boolean
  | null
  | FieldNode
  | ValueNode
  | Array<string | number | boolean | null | ScalarValue>;

export function field(path: string): FieldNode {
  const cleanPath = extractFieldPath(path) ?? path;
  return { type: "field", path: cleanPath };
}

export function toValueNode(val: ValueInput): ValueNode {
  if (val !== null && typeof val === "object") {
    if ("type" in val) {
      return val as ValueNode;
    }
    if (Array.isArray(val)) {
      return {
        type: "array",
        values: val.map((item) => toValueNode(item) as ScalarValue),
      };
    }
  }
  if (Array.isArray(val)) {
    return {
      type: "array",
      values: val.map((item) => toValueNode(item) as ScalarValue),
    };
  }
  if (typeof val === "string") {
    const parsed = parseDynamicFieldExpression(val);
    if (parsed && !parsed.offsetOperator) {
      return { type: "field", path: parsed.path };
    }
    return { type: "string", value: val };
  }
  if (typeof val === "number") return { type: "number", value: val };
  if (typeof val === "boolean") return { type: "boolean", value: val };
  if (val === null) return { type: "null" };

  throw new Error(`Unsupported value input for Qarar builder: ${String(val)}`);
}

// ---------------------------------------------------------------------------
// Convertible Nodes
// ---------------------------------------------------------------------------

export type ConvertibleNode =
  | RuleNode
  | NodeBuilder
  | RuleBuilder
  | { buildNode(): RuleNode }
  | { build(): RuleNode | Rule };

export function resolveNode(input: ConvertibleNode): RuleNode {
  if ("buildNode" in input && typeof input.buildNode === "function") {
    return input.buildNode();
  }
  if ("build" in input && typeof input.build === "function") {
    const res = input.build();
    if (res && typeof res === "object" && "root" in res) {
      return (res as Rule).root;
    }
    return res as RuleNode;
  }
  return input as RuleNode;
}

// ---------------------------------------------------------------------------
// Standalone Condition Builders
// ---------------------------------------------------------------------------

export class StandaloneFieldConditionBuilder {
  constructor(private leftNode: ValueNode) {}

  private createNode(node: RuleNode): NodeBuilder {
    return new NodeBuilder(node);
  }

  eq(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "eq", left: this.leftNode, right: toValueNode(right) });
  }
  neq(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "neq", left: this.leftNode, right: toValueNode(right) });
  }
  gt(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "gt", left: this.leftNode, right: toValueNode(right) });
  }
  gte(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "gte", left: this.leftNode, right: toValueNode(right) });
  }
  lt(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "lt", left: this.leftNode, right: toValueNode(right) });
  }
  lte(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "lte", left: this.leftNode, right: toValueNode(right) });
  }
  in(values: ValueInput): NodeBuilder {
    return this.createNode({ type: "in", left: this.leftNode, right: toValueNode(values) });
  }
  notIn(values: ValueInput): NodeBuilder {
    return this.createNode({ type: "notIn", left: this.leftNode, right: toValueNode(values) });
  }
  between(min: ValueInput, max: ValueInput): NodeBuilder {
    return this.createNode({
      type: "between",
      left: this.leftNode,
      min: toValueNode(min),
      max: toValueNode(max),
    });
  }
  contains(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "contains", left: this.leftNode, right: toValueNode(right) });
  }
  notContains(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "notContains", left: this.leftNode, right: toValueNode(right) });
  }
  startsWith(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "startsWith", left: this.leftNode, right: toValueNode(right) });
  }
  endsWith(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "endsWith", left: this.leftNode, right: toValueNode(right) });
  }
  matches(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "matches", left: this.leftNode, right: toValueNode(right) });
  }
  notMatches(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "notMatches", left: this.leftNode, right: toValueNode(right) });
  }
  isNull(): NodeBuilder {
    return this.createNode({ type: "isNull", left: this.leftNode, right: { type: "null" } });
  }
  isNotNull(): NodeBuilder {
    return this.createNode({ type: "isNotNull", left: this.leftNode, right: { type: "null" } });
  }
  arrayContains(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayContains", left: this.leftNode, right: toValueNode(right) });
  }
  notArrayContains(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "notArrayContains", left: this.leftNode, right: toValueNode(right) });
  }
  arrayContainsAny(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayContainsAny", left: this.leftNode, right: toValueNode(right) });
  }
  some(right: ValueInput): NodeBuilder {
    return this.arrayContainsAny(right);
  }
  arrayContainsAll(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayContainsAll", left: this.leftNode, right: toValueNode(right) });
  }
  every(right: ValueInput): NodeBuilder {
    return this.arrayContainsAll(right);
  }
  arrayContainsNone(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayContainsNone", left: this.leftNode, right: toValueNode(right) });
  }
  none(right: ValueInput): NodeBuilder {
    return this.arrayContainsNone(right);
  }
  arrayIsEmpty(): NodeBuilder {
    return this.createNode({ type: "arrayIsEmpty", left: this.leftNode, right: { type: "null" } });
  }
  arrayIsNotEmpty(): NodeBuilder {
    return this.createNode({ type: "arrayIsNotEmpty", left: this.leftNode, right: { type: "null" } });
  }
  arrayLength(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayLength", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthGte(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayLengthGte", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthLte(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayLengthLte", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthGt(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayLengthGt", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthLt(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "arrayLengthLt", left: this.leftNode, right: toValueNode(right) });
  }
  before(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "before", left: this.leftNode, right: toValueNode(right) });
  }
  after(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "after", left: this.leftNode, right: toValueNode(right) });
  }
  olderThan(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "olderThan", left: this.leftNode, right: toValueNode(right) });
  }
  withinLast(right: ValueInput): NodeBuilder {
    return this.createNode({ type: "withinLast", left: this.leftNode, right: toValueNode(right) });
  }
}

// ---------------------------------------------------------------------------
// Node Builder for Logical Chaining
// ---------------------------------------------------------------------------

export class NodeBuilder {
  constructor(private node: RuleNode) {}

  and(fieldPath: string): ChainedFieldConditionBuilder;
  and(other: ConvertibleNode): NodeBuilder;
  and(other: ConvertibleNode | string): NodeBuilder | ChainedFieldConditionBuilder {
    if (typeof other === "string") {
      return new ChainedFieldConditionBuilder(this, "and", field(other));
    }
    const resolvedOther = resolveNode(other);
    if (this.node.type === "and") {
      return new NodeBuilder({
        type: "and",
        conditions: [...this.node.conditions, resolvedOther],
      });
    }
    return new NodeBuilder({
      type: "and",
      conditions: [this.node, resolvedOther],
    });
  }

  or(fieldPath: string): ChainedFieldConditionBuilder;
  or(other: ConvertibleNode): NodeBuilder;
  or(other: ConvertibleNode | string): NodeBuilder | ChainedFieldConditionBuilder {
    if (typeof other === "string") {
      return new ChainedFieldConditionBuilder(this, "or", field(other));
    }
    const resolvedOther = resolveNode(other);
    if (this.node.type === "or") {
      return new NodeBuilder({
        type: "or",
        conditions: [...this.node.conditions, resolvedOther],
      });
    }
    return new NodeBuilder({
      type: "or",
      conditions: [this.node, resolvedOther],
    });
  }

  not(): NodeBuilder {
    return new NodeBuilder({
      type: "not",
      condition: this.node,
    });
  }

  buildNode(): RuleNode {
    return this.node;
  }
}

export class ChainedFieldConditionBuilder {
  constructor(
    private parentBuilder: NodeBuilder,
    private logicalOp: "and" | "or",
    private leftNode: ValueNode
  ) {}

  private resolve(conditionNode: RuleNode): NodeBuilder {
    if (this.logicalOp === "or") {
      return this.parentBuilder.or(conditionNode) as NodeBuilder;
    }
    return this.parentBuilder.and(conditionNode) as NodeBuilder;
  }

  eq(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "eq", left: this.leftNode, right: toValueNode(right) });
  }
  neq(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "neq", left: this.leftNode, right: toValueNode(right) });
  }
  gt(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "gt", left: this.leftNode, right: toValueNode(right) });
  }
  gte(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "gte", left: this.leftNode, right: toValueNode(right) });
  }
  lt(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "lt", left: this.leftNode, right: toValueNode(right) });
  }
  lte(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "lte", left: this.leftNode, right: toValueNode(right) });
  }
  in(values: ValueInput): NodeBuilder {
    return this.resolve({ type: "in", left: this.leftNode, right: toValueNode(values) });
  }
  notIn(values: ValueInput): NodeBuilder {
    return this.resolve({ type: "notIn", left: this.leftNode, right: toValueNode(values) });
  }
  between(min: ValueInput, max: ValueInput): NodeBuilder {
    return this.resolve({
      type: "between",
      left: this.leftNode,
      min: toValueNode(min),
      max: toValueNode(max),
    });
  }
  contains(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "contains", left: this.leftNode, right: toValueNode(right) });
  }
  notContains(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "notContains", left: this.leftNode, right: toValueNode(right) });
  }
  startsWith(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "startsWith", left: this.leftNode, right: toValueNode(right) });
  }
  endsWith(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "endsWith", left: this.leftNode, right: toValueNode(right) });
  }
  matches(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "matches", left: this.leftNode, right: toValueNode(right) });
  }
  notMatches(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "notMatches", left: this.leftNode, right: toValueNode(right) });
  }
  isNull(): NodeBuilder {
    return this.resolve({ type: "isNull", left: this.leftNode, right: { type: "null" } });
  }
  isNotNull(): NodeBuilder {
    return this.resolve({ type: "isNotNull", left: this.leftNode, right: { type: "null" } });
  }
  arrayContains(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayContains", left: this.leftNode, right: toValueNode(right) });
  }
  notArrayContains(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "notArrayContains", left: this.leftNode, right: toValueNode(right) });
  }
  arrayContainsAny(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayContainsAny", left: this.leftNode, right: toValueNode(right) });
  }
  some(right: ValueInput): NodeBuilder {
    return this.arrayContainsAny(right);
  }
  arrayContainsAll(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayContainsAll", left: this.leftNode, right: toValueNode(right) });
  }
  every(right: ValueInput): NodeBuilder {
    return this.arrayContainsAll(right);
  }
  arrayContainsNone(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayContainsNone", left: this.leftNode, right: toValueNode(right) });
  }
  none(right: ValueInput): NodeBuilder {
    return this.arrayContainsNone(right);
  }
  arrayIsEmpty(): NodeBuilder {
    return this.resolve({ type: "arrayIsEmpty", left: this.leftNode, right: { type: "null" } });
  }
  arrayIsNotEmpty(): NodeBuilder {
    return this.resolve({ type: "arrayIsNotEmpty", left: this.leftNode, right: { type: "null" } });
  }
  arrayLength(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayLength", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthGte(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayLengthGte", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthLte(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayLengthLte", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthGt(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayLengthGt", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthLt(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "arrayLengthLt", left: this.leftNode, right: toValueNode(right) });
  }
  before(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "before", left: this.leftNode, right: toValueNode(right) });
  }
  after(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "after", left: this.leftNode, right: toValueNode(right) });
  }
  olderThan(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "olderThan", left: this.leftNode, right: toValueNode(right) });
  }
  withinLast(right: ValueInput): NodeBuilder {
    return this.resolve({ type: "withinLast", left: this.leftNode, right: toValueNode(right) });
  }
}

// ---------------------------------------------------------------------------
// Rule Builder (Top-level)
// ---------------------------------------------------------------------------

export class BoundFieldConditionBuilder {
  constructor(
    private parentRule: RuleBuilder,
    private logicalOp: "and" | "or",
    private leftNode: ValueNode
  ) {}

  private addCondition(node: RuleNode): RuleBuilder {
    if (this.logicalOp === "or") {
      return this.parentRule.or(node);
    }
    return this.parentRule.and(node);
  }

  eq(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "eq", left: this.leftNode, right: toValueNode(right) });
  }
  neq(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "neq", left: this.leftNode, right: toValueNode(right) });
  }
  gt(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "gt", left: this.leftNode, right: toValueNode(right) });
  }
  gte(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "gte", left: this.leftNode, right: toValueNode(right) });
  }
  lt(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "lt", left: this.leftNode, right: toValueNode(right) });
  }
  lte(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "lte", left: this.leftNode, right: toValueNode(right) });
  }
  in(values: ValueInput): RuleBuilder {
    return this.addCondition({ type: "in", left: this.leftNode, right: toValueNode(values) });
  }
  notIn(values: ValueInput): RuleBuilder {
    return this.addCondition({ type: "notIn", left: this.leftNode, right: toValueNode(values) });
  }
  between(min: ValueInput, max: ValueInput): RuleBuilder {
    return this.addCondition({
      type: "between",
      left: this.leftNode,
      min: toValueNode(min),
      max: toValueNode(max),
    });
  }
  contains(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "contains", left: this.leftNode, right: toValueNode(right) });
  }
  notContains(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "notContains", left: this.leftNode, right: toValueNode(right) });
  }
  startsWith(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "startsWith", left: this.leftNode, right: toValueNode(right) });
  }
  endsWith(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "endsWith", left: this.leftNode, right: toValueNode(right) });
  }
  matches(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "matches", left: this.leftNode, right: toValueNode(right) });
  }
  notMatches(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "notMatches", left: this.leftNode, right: toValueNode(right) });
  }
  isNull(): RuleBuilder {
    return this.addCondition({ type: "isNull", left: this.leftNode, right: { type: "null" } });
  }
  isNotNull(): RuleBuilder {
    return this.addCondition({ type: "isNotNull", left: this.leftNode, right: { type: "null" } });
  }
  arrayContains(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayContains", left: this.leftNode, right: toValueNode(right) });
  }
  notArrayContains(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "notArrayContains", left: this.leftNode, right: toValueNode(right) });
  }
  arrayContainsAny(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayContainsAny", left: this.leftNode, right: toValueNode(right) });
  }
  some(right: ValueInput): RuleBuilder {
    return this.arrayContainsAny(right);
  }
  arrayContainsAll(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayContainsAll", left: this.leftNode, right: toValueNode(right) });
  }
  every(right: ValueInput): RuleBuilder {
    return this.arrayContainsAll(right);
  }
  arrayContainsNone(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayContainsNone", left: this.leftNode, right: toValueNode(right) });
  }
  none(right: ValueInput): RuleBuilder {
    return this.arrayContainsNone(right);
  }
  arrayIsEmpty(): RuleBuilder {
    return this.addCondition({ type: "arrayIsEmpty", left: this.leftNode, right: { type: "null" } });
  }
  arrayIsNotEmpty(): RuleBuilder {
    return this.addCondition({ type: "arrayIsNotEmpty", left: this.leftNode, right: { type: "null" } });
  }
  arrayLength(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayLength", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthGte(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayLengthGte", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthLte(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayLengthLte", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthGt(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayLengthGt", left: this.leftNode, right: toValueNode(right) });
  }
  arrayLengthLt(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "arrayLengthLt", left: this.leftNode, right: toValueNode(right) });
  }
  before(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "before", left: this.leftNode, right: toValueNode(right) });
  }
  after(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "after", left: this.leftNode, right: toValueNode(right) });
  }
  olderThan(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "olderThan", left: this.leftNode, right: toValueNode(right) });
  }
  withinLast(right: ValueInput): RuleBuilder {
    return this.addCondition({ type: "withinLast", left: this.leftNode, right: toValueNode(right) });
  }
}

export class RuleBuilder {
  private _id?: string;
  private _name?: string;
  private _description?: string;
  private _version: string = "1";
  private _rootMode: "and" | "or" = "and";
  private _conditions: RuleNode[] = [];

  constructor(nameOrId?: string) {
    if (nameOrId) {
      this._name = nameOrId;
      this._id = nameOrId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rule-1";
    }
  }

  id(id: string): this {
    this._id = id;
    return this;
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  version(ver: string): this {
    this._version = ver;
    return this;
  }

  where(fieldPath: string): BoundFieldConditionBuilder;
  where(condition: ConvertibleNode): this;
  where(arg: string | ConvertibleNode): BoundFieldConditionBuilder | this {
    if (typeof arg === "string") {
      return new BoundFieldConditionBuilder(this, "and", field(arg));
    }
    this._conditions.push(resolveNode(arg));
    return this;
  }

  and(fieldPath: string): BoundFieldConditionBuilder;
  and(condition: ConvertibleNode): this;
  and(arg: string | ConvertibleNode): BoundFieldConditionBuilder | this {
    if (typeof arg === "string") {
      return new BoundFieldConditionBuilder(this, "and", field(arg));
    }
    this._conditions.push(resolveNode(arg));
    return this;
  }

  or(fieldPath: string): BoundFieldConditionBuilder;
  or(condition: ConvertibleNode): this;
  or(arg: string | ConvertibleNode): BoundFieldConditionBuilder | this {
    if (typeof arg === "string") {
      this._rootMode = "or";
      return new BoundFieldConditionBuilder(this, "or", field(arg));
    }
    this._rootMode = "or";
    this._conditions.push(resolveNode(arg));
    return this;
  }

  not(condition: ConvertibleNode): this {
    this._conditions.push({
      type: "not",
      condition: resolveNode(condition),
    });
    return this;
  }

  buildNode(): RuleNode {
    if (this._conditions.length === 0) {
      throw new Error("RuleBuilder requires at least one condition before calling buildNode() or build().");
    }
    if (this._conditions.length === 1) {
      return this._conditions[0];
    }
    return {
      type: this._rootMode,
      conditions: [...this._conditions],
    };
  }

  build(): Rule {
    const rawRule = {
      id: this._id || "rule-1",
      name: this._name || "Unnamed Rule",
      description: this._description,
      version: this._version,
      root: this.buildNode(),
    };
    return validateRule(rawRule);
  }
}

// ---------------------------------------------------------------------------
// Top-Level Factory Functions
// ---------------------------------------------------------------------------

export function rule(nameOrId?: string): RuleBuilder {
  return new RuleBuilder(nameOrId);
}

export function where(fieldPath: string): StandaloneFieldConditionBuilder;
export function where(node: ConvertibleNode): NodeBuilder;
export function where(arg: string | ConvertibleNode): StandaloneFieldConditionBuilder | NodeBuilder {
  if (typeof arg === "string") {
    return new StandaloneFieldConditionBuilder(field(arg));
  }
  return new NodeBuilder(resolveNode(arg));
}

export function and(...inputs: ConvertibleNode[]): NodeBuilder {
  const nodes = inputs.map(resolveNode);
  if (nodes.length === 1) return new NodeBuilder(nodes[0]);
  return new NodeBuilder({ type: "and", conditions: nodes });
}

export function or(...inputs: ConvertibleNode[]): NodeBuilder {
  const nodes = inputs.map(resolveNode);
  if (nodes.length === 1) return new NodeBuilder(nodes[0]);
  return new NodeBuilder({ type: "or", conditions: nodes });
}

export function not(input: ConvertibleNode): NodeBuilder {
  return new NodeBuilder({ type: "not", condition: resolveNode(input) });
}

// ---------------------------------------------------------------------------
// Switch Rule / Decision Table Builder
// ---------------------------------------------------------------------------

export class SwitchCaseBuilder<T> {
  constructor(
    private parentBuilder: SwitchRuleBuilder<T>,
    private branchId: string,
    private condition: RuleNode,
    private branchName?: string,
    private description?: string
  ) {}

  then(output: T): SwitchRuleBuilder<T> {
    return this.parentBuilder._addBranch({
      id: this.branchId,
      name: this.branchName,
      description: this.description,
      condition: this.condition,
      output,
    });
  }
}

export class SwitchRuleBuilder<T> {
  private _id?: string;
  private _name?: string;
  private _description?: string;
  private _version = "1";
  private _mode: "first" | "all" = "first";
  private _defaultOutput?: T;
  private _branches: DecisionBranch<T>[] = [];

  constructor(nameOrId?: string) {
    if (nameOrId) {
      this._name = nameOrId;
      this._id = nameOrId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "switch-1";
    }
  }

  id(id: string): this {
    this._id = id;
    return this;
  }

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  version(ver: string): this {
    this._version = ver;
    return this;
  }

  mode(mode: "first" | "all"): this {
    this._mode = mode;
    return this;
  }

  default(output: T): this {
    this._defaultOutput = output;
    return this;
  }

  case(branchId: string, condition: ConvertibleNode, name?: string, description?: string): SwitchCaseBuilder<T>;
  case(condition: ConvertibleNode): SwitchCaseBuilder<T>;
  case(
    arg1: string | ConvertibleNode,
    arg2?: ConvertibleNode,
    arg3?: string,
    arg4?: string
  ): SwitchCaseBuilder<T> {
    let branchId: string;
    let conditionNode: RuleNode;
    let name: string | undefined;
    let description: string | undefined;

    if (typeof arg1 === "string") {
      branchId = arg1;
      if (!arg2) throw new Error("SwitchRuleBuilder.case(id, condition) requires a condition as second argument.");
      conditionNode = resolveNode(arg2);
      name = arg3;
      description = arg4;
    } else {
      branchId = `case-${this._branches.length + 1}`;
      conditionNode = resolveNode(arg1);
    }

    return new SwitchCaseBuilder<T>(this, branchId, conditionNode, name, description);
  }

  /** @internal */
  _addBranch(branch: DecisionBranch<T>): this {
    this._branches.push(branch);
    return this;
  }

  build(): DecisionTable<T> {
    if (this._defaultOutput === undefined) {
      throw new Error("SwitchRuleBuilder requires a .default(output) value before calling build().");
    }
    const table: DecisionTable<T> = {
      id: this._id || "switch-1",
      name: this._name || "Unnamed Switch Rule",
      description: this._description,
      version: this._version,
      mode: this._mode,
      defaultOutput: this._defaultOutput,
      branches: [...this._branches],
    };
    return validateDecisionTable(table);
  }
}

export function switchRule<T = unknown>(nameOrId?: string): SwitchRuleBuilder<T> {
  return new SwitchRuleBuilder<T>(nameOrId);
}

export function decisionTable<T = unknown>(nameOrId?: string): SwitchRuleBuilder<T> {
  return new SwitchRuleBuilder<T>(nameOrId);
}

