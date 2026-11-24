export {
  RuleSchema,
  FieldNodeSchema,
  ValueNodeSchema,
  validateRule,
  safeValidateRule,
} from "./spec.js";
export type {
  Rule,
  RuleNode,
  ValueNode,
  ComparisonOp,
  ComparisonNode,
  BetweenNode,
} from "./spec.js";

export { evaluate, checkRule, compileRule } from "./engine.js";
export type { EvaluationResult, TraceEntry, CheckRuleResult } from "./engine.js";

export { explain, explainFailures } from "./explainability.js";

export { compileToSQL } from "./sql.js";
export type { SqlCompileOptions, SqlCompileResult } from "./sql.js";

export { compileToMongo } from "./mongo.js";
export type { MongoFilter, MongoCompileResult } from "./mongo.js";

export { createQarar } from "./schema.js";
export type { QararSchemaInstance } from "./schema.js";

export {
  rule,
  where,
  field,
  and,
  or,
  not,
  toValueNode,
  resolveNode,
  RuleBuilder,
  NodeBuilder,
  StandaloneFieldConditionBuilder,
  BoundFieldConditionBuilder,
  ChainedFieldConditionBuilder,
  switchRule,
  decisionTable,
  SwitchRuleBuilder,
  SwitchCaseBuilder,
} from "./builder.js";
export type { ValueInput, ConvertibleNode } from "./builder.js";

export {
  DecisionTableSchema,
  DecisionBranchSchema,
  validateDecisionTable,
  safeValidateDecisionTable,
} from "./spec.js";
export type { DecisionTable, DecisionBranch } from "./spec.js";

export { checkDecisionTable, evaluateDecisionTable } from "./engine.js";
export type { CheckDecisionTableResult, DecisionTableResult, BranchEvaluation } from "./engine.js";



