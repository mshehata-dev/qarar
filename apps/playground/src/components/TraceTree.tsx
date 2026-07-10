import type { TraceEntry } from "@qarar/engine-js";
import { cn } from "../lib/utils";

interface Props {
  trace: TraceEntry;
  depth?: number;
}

const OP_LABELS: Record<string, string> = {
  and: "AND", or: "OR", not: "NOT",
  eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤",
  in: "in", notIn: "not in",
  contains: "contains", notContains: "not contains",
  startsWith: "starts with", endsWith: "ends with",
};

export function TraceTree({ trace, depth = 0 }: Props) {
  const passed = trace.passed;
  const indent = depth * 16;

  if (trace.type === "logical") {
    return (
      <div style={{ paddingLeft: indent }}>
        <div className="flex items-center gap-2 py-1">
          <span className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded",
            trace.operator === "and" ? "bg-accent/20 text-accent" :
            trace.operator === "or"  ? "bg-amber-500/20 text-amber-400" :
                                       "bg-red-500/20 text-red-400"
          )}>
            {OP_LABELS[trace.operator]}
          </span>
          <PassFail passed={passed} />
        </div>
        {trace.children.map((child, i) => (
          <TraceTree key={i} trace={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  if (trace.type === "between") {
    return (
      <div style={{ paddingLeft: indent }}>
        <div className="flex items-center gap-2 py-1 font-mono text-xs flex-wrap">
          <span className="text-subtle">{trace.field}</span>
          <span className="text-accent font-semibold">between</span>
          <span className="text-muted">{JSON.stringify(trace.min)} – {JSON.stringify(trace.max)}</span>
          <PassFail passed={passed} />
          {!passed && (
            <span className="text-fail text-xs">(got {JSON.stringify(trace.actual)})</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: indent }}>
      <div className="flex items-center gap-2 py-1 font-mono text-xs flex-wrap">
        <span className="text-subtle">{trace.field}</span>
        <span className="text-accent font-semibold">{OP_LABELS[trace.operator] ?? trace.operator}</span>
        <span className="text-muted">{JSON.stringify(trace.expected)}</span>
        <PassFail passed={passed} />
        {!passed && (
          <span className="text-fail text-xs">(got {JSON.stringify(trace.actual)})</span>
        )}
      </div>
    </div>
  );
}

function PassFail({ passed }: { passed: boolean }) {
  return (
    <span className={cn(
      "text-xs font-bold px-1.5 py-0.5 rounded-sm",
      passed ? "text-pass" : "text-fail"
    )}>
      {passed ? "✓" : "✗"}
    </span>
  );
}

