import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Lock, MapPin, PackageCheck, Plus, Save, Search, Store, Trash2, Unlock } from "lucide-react";
import {
  getProductLocations,
  removeProductLocation,
  saveProductLocations,
} from "../../Api";
import { Button, InlineAlert, Modal, Toggle, cn } from "../../Components/MulticityUI";

/**
 * PRICE & STOCK PER LOCATION
 *
 * One product is one catalogue record. Every warehouse that sells it has its
 * own MRP, selling price, stock and on/off switch. This modal shows every
 * location the signed-in admin manages (all of them for a Super Admin) and
 * lets them:
 *   - start selling the product in a location ("Add to this location")
 *   - change price / stock / availability / max-per-order
 *   - stop selling it in a location
 *
 * The server enforces scope; this UI only ever receives the admin's own
 * locations.
 */

const keyOf = (warehouseId, variantId) => `${warehouseId}:${variantId}`;
const money = (value) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(Number(value))
    : "—";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50";

const rowProblem = (draft) => {
  const mrp = Number(draft.mrp);
  const selling = Number(draft.sellingPrice);
  const stock = Number(draft.stockQty);
  if (!(mrp > 0)) return "MRP must be more than 0";
  if (!(selling > 0)) return "Selling price must be more than 0";
  if (selling > mrp) return "Selling price is above MRP";
  if (!Number.isInteger(stock) || stock < 0) return "Stock must be a whole number";
  if (draft.reservedQty && stock < draft.reservedQty)
    return `Stock can't go below ${draft.reservedQty} reserved`;
  if (
    draft.maxPerOrder !== "" &&
    draft.maxPerOrder !== null &&
    draft.maxPerOrder !== undefined &&
    (!Number.isInteger(Number(draft.maxPerOrder)) || Number(draft.maxPerOrder) < 1)
  )
    return "Max per order must be 1 or more";
  return "";
};

export default function ProductLocationsModal({ productId, open, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState("");
  const [drafts, setDrafts] = useState({});
  const [adding, setAdding] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [onlyListed, setOnlyListed] = useState(false);

  const applyResponse = useCallback((res) => {
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setData(res.data);
    setDrafts({});
    setAdding(new Set());
  }, []);

  // Reload after an action (called from event handlers).
  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    const res = await getProductLocations(productId);
    setLoading(false);
    applyResponse(res);
  }, [productId, applyResponse]);

  // Initial load whenever the modal opens for a product.
  useEffect(() => {
    if (!open || !productId) return undefined;
    let active = true;
    getProductLocations(productId).then((res) => {
      if (active) applyResponse(res);
    });
    return () => {
      active = false;
    };
  }, [open, productId, applyResponse]);

  const showLoading = loading || (open && String(data?.product?._id || "") !== String(productId || ""));

  const locations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.locations || []).filter((location) => {
      if (onlyListed && !location.listed) return false;
      if (!term) return true;
      return [location.warehouse.name, location.warehouse.city, location.warehouse.state]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [data, search, onlyListed]);

  const listedCount = (data?.locations || []).filter((l) => l.listed).length;
  const totalCount = (data?.locations || []).length;

  const valueOf = (warehouseId, variant, field) => {
    const draft = drafts[keyOf(warehouseId, variant.variantId)];
    if (draft && draft[field] !== undefined) return draft[field];
    return variant[field] ?? "";
  };

  const setField = (warehouseId, variant, field, value) => {
    const key = keyOf(warehouseId, variant.variantId);
    setDrafts((current) => ({
      ...current,
      [key]: {
        mrp: variant.mrp,
        sellingPrice: variant.sellingPrice,
        stockQty: variant.stockQty,
        isAvailable: variant.listed ? variant.isAvailable : true,
        maxPerOrder: variant.maxPerOrder ?? "",
        reservedQty: variant.reservedQty,
        ...(current[key] || {}),
        [field]: value,
      },
    }));
  };

  const startSellingHere = (location) => {
    setAdding((current) => new Set(current).add(String(location.warehouse._id)));
    // Pre-fill every variety with the catalogue price and 0 stock.
    setDrafts((current) => {
      const next = { ...current };
      for (const variant of location.variants) {
        const key = keyOf(location.warehouse._id, variant.variantId);
        if (!next[key] && !variant.listed) {
          next[key] = {
            mrp: variant.catalogueMrp,
            sellingPrice: variant.catalogueSellingPrice,
            stockQty: 0,
            isAvailable: true,
            maxPerOrder: "",
            reservedQty: 0,
          };
        }
      }
      return next;
    });
  };

  const cancelAdding = (location) => {
    const id = String(location.warehouse._id);
    setAdding((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setDrafts((current) => {
      const next = { ...current };
      for (const variant of location.variants) {
        if (!variant.listed) delete next[keyOf(id, variant.variantId)];
      }
      return next;
    });
  };

  const dirtyEntries = Object.entries(drafts);
  const problems = dirtyEntries
    .map(([key, draft]) => [key, rowProblem(draft)])
    .filter(([, problem]) => problem);

  const save = async () => {
    if (!dirtyEntries.length) return;
    if (problems.length) {
      toast.error(problems[0][1]);
      return;
    }
    const rows = dirtyEntries.map(([key, draft]) => {
      const [warehouseId, variantId] = key.split(":");
      return {
        warehouseId,
        variantId,
        mrp: Number(draft.mrp),
        sellingPrice: Number(draft.sellingPrice),
        stockQty: Number(draft.stockQty),
        isAvailable: Boolean(draft.isAvailable),
        maxPerOrder:
          draft.maxPerOrder === "" || draft.maxPerOrder === null ? null : Number(draft.maxPerOrder),
      };
    });

    setSaving(true);
    const res = await saveProductLocations(productId, { rows });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(res.data?.message || "Saved");
    setData(res.data);
    setDrafts({});
    setAdding(new Set());
    onChanged?.();
  };

  const removeFrom = async (location) => {
    if (
      !window.confirm(
        `Stop selling "${data?.product?.name}" at ${location.warehouse.name}? Its price and stock there will be removed. The product stays in the catalogue.`,
      )
    )
      return;
    setRemoving(String(location.warehouse._id));
    const res = await removeProductLocation(productId, location.warehouse._id);
    setRemoving("");
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(res.data?.message || "Removed");
    await load();
    onChanged?.();
  };

  const product = data?.product;
  const access = data?.access;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-6xl"
      title="Price & stock by location"
      description="One product, many locations. Each location sets its own MRP, selling price and stock."
    >
      {showLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading locations…</p>
      ) : !data ? null : (
        <div className="space-y-4">
          {/* Product header */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            {product?.primaryImage ? (
              <img
                src={product.primaryImage}
                alt=""
                className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{product?.name}</p>
              <p className="text-xs text-slate-500">
                {[product?.brand, product?.packSizeLabel, product?.sku && `SKU ${product.sku}`]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                <PackageCheck className="h-3.5 w-3.5" />
                Sold in {listedCount} of your {totalCount} location{totalCount === 1 ? "" : "s"}
              </span>
              {data.otherLocations > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                  <Store className="h-3.5 w-3.5" />+{data.otherLocations} other location
                  {data.otherLocations === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>

          {access?.canEditMaster ? (
            <InlineAlert tone="success">
              <span className="inline-flex items-center gap-2">
                <Unlock className="h-4 w-4" />
                You can edit this product's details (name, images, varieties) from the product list, and
                set price & stock here.
              </span>
            </InlineAlert>
          ) : (
            <InlineAlert tone="warn">
              <span className="inline-flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                {access?.reason ||
                  "This product is shared. You can set price, stock and availability for your locations."}
              </span>
            </InlineAlert>
          )}

          {/* Tools */}
          {totalCount > 3 ? (
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a location, city or state"
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <Toggle checked={onlyListed} onChange={setOnlyListed} label="Only where it's sold" />
            </div>
          ) : null}

          {totalCount === 0 ? (
            <InlineAlert tone="error">
              You don't manage any warehouse yet. Ask a Super Admin to assign a city or warehouse to
              your account.
            </InlineAlert>
          ) : null}

          {/* Locations */}
          <div className="space-y-3">
            {locations.map((location) => {
              const warehouseId = String(location.warehouse._id);
              const isAdding = adding.has(warehouseId);
              const showRows = location.listed || isAdding;

              return (
                <div
                  key={warehouseId}
                  className={cn(
                    "rounded-2xl ring-1",
                    location.listed ? "bg-white ring-slate-200" : "bg-slate-50/60 ring-slate-200",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{location.warehouse.name}</p>
                        <p className="text-xs text-slate-500">
                          {[location.warehouse.city, location.warehouse.state].filter(Boolean).join(", ") ||
                            "—"}
                          {location.warehouse.status && location.warehouse.status !== "open"
                            ? ` • store ${location.warehouse.status}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          location.listed
                            ? "bg-emerald-100 text-emerald-700"
                            : isAdding
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-200 text-slate-600",
                        )}
                      >
                        {location.listed ? "Selling here" : isAdding ? "Will be added" : "Not sold here"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {!location.listed && !isAdding ? (
                        <Button size="sm" variant="success" onClick={() => startSellingHere(location)}>
                          <Plus className="h-3.5 w-3.5" /> Add to this location
                        </Button>
                      ) : null}
                      {isAdding && !location.listed ? (
                        <Button size="sm" variant="ghost" onClick={() => cancelAdding(location)}>
                          Cancel
                        </Button>
                      ) : null}
                      {location.listed ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={removing === warehouseId}
                          onClick={() => removeFrom(location)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          {removing === warehouseId ? "Removing…" : "Stop selling here"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {showRows ? (
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Variety</th>
                            <th className="px-2 py-2 font-semibold">MRP (₹)</th>
                            <th className="px-2 py-2 font-semibold">Selling price (₹)</th>
                            <th className="px-2 py-2 font-semibold">Stock</th>
                            <th className="px-2 py-2 font-semibold">Reserved</th>
                            <th className="px-2 py-2 font-semibold">Max / order</th>
                            <th className="px-2 py-2 font-semibold">On sale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {location.variants.map((variant) => {
                            const key = keyOf(warehouseId, variant.variantId);
                            const draft = drafts[key];
                            const problem = draft ? rowProblem(draft) : "";
                            const notListedVariant = !variant.listed && location.listed && !draft;
                            return (
                              <tr key={key} className={cn(draft && "bg-amber-50/40")}>
                                <td className="px-4 py-2">
                                  <p className="font-medium text-slate-800">{variant.name}</p>
                                  <p className="text-[11px] text-slate-400">
                                    Catalogue {money(variant.catalogueSellingPrice)} / MRP{" "}
                                    {money(variant.catalogueMrp)}
                                  </p>
                                  {problem ? (
                                    <p className="text-[11px] font-medium text-rose-600">{problem}</p>
                                  ) : null}
                                </td>
                                {notListedVariant ? (
                                  <td colSpan={6} className="px-2 py-2">
                                    <button
                                      type="button"
                                      onClick={() => setField(warehouseId, variant, "stockQty", 0)}
                                      className="text-xs font-semibold text-emerald-700 hover:underline"
                                    >
                                      + Sell this variety here
                                    </button>
                                  </td>
                                ) : (
                                  <>
                                    <td className="px-2 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className={inputClass}
                                        value={valueOf(warehouseId, variant, "mrp")}
                                        onChange={(e) => setField(warehouseId, variant, "mrp", e.target.value)}
                                      />
                                    </td>
                                    <td className="px-2 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className={inputClass}
                                        value={valueOf(warehouseId, variant, "sellingPrice")}
                                        onChange={(e) =>
                                          setField(warehouseId, variant, "sellingPrice", e.target.value)
                                        }
                                      />
                                    </td>
                                    <td className="px-2 py-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        className={inputClass}
                                        value={valueOf(warehouseId, variant, "stockQty")}
                                        onChange={(e) =>
                                          setField(warehouseId, variant, "stockQty", e.target.value)
                                        }
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-slate-500">{variant.reservedQty || 0}</td>
                                    <td className="px-2 py-2">
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="No limit"
                                        className={inputClass}
                                        value={valueOf(warehouseId, variant, "maxPerOrder") ?? ""}
                                        onChange={(e) =>
                                          setField(warehouseId, variant, "maxPerOrder", e.target.value)
                                        }
                                      />
                                    </td>
                                    <td className="px-2 py-2">
                                      <Toggle
                                        checked={Boolean(
                                          draft ? draft.isAvailable : variant.listed ? variant.isAvailable : true,
                                        )}
                                        onChange={(checked) =>
                                          setField(warehouseId, variant, "isAvailable", checked)
                                        }
                                      />
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 -mx-6 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <p className="text-xs text-slate-500">
              {dirtyEntries.length
                ? `${dirtyEntries.length} change${dirtyEntries.length === 1 ? "" : "s"} not saved yet`
                : "Customers in each area see that location's price and stock."}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="success"
                disabled={!dirtyEntries.length || saving || problems.length > 0}
                onClick={save}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save prices & stock"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
