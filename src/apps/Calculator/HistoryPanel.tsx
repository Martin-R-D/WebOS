import { useState } from "react";
import { useCalculatorHistoryStore } from "../../stores/useCalculatorHistoryStore";

export function HistoryPanel({
  onUse,
  onBack,
}: {
  onUse: (value: string, evaluated: boolean) => void;
  onBack: () => void;
}) {
  const entries = useCalculatorHistoryStore((state) => state.entries);
  const clear = useCalculatorHistoryStore((state) => state.clear);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState("");

  async function copy(value: number) {
    try {
      await navigator.clipboard.writeText(String(value));
      setMessage("Result copied");
    } catch {
      setMessage("Could not copy. Select the result to copy it manually.");
    }
  }

  return (
    <section className="calc__history" aria-label="Calculation history">
      <header>
        <button onClick={onBack}>Back to calculator</button>
        <h2>History</h2>
      </header>
      <p role="status">{message}</p>
      {entries.length === 0 && <p>No calculations yet.</p>}
      <ol>
        {entries.map((entry) => (
          <li key={entry.id}>
            <div>
              {entry.expression} = <strong>{entry.result}</strong>
            </div>
            <div className="calc__history-actions">
              <button onClick={() => onUse(entry.expression, false)}>
                Use expression
              </button>
              <button onClick={() => onUse(String(entry.result), true)}>
                Use result
              </button>
              <button onClick={() => copy(entry.result)}>Copy result</button>
            </div>
          </li>
        ))}
      </ol>
      {entries.length > 0 &&
        (confirmClear ? (
          <div>
            <p>Clear all calculation history?</p>
            <button
              onClick={() => {
                clear();
                setConfirmClear(false);
              }}
            >
              Confirm clear
            </button>
            <button onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}>Clear history</button>
        ))}
    </section>
  );
}
