import { useState } from "react";
import type { AppProps } from "../../types";
import { cx } from "../../lib/helpers";
import "./Calculator.css";

function compute(a: number, b: number, op: string): string {
  switch (op) {
    case "+": return String(a + b);
    case "−": return String(a - b);
    case "×": return String(a * b);
    case "÷": return b === 0 ? "Error" : String(a / b);
    default: return String(b);
  }
}

export function Calculator({}: AppProps) {
  const [display, setDisplay] = useState("0");
  const [previous, setPrevious] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);

  function inputDigit(d: string) {
    if (overwrite) {
      setDisplay(d);
      setOverwrite(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  }

  function inputDot() {
    if (overwrite) {
      setDisplay("0.");
      setOverwrite(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }

  function clearAll() {
    setDisplay("0");
    setPrevious(null);
    setOperator(null);
    setOverwrite(false);
  }

  function backspace() {
    if (overwrite) return;
    const next = display.slice(0, -1);
    setDisplay(next === "" || next === "-" ? "0" : next);
  }

  function percent() {
    setDisplay(String(parseFloat(display) / 100));
    setOverwrite(true);
  }

  function chooseOperator(op: string) {
    if (previous !== null && operator && !overwrite) {
      const result = compute(previous, parseFloat(display), operator);
      setDisplay(result);
      setPrevious(result === "Error" ? null : parseFloat(result));
    } else {
      setPrevious(parseFloat(display));
    }
    setOperator(op);
    setOverwrite(true);
  }

  function equals() {
    if (operator && previous !== null) {
      const result = compute(previous, parseFloat(display), operator);
      setDisplay(result);
      setPrevious(null);
      setOperator(null);
      setOverwrite(true);
    }
  }

  return (
    <div className="calc">
      <div className="calc__display">{display}</div>
      <div className="calc__pad">
        <button className="calc__key" onClick={clearAll}>AC</button>
        <button className="calc__key" onClick={backspace}>⌫</button>
        <button className="calc__key" onClick={percent}>%</button>
        <button className={cx("calc__key", "calc__key--op")} onClick={() => chooseOperator("÷")}>÷</button>

        <button className="calc__key" onClick={() => inputDigit("7")}>7</button>
        <button className="calc__key" onClick={() => inputDigit("8")}>8</button>
        <button className="calc__key" onClick={() => inputDigit("9")}>9</button>
        <button className={cx("calc__key", "calc__key--op")} onClick={() => chooseOperator("×")}>×</button>

        <button className="calc__key" onClick={() => inputDigit("4")}>4</button>
        <button className="calc__key" onClick={() => inputDigit("5")}>5</button>
        <button className="calc__key" onClick={() => inputDigit("6")}>6</button>
        <button className={cx("calc__key", "calc__key--op")} onClick={() => chooseOperator("−")}>−</button>

        <button className="calc__key" onClick={() => inputDigit("1")}>1</button>
        <button className="calc__key" onClick={() => inputDigit("2")}>2</button>
        <button className="calc__key" onClick={() => inputDigit("3")}>3</button>
        <button className={cx("calc__key", "calc__key--op")} onClick={() => chooseOperator("+")}>+</button>

        <button className={cx("calc__key", "calc__key--wide")} onClick={() => inputDigit("0")}>0</button>
        <button className="calc__key" onClick={inputDot}>.</button>
        <button className={cx("calc__key", "calc__key--accent")} onClick={equals}>=</button>
      </div>
    </div>
  );
}
