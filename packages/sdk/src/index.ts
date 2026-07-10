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

export { evaluate } from "./engine.js";
export type { EvaluationResult, TraceEntry } from "./engine.js";

export { explain, explainFailures } from "./explainability.js";
