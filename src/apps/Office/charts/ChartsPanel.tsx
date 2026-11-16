import { useRef, useState } from "react";
import type { Worksheet } from "../sheets/model";
import type { CellValue } from "../sheets/formulas";
import { downloadDocument } from "../documents";
import { chartData } from "./data";
import type { ChartData } from "./data";
import { validateCharts } from "./model";
import type { SheetChart } from "./model";
import { position } from "../sheets/model";
import { ChartGraphic } from "./ChartGraphic";

export function ChartsPanel({
  sheet,
  start,
  end,
  evaluate,
  onChange,
  onClose,
}: {
  sheet: Worksheet;
  start: string;
  end: string;
  evaluate: (id: string, key: string) => CellValue;
  onChange: (sheet: Worksheet) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SheetChart>(
    () =>
      sheet.charts?.[0] ?? {
        id: crypto.randomUUID(),
        type: "bar",
        title: "Chart",
        start,
        end,
        header: true,
      },
  );
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const saved = sheet.charts?.find((chart) => chart.id === draft.id);
  const current = changed ? draft : (saved ?? draft);
  function edit(next: SheetChart) {
    setDraft(next);
    setChanged(true);
  }
  const preview: { data?: ChartData; error: string } = (() => {
    try {
      return { data: chartData(sheet, current, evaluate), error: "" };
    } catch (cause) {
      return {
        error: cause instanceof Error ? cause.message : "Unable to draw chart.",
      };
    }
  })();
  const data = preview.data;
  const dataError = preview.error;

  function save() {
    try {
      validateCharts([current], position);
      chartData(sheet, current, evaluate);
      if (!saved && (sheet.charts?.length ?? 0) >= 20)
        throw new Error("A sheet supports up to 20 charts.");
      onChange({
        ...sheet,
        charts: saved
          ? sheet.charts!.map((chart) =>
              chart.id === current.id ? current : chart,
            )
          : [...(sheet.charts ?? []), current],
      });
      setDraft(current);
      setChanged(false);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save chart.",
      );
    }
  }

  return (
    <aside className="sheets__charts" aria-label="Charts">
      <div className="office__toolbar">
        <select
          aria-label="Saved chart"
          value={saved?.id ?? ""}
          onChange={(event) => {
            const chart = sheet.charts?.find(
              (chart) => chart.id === event.target.value,
            );
            if (chart) {
              setDraft(chart);
              setChanged(false);
            }
          }}
        >
          <option value="">New chart</option>
          {sheet.charts?.map((chart) => (
            <option key={chart.id} value={chart.id}>
              {chart.title}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            edit({
              id: crypto.randomUUID(),
              type: "bar",
              title: "Chart",
              start,
              end,
              header: true,
            })
          }
        >
          New chart
        </button>
        <label>
          Title{" "}
          <input
            aria-label="Chart title"
            value={current.title}
            maxLength={100}
            onChange={(event) =>
              edit({ ...current, title: event.target.value })
            }
          />
        </label>
        <select
          aria-label="Chart type"
          value={current.type}
          onChange={(event) =>
            edit({
              ...current,
              type: event.target.value as SheetChart["type"],
            })
          }
        >
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
        </select>
        <label>
          From{" "}
          <input
            aria-label="Chart range start"
            value={current.start}
            onChange={(event) =>
              edit({
                ...current,
                sourceMissing: false,
                start: event.target.value.toUpperCase(),
              })
            }
          />
        </label>
        <label>
          To{" "}
          <input
            aria-label="Chart range end"
            value={current.end}
            onChange={(event) =>
              edit({
                ...current,
                sourceMissing: false,
                end: event.target.value.toUpperCase(),
              })
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={current.header}
            onChange={(event) =>
              edit({ ...current, header: event.target.checked })
            }
          />
          First row contains series names
        </label>
        <button onClick={save}>Save chart</button>
        <button
          disabled={!saved || (sheet.charts?.length ?? 0) >= 20}
          onClick={() => {
            const copy = {
              ...saved!,
              id: crypto.randomUUID(),
              title: `${saved!.title.slice(0, 90)} copy`,
            };
            onChange({ ...sheet, charts: [...sheet.charts!, copy] });
            setDraft(copy);
            setChanged(false);
          }}
        >
          Duplicate chart
        </button>
        <button
          disabled={!saved}
          onClick={() => {
            onChange({
              ...sheet,
              charts: sheet.charts!.filter((chart) => chart.id !== saved!.id),
            });
            edit({ ...current, id: crypto.randomUUID() });
          }}
        >
          Delete chart
        </button>
        <button
          disabled={!data}
          onClick={() => {
            if (svgRef.current)
              downloadDocument(
                "chart.svg",
                svgRef.current.outerHTML,
                "image/svg+xml",
              );
          }}
        >
          Download SVG
        </button>
        <button onClick={onClose}>Close charts</button>
      </div>
      {(error || dataError) && <p role="alert">{error || dataError}</p>}
      {(!saved || changed) && (
        <p>Preview — save the chart to keep these settings.</p>
      )}
      <p>Charts include hidden rows in the source range.</p>
      {data && (
        <>
          <ChartGraphic chart={current} data={data} svgRef={svgRef} />
          {data.ignored > 0 && (
            <p>{data.ignored} nonnumeric cells are shown as gaps.</p>
          )}
          <details>
            <summary>View chart data</summary>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  {data.series.map((series, index) => (
                    <th key={index}>{series.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.labels.map((label, index) => (
                  <tr key={index}>
                    <th>{label}</th>
                    {data.series.map((series, seriesIndex) => (
                      <td key={seriesIndex}>{series.values[index] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </aside>
  );
}
