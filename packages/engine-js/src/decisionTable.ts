import type { DecisionTable, DecisionBranch } from "@qarar/spec";
import { evaluate, type TraceEntry } from "./index.js";

export interface BranchEvaluation<T = unknown> {
  branch: DecisionBranch<T>;
  matched: boolean;
  trace: TraceEntry;
}

export interface DecisionTableResult<T = unknown> {
  matched: boolean;
  matchedBranch: DecisionBranch<T> | null;
  output: T;
  allMatchedBranches: DecisionBranch<T>[];
  branchEvaluations: BranchEvaluation<T>[];
}

export function evaluateDecisionTable<T = unknown>(
  table: DecisionTable<T>,
  data: Record<string, unknown>
): DecisionTableResult<T> {
  const mode = table.mode ?? "first";
  const branchEvaluations: BranchEvaluation<T>[] = [];
  const allMatchedBranches: DecisionBranch<T>[] = [];
  let firstMatchedBranch: DecisionBranch<T> | null = null;

  for (const branch of table.branches) {
    const { result, trace } = evaluate({ root: branch.condition }, data);
    const evalResult: BranchEvaluation<T> = { branch, matched: result, trace };
    branchEvaluations.push(evalResult);

    if (result) {
      allMatchedBranches.push(branch);
      if (!firstMatchedBranch) {
        firstMatchedBranch = branch;
      }
      // If mode is "first", we stop evaluating remaining branches
      if (mode === "first") {
        break;
      }
    }
  }

  const matched = allMatchedBranches.length > 0;
  const matchedBranch = firstMatchedBranch;
  const output = matchedBranch ? matchedBranch.output : table.defaultOutput;

  return {
    matched,
    matchedBranch,
    output,
    allMatchedBranches,
    branchEvaluations,
  };
}
