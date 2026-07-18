import { useState, useRef, useEffect } from "react";
import type { AppProps } from "../../types";
import { cx } from "../../lib/helpers";
import { evaluateExpression } from "./evaluate";
import "./Calculator.css";

// pretty-print ASCII operators for the display
function pretty(expr: string): string {
  return expr.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
}

function formatResult(n: number): string {
  const s = String(n);
  return s.length > 14 ? n.toExponential(8) : s;
}

export function Calculator({}: AppProps) {
  const [expr, setExpr] = useState("");
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [error, setError] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    wrapRef.current?.focus();
  }, []);

  const preview = evaluateExpression(expr);

  function append(s: string) {
    setError(false);
    // typing a digit right after "=" starts fresh; an operator continues the result
    if (justEvaluated) {
      setJustEvaluated(false);
      if (/[0-9.(]/.test(s)) {
        setExpr(s);
        return;
      }
    }
    setExpr((prev) => prev + s);
  }

  function clearAll() {
    setExpr("");
    setError(false);
    setJustEvaluated(false);
  }

  function backspace() {
    setError(false);
    setExpr((prev) => prev.slice(0, -1));
  }

  function equals() {
    const result = evaluateExpression(expr);
    if (result === null) {
      if (expr.trim()) setError(true);
      return;
    }
    setExpr(String(result));
    setJustEvaluated(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const k = e.key;
    if (/^[0-9.]$/.test(k)) { append(k); e.preventDefault(); }
    else if ("+-*/^%()".includes(k)) { append(k); e.preventDefault(); }
    else if (k === "Enter" || k === "=") { equals(); e.preventDefault(); }
    else if (k === "Backspace") { backspace(); e.preventDefault(); }
    else if (k === "Escape") { clearAll(); e.preventDefault(); }
  }

  const KEYS: { label: string; onClick: () => void; cls?: string; span?: boolean }[] = [
    { label: "C", onClick: clearAll, cls: "calc__key--fn" },
    { label: "(", onClick: () => append("("), cls: "calc__key--fn" },
    { label: ")", onClick: () => append(")"), cls: "calc__key--fn" },
    { label: "⌫", onClick: backspace, cls: "calc__key--fn" },

    { label: "7", onClick: () => append("7") },
    { label: "8", onClick: () => append("8") },
    { label: "9", onClick: () => append("9") },
    { label: "÷", onClick: () => append("/"), cls: "calc__key--op" },

    { label: "4", onClick: () => append("4") },
    { label: "5", onClick: () => append("5") },
    { label: "6", onClick: () => append("6") },
    { label: "×", onClick: () => append("*"), cls: "calc__key--op" },

    { label: "1", onClick: () => append("1") },
    { label: "2", onClick: () => append("2") },
    { label: "3", onClick: () => append("3") },
    { label: "−", onClick: () => append("-"), cls: "calc__key--op" },

    { label: "0", onClick: () => append("0") },
    { label: ".", onClick: () => append(".") },
    { label: "%", onClick: () => append("%") },
    { label: "+", onClick: () => append("+"), cls: "calc__key--op" },

    { label: "xʸ", onClick: () => append("^"), cls: "calc__key--op" },
    { label: "=", onClick: equals, cls: "calc__key--accent", span: true },
  ];

  return (
    <div className="calc" ref={wrapRef} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="calc__display">
        <div className={cx("calc__expr", error && "calc__expr--error")}>
          {error ? "Invalid expression" : pretty(expr) || "0"}
        </div>
        <div className="calc__preview">
          {!error && !justEvaluated && preview !== null && expr && !/^-?[0-9.]+$/.test(expr)
            ? `= ${formatResult(preview)}`
            : " "}
        </div>
      </div>
      <div className="calc__pad">
        {KEYS.map((key) => (
          <button
            key={key.label}
            className={cx("calc__key", key.cls, key.span && "calc__key--span3")}
            onClick={key.onClick}
            tabIndex={-1}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
