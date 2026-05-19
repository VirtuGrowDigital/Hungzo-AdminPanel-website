import React from "react";
import { ChevronRight } from "lucide-react";

export default function SectionTabsPanel({
  title,
  eyebrow,
  helper,
  items,
  activeKey,
  onChange,
  children,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
            ) : null}
            {helper ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
            ) : null}
          </div>

          <div className="flex gap-3 overflow-x-auto px-3 py-3 xl:block xl:space-y-3 xl:overflow-visible">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === activeKey;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(item.key)}
                  className={`group min-w-[240px] rounded-[1.5rem] border px-4 py-4 text-left transition xl:block xl:min-w-0 xl:w-full ${
                    isActive
                      ? "border-emerald-200 bg-emerald-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-2xl p-3 ${
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      {Icon ? <Icon className="h-5 w-5" /> : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={`text-sm font-semibold ${
                            isActive ? "text-emerald-900" : "text-slate-900"
                          }`}
                        >
                          {item.title}
                        </p>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 transition ${
                            isActive
                              ? "translate-x-0 text-emerald-700"
                              : "text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500"
                          }`}
                        />
                      </div>

                      {item.description ? (
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {item.description}
                        </p>
                      ) : null}

                      {item.meta ? (
                        <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                          {item.meta}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
