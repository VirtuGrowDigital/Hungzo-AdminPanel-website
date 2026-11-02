import React from "react";
import { AlertTriangle, CheckCircle2, Loader2, MapPin, PlusCircle, Store } from "lucide-react";

/**
 * Building blocks for the Add Product screen in a multi-location catalogue:
 *   <DuplicateNotice>  "this product already exists — add it to your location"
 *   <LocationPicker>   which of my warehouses sell it + opening stock
 */

const matchLabel = {
  SKU: "same SKU",
  UPC: "same UPC / barcode",
  NAME_BRAND_PACK: "same name, brand & pack size",
};

export function DuplicateNotice({ exact = [], similar = [], checking, onUseExisting }) {
  if (checking && !exact.length) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking the catalogue for this product…
      </div>
    );
  }

  if (exact.length) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-900">This product already exists in the catalogue</p>
            <p className="mt-0.5 text-sm text-amber-800">
              Don't create it again. Add the existing product to your location and set your own price
              and stock. Customers everywhere then see one product.
            </p>
            <div className="mt-3 space-y-2">
              {exact.map((product) => (
                <div
                  key={product._id}
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-amber-200"
                >
                  {product.primaryImage ? (
                    <img src={product.primaryImage} alt="" className="h-11 w-11 rounded-lg object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {[product.brand, product.packSizeLabel, product.sku && `SKU ${product.sku}`]
                        .filter(Boolean)
                        .join(" • ")}
                      {product.matchedOn ? ` — ${matchLabel[product.matchedOn] || product.matchedOn}` : ""}
                    </p>
                    {product.varieties?.length ? (
                      <p className="text-xs text-slate-400">
                        Varieties: {product.varieties.map((v) => v.name).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  {product.listedInMyLocations ? (
                    <button
                      type="button"
                      onClick={() => onUseExisting(product._id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Already yours — edit price & stock
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUseExisting(product._id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Add to my location
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (similar.length) {
    return (
      <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
        <p className="font-semibold">Similar products already in the catalogue</p>
        <p className="text-xs text-sky-800">
          If one of these is the same product, add it to your location instead of creating a new one.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {similar.map((product) => (
            <button
              key={product._id}
              type="button"
              onClick={() => onUseExisting(product._id)}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100"
              title="Open price & stock for this product"
            >
              {product.name}
              {product.brand ? ` · ${product.brand}` : ""}
              {product.packSizeLabel ? ` · ${product.packSizeLabel}` : ""}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export function LocationPicker({
  warehouses = [],
  selected = [],
  onToggle,
  varieties = [],
  openingStock = {},
  onStockChange,
  required,
  inputClass,
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Store className="h-5 w-5 text-emerald-600" /> Where will you sell it?
        </h2>
        <p className="text-sm text-slate-500">
          {required
            ? "Pick at least one of your locations. Prices start from the variety prices above; fine-tune each location later under Price & stock."
            : "Optional for Super Admin. Leave empty to add it to the catalogue only, then list it in locations later."}
        </p>
      </div>

      {warehouses.length === 0 ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          No warehouses are assigned to your account. Ask a Super Admin to set your scope.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {warehouses.map((warehouse) => {
            const id = String(warehouse._id);
            const checked = selected.includes(id);
            return (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ring-1 transition ${
                  checked ? "bg-emerald-50 ring-emerald-300" : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(id)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-800">{warehouse.name}</span>
              </label>
            );
          })}
        </div>
      )}

      {selected.length > 0 && varieties.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">
            Opening stock {selected.length > 1 ? "(for each selected location)" : ""}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {varieties.map((variety) => (
              <label key={variety.id} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-700">{variety.name}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={openingStock[variety.id] ?? ""}
                  placeholder="0"
                  onChange={(e) => onStockChange(variety.id, e.target.value)}
                  className={`${inputClass} w-28`}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
