import { useEffect, useRef, useState } from "react";
import type { JournalRange } from "../api";
import "./BPTrendChart.css";

// One reading on the chart, oldest first. JournalPage turns the API dates into Date objects.
export interface TrendPoint {
  key: string | number;
  date: Date;
  systolic: number;
  diastolic: number;
}

const RANGES: JournalRange[] = [7, 30, 90];
const NORMAL_SYSTOLIC = 120;
const NORMAL_DIASTOLIC = 80;
export const NOT_ENOUGH_MESSAGE = "Not enough readings to draw a chart.";

const shortDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);

const fullDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

// Measures the chart box so the SVG is drawn at its real size (text stays readable on phones).
const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(Math.max(260, Math.floor(element.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
};

const Chart = ({ points, width }: { points: TrendPoint[]; width: number }) => {
  const height = width < 480 ? 230 : 280;
  const pad = { top: 26, right: 16, bottom: 46, left: 46 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  // Y axis in steps of 10, always showing the 120 and 80 lines.
  const values = points.flatMap((point) => [point.systolic, point.diastolic]);
  const yMin = Math.max(0, Math.floor((Math.min(...values, NORMAL_DIASTOLIC) - 10) / 10) * 10);
  const yMax = Math.ceil((Math.max(...values, NORMAL_SYSTOLIC) + 10) / 10) * 10;
  const yStep = yMax - yMin > 120 ? 40 : 20;
  const y = (value: number) => pad.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
  const yTicks: number[] = [];
  for (let tick = Math.ceil(yMin / yStep) * yStep; tick <= yMax; tick += yStep) yTicks.push(tick);

  // Readings are spaced evenly from oldest (left) to newest (right).
  const x = (index: number) =>
    pad.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const maxLabels = Math.max(2, Math.floor(plotWidth / 70));
  const every = Math.ceil(points.length / maxLabels);
  const lastIndex = points.length - 1;
  // Every few readings gets a date, plus the newest one; skip any that would touch the newest label.
  const labelIndexes = points
    .map((_, index) => index)
    .filter((index) => index === lastIndex || (index % every === 0 && x(lastIndex) - x(index) >= 64));
  const dotSize = points.length > 40 ? 2.5 : 4;

  const line = (key: "systolic" | "diastolic") =>
    points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");

  const normalTop = y(NORMAL_SYSTOLIC);
  const first = points[0];
  const last = points[points.length - 1];
  const description = `${points.length} readings from ${fullDate(first.date)} to ${fullDate(last.date)}. Latest ${last.systolic}/${last.diastolic} mmHg.`;

  return (
    <svg
      className="bp-trend-svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby="bp-trend-svg-title bp-trend-svg-desc"
    >
      <title id="bp-trend-svg-title">Blood pressure chart</title>
      <desc id="bp-trend-svg-desc">{description}</desc>

      {/* Normal band: everything below 120/80 */}
      <rect
        className="bp-trend-normal"
        x={pad.left}
        y={normalTop}
        width={plotWidth}
        height={pad.top + plotHeight - normalTop}
      />
      <text className="bp-trend-normal-label" x={pad.left + 8} y={normalTop + 16}>
        Normal (below 120/80)
      </text>

      {yTicks.map((tick) => (
        <g key={tick}>
          <line className="bp-trend-grid" x1={pad.left} x2={pad.left + plotWidth} y1={y(tick)} y2={y(tick)} />
          <text className="bp-trend-axis-text" x={pad.left - 8} y={y(tick) + 4} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {/* Diastolic should stay below 80, so mark that line too */}
      <line
        className="bp-trend-diastolic-limit"
        x1={pad.left}
        x2={pad.left + plotWidth}
        y1={y(NORMAL_DIASTOLIC)}
        y2={y(NORMAL_DIASTOLIC)}
      />
      <text className="bp-trend-diastolic-limit-label" x={pad.left + plotWidth - 4} y={y(NORMAL_DIASTOLIC) - 6} textAnchor="end">
        Diastolic limit 80
      </text>
      <text className="bp-trend-axis-title" x={pad.left - 8} y={14} textAnchor="end">
        mmHg
      </text>

      <line className="bp-trend-axis" x1={pad.left} x2={pad.left + plotWidth} y1={pad.top + plotHeight} y2={pad.top + plotHeight} />
      {labelIndexes.map((index) => (
        <text
          key={points[index].key}
          className="bp-trend-axis-text bp-trend-date-label"
          x={x(index)}
          y={pad.top + plotHeight + 18}
          textAnchor={index === lastIndex ? "end" : index === 0 ? "start" : "middle"}
        >
          {shortDate(points[index].date)}
        </text>
      ))}
      <text className="bp-trend-axis-title" x={pad.left + plotWidth / 2} y={height - 6} textAnchor="middle">
        Date
      </text>

      <path className="bp-trend-line bp-trend-line-systolic" d={line("systolic")} />
      <path className="bp-trend-line bp-trend-line-diastolic" d={line("diastolic")} />

      {points.map((point, index) => (
        <g key={point.key} className="bp-trend-point">
          <title>{`${fullDate(point.date)}: ${point.systolic}/${point.diastolic} mmHg`}</title>
          <circle className="bp-trend-dot-systolic" cx={x(index)} cy={y(point.systolic)} r={dotSize} />
          <rect
            className="bp-trend-dot-diastolic"
            x={x(index) - dotSize * 0.875}
            y={y(point.diastolic) - dotSize * 0.875}
            width={dotSize * 1.75}
            height={dotSize * 1.75}
          />
        </g>
      ))}
    </svg>
  );
};

const BPTrendChart = ({
  points,
  range,
  onRangeChange,
  isLoading,
  error,
  onRetry,
}: {
  points: TrendPoint[];
  range: JournalRange;
  onRangeChange: (range: JournalRange) => void;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
}) => {
  const [boxRef, width] = useWidth();
  const hasChart = points.length >= 2;

  return (
    <section className="home-card bp-trend-card" aria-labelledby="bp-trend-title" aria-busy={isLoading}>
      <div className="bp-trend-header">
        <h2 id="bp-trend-title">Blood Pressure Trend</h2>
        <div className="bp-trend-ranges" role="group" aria-label="Chart range">
          {RANGES.map((days) => (
            <button
              key={days}
              type="button"
              className={days === range ? "bp-trend-range bp-trend-range-active" : "bp-trend-range"}
              aria-pressed={days === range}
              onClick={() => onRangeChange(days)}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {hasChart && (
        <ul className="bp-trend-legend" aria-label="Chart key">
          <li><span className="bp-trend-key bp-trend-key-systolic" aria-hidden="true" />Systolic</li>
          <li><span className="bp-trend-key bp-trend-key-diastolic" aria-hidden="true" />Diastolic</li>
          <li><span className="bp-trend-key bp-trend-key-normal" aria-hidden="true" />Normal</li>
        </ul>
      )}

      <div className="bp-trend-box" ref={boxRef}>
        {error ? (
          <div className="bp-trend-message" role="alert">
            <p>{error}</p>
            <button type="button" className="bp-trend-retry" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : isLoading && !hasChart ? (
          <p className="bp-trend-message" role="status">Loading chart...</p>
        ) : hasChart ? (
          <Chart points={points} width={width} />
        ) : (
          <p className="bp-trend-message">{NOT_ENOUGH_MESSAGE}</p>
        )}
      </div>
    </section>
  );
};

export default BPTrendChart;
