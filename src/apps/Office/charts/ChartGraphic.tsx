import type { Ref } from "react";
import type { ChartData } from "./data";
import type { SheetChart } from "./model";

const colors = [
  "#2563eb",
  "#dc2626",
  "#15803d",
  "#9333ea",
  "#c2410c",
  "#0891b2",
  "#be185d",
  "#4d7c0f",
];

export function ChartGraphic({
  chart,
  data,
  svgRef,
}: {
  chart: SheetChart;
  data: ChartData;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const numbers = data.series.flatMap((series) =>
    series.values.filter((value): value is number => value !== null),
  );
  const minimum = Math.min(0, ...numbers);
  const maximum = Math.max(0, ...numbers) || 1;
  const y = (value: number) =>
    270 - ((value - minimum) / (maximum - minimum)) * 210;
  const step = 500 / data.labels.length;
  const total = data.series[0].values.reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const legend =
    chart.type === "pie"
      ? data.labels
      : data.series.map((series) => series.name);
  let angle = -Math.PI / 2;
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 360"
      role="img"
      aria-label={chart.title}
      style={{
        width: "100%",
        display: "block",
        background: "white",
        color: "#202020",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <title>{chart.title}</title>
      <desc>
        {chart.type} chart from {chart.start}:{chart.end}. A data table is
        available below.
      </desc>
      <text x="320" y="26" textAnchor="middle" fontSize="20" fill="#202020">
        {chart.title}
      </text>
      {chart.type === "pie" ? (
        data.series[0].values.map((value, index) => {
          if (!value) return null;
          const start = angle;
          angle += (value / total) * Math.PI * 2;
          const fill = colors[index % colors.length];
          return value === total ? (
            <circle key={index} cx="320" cy="180" r="110" fill={fill}>
              <title>
                {data.labels[index]}: {value}
              </title>
            </circle>
          ) : (
            <path
              key={index}
              d={`M320 180 L${320 + Math.cos(start) * 110} ${180 + Math.sin(start) * 110} A110 110 0 ${angle - start > Math.PI ? 1 : 0} 1 ${320 + Math.cos(angle) * 110} ${180 + Math.sin(angle) * 110} Z`}
              fill={fill}
            >
              <title>
                {data.labels[index]}: {value}
              </title>
            </path>
          );
        })
      ) : (
        <>
          <line x1="70" y1={y(0)} x2="570" y2={y(0)} stroke="#444" />
          {[0, 0.5, 1].map((fraction) => {
            const value = minimum + fraction * (maximum - minimum);
            return (
              <g key={fraction}>
                <line
                  x1="70"
                  y1={y(value)}
                  x2="570"
                  y2={y(value)}
                  stroke="#ddd"
                />
                <text
                  x="62"
                  y={y(value) + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#333"
                >
                  {Number(value.toPrecision(4))}
                </text>
              </g>
            );
          })}
          {data.series.map((series, seriesIndex) => (
            <g
              key={seriesIndex}
              fill={colors[seriesIndex % colors.length]}
              stroke={colors[seriesIndex % colors.length]}
            >
              {series.values.map((value, index) => {
                if (value === null) return null;
                const x = 70 + (index + 0.5) * step;
                if (chart.type === "bar") {
                  const width = (step * 0.8) / data.series.length;
                  return (
                    <rect
                      key={index}
                      x={70 + index * step + step * 0.1 + seriesIndex * width}
                      y={Math.min(y(0), y(value))}
                      width={width}
                      height={Math.abs(y(value) - y(0))}
                    >
                      <title>
                        {data.labels[index]} · {series.name}: {value}
                      </title>
                    </rect>
                  );
                }
                const previous = series.values[index - 1];
                return (
                  <g key={index}>
                    {index > 0 && previous !== null && (
                      <line
                        x1={x - step}
                        y1={y(previous)}
                        x2={x}
                        y2={y(value)}
                        strokeWidth="2"
                      />
                    )}
                    <circle cx={x} cy={y(value)} r="3">
                      <title>
                        {data.labels[index]} · {series.name}: {value}
                      </title>
                    </circle>
                  </g>
                );
              })}
            </g>
          ))}
          {data.labels.map(
            (label, index) =>
              index % Math.ceil(data.labels.length / 6) === 0 && (
                <text
                  key={index}
                  x={70 + (index + 0.5) * step}
                  y="292"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#333"
                >
                  {label.slice(0, 16)}
                </text>
              ),
          )}
        </>
      )}
      {legend.slice(0, 8).map((name, index) => (
        <g key={index}>
          <rect
            x={20 + (index % 4) * 155}
            y={312 + Math.floor(index / 4) * 20}
            width="10"
            height="10"
            fill={colors[index % colors.length]}
          />
          <text
            x={34 + (index % 4) * 155}
            y={322 + Math.floor(index / 4) * 20}
            fontSize="11"
            fill="#333"
          >
            {name.slice(0, 20)}
          </text>
        </g>
      ))}
    </svg>
  );
}
