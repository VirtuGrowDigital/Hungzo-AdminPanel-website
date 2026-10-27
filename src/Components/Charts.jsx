import React, { useId, useMemo, useState } from "react";
import { formatMoney as money, formatShortDate as shortDate } from "../utils/format";

/**
 * Small dependency-free chart set for the dashboard.
 *
 * Hand-rolled SVG rather than a chart library: the bundle is already large,
 * and these three shapes are all the dashboard needs. Each one is
 * responsive (viewBox + preserveAspectRatio) and degrades to an empty state
 * instead of throwing on no data.
 */

const cn = (...classes) => classes.filter(Boolean).join(" ");


function EmptyChart({ height = 220, message = "No data for this period" }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400"
      style={{ height }}
    >
      {message}
    </div>
  );
}

/**
 * Revenue (filled area) + orders (line) over time, sharing an x axis with
 * independent y scales so both series stay readable.
 */
export function TrendChart({ data = [], height = 260 }) {
  const gradientId = useId();
  const [hover, setHover] = useState(null);

  const geometry = useMemo(() => {
    if (!data.length) return null;

    const width = 760;
    const padding = { top: 16, right: 16, bottom: 28, left: 16 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const maxRevenue = Math.max(...data.map((d) => d.revenue || 0), 1);
    const maxOrders = Math.max(...data.map((d) => d.orders || 0), 1);

    const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;
    const pointAt = (index, value, max) => ({
      x: padding.left + index * stepX,
      y: padding.top + innerHeight - (Number(value || 0) / max) * innerHeight,
    });

    const revenuePoints = data.map((d, i) => pointAt(i, d.revenue, maxRevenue));
    const orderPoints = data.map((d, i) => pointAt(i, d.orders, maxOrders));

    const line = (points) => points.map((p) => `${p.x},${p.y}`).join(" ");
    const baseline = padding.top + innerHeight;

    return {
      width,
      padding,
      innerWidth,
      baseline,
      stepX,
      revenuePoints,
      orderPoints,
      revenueLine: line(revenuePoints),
      orderLine: line(orderPoints),
      area: `${padding.left},${baseline} ${line(revenuePoints)} ${
        padding.left + (data.length - 1) * stepX
      },${baseline}`,
    };
  }, [data, height]);

  if (!geometry) return <EmptyChart height={height} />;

  const labelEvery = Math.ceil(data.length / 7);
  const active = hover === null ? null : data[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${geometry.width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Revenue and orders trend"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={geometry.padding.left}
            x2={geometry.padding.left + geometry.innerWidth}
            y1={geometry.padding.top + (height - geometry.padding.top - geometry.padding.bottom) * fraction}
            y2={geometry.padding.top + (height - geometry.padding.top - geometry.padding.bottom) * fraction}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        <polygon points={geometry.area} fill={`url(#${gradientId})`} />
        <polyline
          points={geometry.revenueLine}
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={geometry.orderLine}
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {hover !== null ? (
          <line
            x1={geometry.revenuePoints[hover].x}
            x2={geometry.revenuePoints[hover].x}
            y1={geometry.padding.top}
            y2={geometry.baseline}
            stroke="#94a3b8"
            strokeWidth="1"
          />
        ) : null}

        {geometry.revenuePoints.map((point, index) => (
          <g key={index}>
            {/* generous invisible hit area so hovering works on narrow charts */}
            <rect
              x={point.x - geometry.stepX / 2}
              y={geometry.padding.top}
              width={Math.max(geometry.stepX, 8)}
              height={geometry.baseline - geometry.padding.top}
              fill="transparent"
              onMouseEnter={() => setHover(index)}
            />
            {hover === index ? (
              <>
                <circle cx={point.x} cy={point.y} r="4" fill="#059669" />
                <circle
                  cx={geometry.orderPoints[index].x}
                  cy={geometry.orderPoints[index].y}
                  r="4"
                  fill="#1d4ed8"
                />
              </>
            ) : null}
          </g>
        ))}

        {data.map((row, index) =>
          index % labelEvery === 0 || index === data.length - 1 ? (
            <text
              key={row.date}
              x={geometry.revenuePoints[index].x}
              y={height - 8}
              textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
              className="fill-slate-400"
              style={{ fontSize: 11 }}
            >
              {shortDate(row.date)}
            </text>
          ) : null,
        )}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-emerald-600" /> Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full border-b-2 border-dashed border-blue-700" /> Orders
        </span>
        {active ? (
          <span className="ml-auto rounded-full bg-slate-900 px-3 py-1 font-medium text-white">
            {shortDate(active.date)} · {money(active.revenue)} · {active.orders} order
            {active.orders === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Horizontal bars — good for top products, cities, payment split. */
export function BarList({ data = [], valueKey = "value", labelKey = "label", format = money }) {
  if (!data.length) return <EmptyChart height={160} />;

  const max = Math.max(...data.map((row) => Number(row[valueKey] || 0)), 1);

  return (
    <ul className="space-y-3">
      {data.map((row, index) => {
        const value = Number(row[valueKey] || 0);
        return (
          <li key={row.id || row[labelKey] || index}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-slate-700">
                {row[labelKey]}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {format(value)}
                {row.meta ? <span className="ml-2 text-slate-400">{row.meta}</span> : null}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const DONUT_COLORS = [
  "#059669",
  "#1d4ed8",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#0891b2",
  "#64748b",
  "#db2777",
];

/** Donut with a legend — used for the order-status split. */
export function DonutChart({ data = [], size = 180, centerLabel = "Orders" }) {
  const total = data.reduce((sum, row) => sum + Number(row.value || 0), 0);
  if (!total) return <EmptyChart height={size} message="No orders yet" />;

  const radius = size / 2;
  const stroke = size * 0.18;
  const inner = radius - stroke / 2;
  const circumference = 2 * Math.PI * inner;

  // Offsets are precomputed: mutating a variable while rendering breaks
  // under React's compiler and double-invoked renders.
  const segments = [];
  let running = 0;
  for (const row of data) {
    const dash = (Number(row.value || 0) / total) * circumference;
    segments.push({ ...row, dash, offset: running });
    running += dash;
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} role="img" aria-label={`${centerLabel} breakdown`}>
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {segments.map((segment, index) => (
            <circle
              key={segment.label}
              cx={radius}
              cy={radius}
              r={inner}
              fill="none"
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <text
          x={radius}
          y={radius - 4}
          textAnchor="middle"
          className="fill-slate-900"
          style={{ fontSize: 22, fontWeight: 600 }}
        >
          {total.toLocaleString("en-IN")}
        </text>
        <text
          x={radius}
          y={radius + 14}
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: 11 }}
        >
          {centerLabel}
        </text>
      </svg>

      <ul className="min-w-[160px] flex-1 space-y-1.5 text-sm">
        {data.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-600">{row.label}</span>
            <span className="tabular-nums font-medium text-slate-800">{row.value}</span>
            <span className="w-10 text-right text-xs tabular-nums text-slate-400">
              {Math.round((row.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** KPI tile with a trend arrow against the previous period. */
export function KpiCard({ label, value, metric, hint, tone = "default", invertTrend = false }) {
  const change = metric?.changePct ?? 0;
  const isFlat = Math.abs(change) < 0.05;
  // For "cancellations", down is good — invertTrend flips the colouring.
  const isGood = invertTrend ? change < 0 : change > 0;

  const trendClass = isFlat
    ? "text-slate-400"
    : isGood
      ? "text-emerald-600"
      : "text-rose-600";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm",
        tone === "warn" ? "border-amber-200" : "border-slate-200",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>

      {metric ? (
        <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", trendClass)}>
          <span>{isFlat ? "→" : isGood ? "↑" : "↓"}</span>
          <span className="tabular-nums">{Math.abs(change)}%</span>
          <span className="font-normal text-slate-400">vs previous period</span>
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
