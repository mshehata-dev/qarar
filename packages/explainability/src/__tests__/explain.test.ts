import { describe, it, expect } from "vitest";
import { explain, explainFailures } from "../index.js";
import type { TraceEntry } from "@qarar/engine-js";

const passedAge: TraceEntry = {
  type: "comparison",
  operator: "gt",
  field: "customer.age",
  actual: 25,
  expected: 18,
  passed: true,
};

const failedAge: TraceEntry = {
  type: "comparison",
  operator: "gt",
  field: "customer.age",
  actual: 16,
  expected: 18,
  passed: false,
};

const passedPlan: TraceEntry = {
  type: "comparison",
  operator: "eq",
  field: "customer.plan",
  actual: "premium",
  expected: "premium",
  passed: true,
};

const failedBetween: TraceEntry = {
  type: "between",
  field: "age",
  actual: 10,
  min: 18,
  max: 65,
  passed: false,
};

const passedBetween: TraceEntry = {
  type: "between",
  field: "age",
  actual: 30,
  min: 18,
  max: 65,
  passed: true,
};

describe("explain — single comparisons", () => {
  it("formats a passing comparison", () => {
    const text = explain(passedAge);
    expect(text).toContain("✅");
    expect(text).toContain("greater than");
    expect(text).toContain("18");
  });

  it("formats a failing comparison with actual value", () => {
    const text = explain(failedAge);
    expect(text).toContain("❌");
    expect(text).toContain("greater than");
    expect(text).toContain("was 16");
  });

  it("formats a passing between", () => {
    const text = explain(passedBetween);
    expect(text).toContain("✅");
    expect(text).toContain("between");
    expect(text).toContain("18");
    expect(text).toContain("65");
  });

  it("formats a failing between with actual value", () => {
    const text = explain(failedBetween);
    expect(text).toContain("❌");
    expect(text).toContain("was 10");
  });
});

describe("explain — logical groups", () => {
  it("AND group shows 'All of the following'", () => {
    const trace: TraceEntry = {
      type: "logical",
      operator: "and",
      passed: false,
      children: [failedAge, passedPlan],
    };
    const text = explain(trace);
    expect(text).toContain("All of the following must be true");
    expect(text).toContain("❌");
    expect(text).toContain("✅");
  });

  it("OR group shows 'At least one'", () => {
    const trace: TraceEntry = {
      type: "logical",
      operator: "or",
      passed: true,
      children: [failedAge, passedPlan],
    };
    const text = explain(trace);
    expect(text).toContain("At least one");
  });

  it("NOT group shows 'None of the following'", () => {
    const trace: TraceEntry = {
      type: "logical",
      operator: "not",
      passed: false,
      children: [passedAge],
    };
    const text = explain(trace);
    expect(text).toContain("None of the following");
  });

  it("indents children", () => {
    const trace: TraceEntry = {
      type: "logical",
      operator: "and",
      passed: false,
      children: [failedAge],
    };
    const lines = explain(trace).split("\n");
    expect(lines[1]).toMatch(/^\s+/); // indented
  });
});

describe("explain — fieldLabels option", () => {
  it("uses custom labels", () => {
    const text = explain(failedAge, { fieldLabels: { "customer.age": "Your Age" } });
    expect(text).toContain("Your Age");
  });
});

describe("explain — includePassing option", () => {
  it("excludes passing nodes when false", () => {
    const trace: TraceEntry = {
      type: "logical",
      operator: "and",
      passed: false,
      children: [failedAge, passedPlan],
    };
    const text = explain(trace, { includePassing: false });
    expect(text).not.toContain("Plan");
    expect(text).toContain("Age");
  });
});

describe("explainFailures", () => {
  it("returns only failing condition sentences", () => {
    const trace: TraceEntry = {
      type: "logical",
      operator: "and",
      passed: false,
      children: [failedAge, passedPlan],
    };
    const failures = explainFailures(trace);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("❌");
    expect(failures[0]).toContain("was 16");
  });

  it("returns empty array when all pass", () => {
    const trace: TraceEntry = {
      type: "logical",
      operator: "and",
      passed: true,
      children: [passedAge, passedPlan],
    };
    expect(explainFailures(trace)).toHaveLength(0);
  });

  it("collects failures from nested groups", () => {
    const inner: TraceEntry = {
      type: "logical",
      operator: "and",
      passed: false,
      children: [failedAge, failedBetween],
    };
    const outer: TraceEntry = {
      type: "logical",
      operator: "and",
      passed: false,
      children: [inner, passedPlan],
    };
    const failures = explainFailures(outer);
    expect(failures).toHaveLength(2);
  });
});
