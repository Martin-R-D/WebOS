// Expression evaluator: tokenizer + shunting-yard + RPN evaluation.
// Supports + - * / ^ % ( ), decimals, unary minus, and implicit
// multiplication like 2(3+4) or (1+2)(3+4).

type Token =
  | { kind: "num"; value: number }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" };

// precedence / associativity ("u" = unary minus, "%" = postfix percent)
const OPS: Record<string, { prec: number; rightAssoc: boolean; args: number }> = {
  "+": { prec: 1, rightAssoc: false, args: 2 },
  "-": { prec: 1, rightAssoc: false, args: 2 },
  "*": { prec: 2, rightAssoc: false, args: 2 },
  "/": { prec: 2, rightAssoc: false, args: 2 },
  "^": { prec: 3, rightAssoc: true, args: 2 },
  "u": { prec: 4, rightAssoc: true, args: 1 },
  "%": { prec: 5, rightAssoc: false, args: 1 },
};

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  const prev = () => tokens[tokens.length - 1];
  const prevIsValue = () => {
    const p = prev();
    return p && (p.kind === "num" || p.kind === "rparen" || (p.kind === "op" && p.value === "%"));
  };

  while (i < expr.length) {
    const ch = expr[i];

    if (ch === " ") { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      if ((num.match(/\./g) ?? []).length > 1) return null;
      // implicit multiplication: (2)3 -> (2)*3
      if (prev()?.kind === "rparen") tokens.push({ kind: "op", value: "*" });
      tokens.push({ kind: "num", value: parseFloat(num) });
      continue;
    }

    if (ch === "(") {
      if (prevIsValue()) tokens.push({ kind: "op", value: "*" });
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }

    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }

    if ("+-*/^%".includes(ch)) {
      if (ch === "-" && !prevIsValue()) {
        tokens.push({ kind: "op", value: "u" }); // unary minus
      } else {
        tokens.push({ kind: "op", value: ch });
      }
      i++;
      continue;
    }

    return null; // unknown character
  }

  return tokens;
}

function toRpn(tokens: Token[]): Token[] | null {
  const output: Token[] = [];
  const stack: Token[] = [];

  for (const token of tokens) {
    if (token.kind === "num") {
      output.push(token);
    } else if (token.kind === "op") {
      if (token.value === "%") {
        // postfix — applies to what is already in the output
        output.push(token);
        continue;
      }
      const cur = OPS[token.value];
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.kind !== "op") break;
        const topOp = OPS[top.value];
        if (topOp.prec > cur.prec || (topOp.prec === cur.prec && !cur.rightAssoc)) {
          output.push(stack.pop()!);
        } else {
          break;
        }
      }
      stack.push(token);
    } else if (token.kind === "lparen") {
      stack.push(token);
    } else {
      // rparen: pop until matching lparen
      let matched = false;
      while (stack.length > 0) {
        const top = stack.pop()!;
        if (top.kind === "lparen") { matched = true; break; }
        output.push(top);
      }
      if (!matched) return null; // unbalanced
    }
  }

  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.kind === "lparen") return null; // unbalanced
    output.push(top);
  }

  return output;
}

function evalRpn(rpn: Token[]): number | null {
  const stack: number[] = [];

  for (const token of rpn) {
    if (token.kind === "num") {
      stack.push(token.value);
      continue;
    }
    if (token.kind !== "op") return null;

    const op = OPS[token.value];
    if (stack.length < op.args) return null;

    if (op.args === 1) {
      const a = stack.pop()!;
      stack.push(token.value === "u" ? -a : a / 100);
    } else {
      const b = stack.pop()!;
      const a = stack.pop()!;
      switch (token.value) {
        case "+": stack.push(a + b); break;
        case "-": stack.push(a - b); break;
        case "*": stack.push(a * b); break;
        case "/": stack.push(a / b); break;
        case "^": stack.push(Math.pow(a, b)); break;
        default: return null;
      }
    }
  }

  return stack.length === 1 ? stack[0] : null;
}

/** Evaluate an expression string. Returns null when invalid/incomplete. */
export function evaluateExpression(expr: string): number | null {
  if (!expr.trim()) return null;
  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0) return null;
  const rpn = toRpn(tokens);
  if (!rpn) return null;
  const result = evalRpn(rpn);
  if (result === null || !isFinite(result) || isNaN(result)) return null;
  // trim float noise (0.1+0.2 -> 0.3)
  return parseFloat(result.toPrecision(12));
}
