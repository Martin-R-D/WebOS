import { describe, it, expect } from "vitest";
import { evaluateExpression } from "./evaluate";

describe("evaluateExpression", () => {
  it.each([
    ["1+2*3", 7],
    ["(1+2)*3", 9],
    ["2^3^2", 512],
    ["2(3+4)", 14],
    ["-(5+3)", -8],
    ["0.1+0.2", 0.3],
    ["10/4", 2.5],
  ])("%s = %s", (expr, expected) => {
    expect(evaluateExpression(expr)).toBe(expected);
  });

  it.each(["", "   ", "1+", "(1+2", "1/0", "abc", "1++"])("returns null for invalid or incomplete input %j", (expr) => {
    expect(evaluateExpression(expr)).toBeNull();
  });
});
