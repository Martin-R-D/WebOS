declare module "fast-formula-parser" {
  interface Reference {
    sheet?: string;
    row: number;
    col: number;
  }
  interface Range {
    sheet?: string;
    from: { row: number; col: number };
    to: { row: number; col: number };
  }
  export default class FormulaParser {
    constructor(options: {
      functions?: Record<string, (...args: { value: unknown }[]) => number>;
      onCell: (reference: Reference) => unknown;
      onRange: (range: Range) => unknown[][];
    });
    parse(formula: string, position: Reference): unknown;
  }
}
