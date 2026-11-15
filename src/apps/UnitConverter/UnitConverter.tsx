import { useState } from "react";
import type { AppProps } from "../../types";
import { useConverterStore } from "../../stores/useConverterStore";
import { categories, convert, formatConversion } from "./conversion";
import "./UnitConverter.css";

export function UnitConverter(_props: AppProps) {
  const { category, pairs, selectCategory, setPair } = useConverterStore();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const { from, to } = pairs[category];
  const units = categories[category].units;
  const result = convert(amount, category, from, to);
  const display =
    result.value === undefined ? "" : formatConversion(result.value);

  function swap() {
    if (result.value !== undefined) setAmount(String(result.value));
    setPair(category, to, from);
    setMessage("");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(display);
      setMessage("Result copied");
    } catch {
      setMessage("Could not copy. Select the result to copy it manually.");
    }
  }

  return (
    <section className="converter" aria-label="Unit Converter">
      <label>
        Category
        <select
          value={category}
          onChange={(event) => {
            selectCategory(event.target.value);
            setMessage("");
          }}
        >
          {Object.entries(categories).map(([key, item]) => (
            <option key={key} value={key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Amount
        <input
          type="text"
          inputMode="text"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setMessage("");
          }}
          placeholder="Enter a number"
        />
      </label>
      <div className="converter__units">
        {(["From", "To"] as const).map((label) => (
          <label key={label}>
            {label}
            <select
              aria-label={label}
              value={label === "From" ? from : to}
              onChange={(event) => {
                setPair(
                  category,
                  label === "From" ? event.target.value : from,
                  label === "To" ? event.target.value : to,
                );
                setMessage("");
              }}
            >
              {units.map((unit) => (
                <option value={unit.id} key={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <output aria-label="Conversion result" className="converter__result">
        {display || "—"}
      </output>
      {display && (
        <p>
          {amount} {from} = {display} {to}
        </p>
      )}
      {category === "data" && (
        <p>Decimal units use 1,000 bytes per step; binary units use 1,024.</p>
      )}
      <p role="status">{result.error ?? message}</p>
      <div className="converter__actions">
        <button onClick={swap}>Swap</button>
        <button disabled={!display} onClick={copy}>
          Copy result
        </button>
        <button
          onClick={() => {
            setAmount("");
            setMessage("");
          }}
        >
          Clear
        </button>
      </div>
    </section>
  );
}
