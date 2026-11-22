import {
  evaluate,
  evaluateDecisionTable,
  type EvaluationResult,
  type TraceEntry,
  type DecisionTableResult,
  type BranchEvaluation,
} from "@qarar/engine-js";
import {
  safeValidateRule,
  validateRule,
  type Rule,
  safeValidateDecisionTable,
  type DecisionTable,
  type DecisionBranch,
} from "@qarar/spec";
import { explainFailures, type ExplainOptions } from "@qarar/explainability";

export {
  evaluate,
  evaluateDecisionTable,
  type EvaluationResult,
  type TraceEntry,
  type DecisionTableResult,
  type BranchEvaluation,
};

export interface CheckRuleResult {
  ok: boolean;
  result: boolean;
  reasons: string[];
  trace: TraceEntry;
  rule?: Rule;
  validationError?: unknown;
}

export function checkRule(
  ruleInput: unknown,
  data: Record<string, unknown>,
  options?: ExplainOptions
): CheckRuleResult {
  const safe = safeValidateRule(ruleInput);
  if (!safe.success) {
    const reasons = safe.error.issues
      ? safe.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
      : [safe.error.message || "Invalid Rule"];
    return {
      ok: false,
      result: false,
      reasons,
      trace: { type: "logical", operator: "and", passed: false, children: [] },
      validationError: safe.error,
    };
  }

  const evaluated = evaluate(safe.data, data);
  const failures = explainFailures(evaluated.trace, options);

  return {
    ok: true,
    result: evaluated.result,
    reasons: failures,
    trace: evaluated.trace,
    rule: safe.data,
  };
}

export function compileRule(
  ruleInput: unknown
): (data: Record<string, unknown>) => EvaluationResult {
  const parsedRule = validateRule(ruleInput);
  return (data: Record<string, unknown>) => evaluate(parsedRule, data);
}

export interface CheckDecisionTableResult<T = unknown> extends DecisionTableResult<T> {
  ok: boolean;
  validationError?: unknown;
}

export function checkDecisionTable<T = unknown>(
  tableInput: unknown,
  data: Record<string, unknown>
): CheckDecisionTableResult<T> {
  const safe = safeValidateDecisionTable<T>(tableInput);
  if (!safe.success) {
    return {
      ok: false,
      matched: false,
      matchedBranch: null,
      output: (tableInput as { defaultOutput?: T })?.defaultOutput as T,
      allMatchedBranches: [],
      branchEvaluations: [],
      validationError: safe.error,
    };
  }

  const evaluated = evaluateDecisionTable<T>(safe.data as DecisionTable<T>, data);
  return {
    ok: true,
    ...evaluated,
  };
}
