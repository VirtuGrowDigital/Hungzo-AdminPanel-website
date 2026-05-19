import React from "react";
import { Search } from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export function AdminPage({ children, className = "" }) {
  return (
    <div className={cn("min-h-full bg-slate-50 px-4 py-4 md:px-6 md:py-6", className)}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">{children}</div>
    </div>
  );
}

export function AdminHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  meta,
  action,
  accent = "emerald",
}) {
  const accentStyles = {
    emerald: "from-slate-950 via-slate-900 to-emerald-900 text-emerald-200",
    cyan: "from-slate-950 via-slate-900 to-cyan-900 text-cyan-200",
    amber: "from-slate-950 via-slate-900 to-amber-900 text-amber-200",
  };

  const gradient = accentStyles[accent] || accentStyles.emerald;
  const eyebrowClass = gradient.split(" ").slice(-1)[0];

  return (
    <section className={cn("rounded-[1.75rem] bg-gradient-to-r p-6 text-white shadow-xl", gradient)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
              <Icon className="h-5 w-5 text-white" />
            </div>
          ) : null}
          <div>
            {eyebrow ? (
              <p className={cn("text-xs font-semibold uppercase tracking-[0.24em]", eyebrowClass)}>
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">{description}</p>
            ) : null}
          </div>
        </div>

        {meta || action ? (
          <div className="flex flex-col items-start gap-3 lg:items-end">
            {meta ? (
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
                {meta}
              </div>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AdminPanel({ children, className = "" }) {
  return (
    <section className={cn("overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}

export function AdminSectionTitle({ title, description, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function AdminTabs({ tabs, activeKey, onChange, className = "" }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeKey;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
              isActive
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AdminSearchField({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) {
  return (
    <label className={cn("relative block", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}
