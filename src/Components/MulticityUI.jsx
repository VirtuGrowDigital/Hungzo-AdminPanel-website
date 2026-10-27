import React from "react";
import { STATUS_TONES } from "../Api/multicity";

export const cn = (...classes) => classes.filter(Boolean).join(" ");

export function StatusPill({ value, className = "" }) {
  const tone = STATUS_TONES[value] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        tone,
        className,
      )}
    >
      {String(value || "—").replace(/_/g, " ")}
    </span>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

const baseInput =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400";

export function TextInput(props) {
  return <input {...props} className={cn(baseInput, props.className)} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={cn(baseInput, props.className)}>
      {children}
    </select>
  );
}

export function TextArea(props) {
  return <textarea {...props} className={cn(baseInput, "min-h-[90px]", props.className)} />;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
    ghost:
      "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-slate-700 disabled:opacity-50"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          checked ? "bg-emerald-500" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
            checked ? "left-4.5" : "left-0.5",
          )}
        />
      </span>
      {label ? <span>{label}</span> : null}
    </button>
  );
}

export function Modal({ open, title, description, onClose, children, width = "max-w-2xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className={cn("my-8 w-full rounded-3xl bg-white shadow-2xl", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="max-w-md text-sm text-slate-500">{description}</p> : null}
      {action}
    </div>
  );
}

export function InlineAlert({ tone = "info", children }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", tones[tone])}>{children}</div>
  );
}

export function DataTable({ columns, rows, keyField = "_id", empty }) {
  if (!rows.length) return empty || <EmptyState title="Nothing here yet" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row[keyField] || index} className="hover:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 align-middle text-slate-700">
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
