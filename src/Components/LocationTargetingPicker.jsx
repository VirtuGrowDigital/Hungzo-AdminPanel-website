import React, { useEffect, useState } from "react";
import { useLocations } from "../Context/LocationProvider";
import { listZones, idOf, emptyTargeting, isGlobalTargeting } from "../Api/multicity";
import { InlineAlert, cn } from "./MulticityUI";

/**
 * Picks where a banner / campaign applies.
 * Empty everywhere = global, which the backend allows for SUPERADMIN only.
 */
export default function LocationTargetingPicker({
  value,
  onChange,
  role,
  description = "Leave everything unselected to publish everywhere (super admin only).",
}) {
  const { states, cities, warehouses } = useLocations();
  const [zones, setZones] = useState([]);
  const targeting = value || emptyTargeting();
  const isSuper = role === "SUPERADMIN";

  useEffect(() => {
    let active = true;
    listZones().then((res) => {
      if (active && res.ok) setZones(res.data?.zones || []);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = (dimension, id) => {
    const current = new Set((targeting[dimension] || []).map(String));
    if (current.has(String(id))) current.delete(String(id));
    else current.add(String(id));
    onChange({ ...targeting, [dimension]: [...current] });
  };

  const group = (label, dimension, options, renderLabel) => (
    <div key={dimension}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {options.length ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const id = idOf(option._id);
            const selected = (targeting[dimension] || []).map(String).includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(dimension, id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  selected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {renderLabel(option)}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400">None available</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">Where does this apply?</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      {group("States", "stateIds", states, (s) => `${s.name} (${s.code})`)}
      {group("Cities", "cityIds", cities, (c) => c.name)}
      {group("Zones", "zoneIds", zones, (z) => `${z.name} · ${z.cityId?.name || ""}`)}
      {group("Warehouses", "warehouseIds", warehouses, (w) => w.name)}

      {isGlobalTargeting(targeting) ? (
        isSuper ? (
          <InlineAlert tone="warn">
            Nothing selected — this will go to <strong>every city</strong>.
          </InlineAlert>
        ) : (
          <InlineAlert tone="error">
            Select at least one location. Only a super admin can publish everywhere.
          </InlineAlert>
        )
      ) : (
        <InlineAlert tone="success">
          Restricted to the selected locations only.
        </InlineAlert>
      )}
    </div>
  );
}
