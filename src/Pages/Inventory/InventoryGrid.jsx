import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Boxes,
  Download,
  RefreshCw,
  Save,
  Upload,
} from "lucide-react";
import {
  AdminHero,
  AdminPage,
  AdminPanel,
  AdminSearchField,
  AdminSectionTitle,
} from "../../Components/AdminPrimitives";
import {
  Button,
  EmptyState,
  Field,
  InlineAlert,
  Select,
  Toggle,
  cn,
} from "../../Components/MulticityUI";
import { useLocations } from "../../Context/LocationProvider";
import ProductSectionTabs from "../Product/ProductSectionTabs";
import {
  bulkUpdateInventory,
  idOf,
  listInventory,
} from "../../Api/multicity";

const PAGE_SIZE = 50;

const rowKey = (item) => idOf(item._id);

export default function InventoryGrid() {
  const { warehouses, cityName, loading: locationsLoading } = useLocations();
  const [warehouseId, setWarehouseId] = useState("");
  const [availability, setAvailability] = useState("");
  const [search, setSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!warehouseId && warehouses.length) {
      setWarehouseId(idOf(warehouses[0]._id));
    }
  }, [warehouses, warehouseId]);

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    const res = await listInventory({
      warehouseId,
      page,
      limit: PAGE_SIZE,
      ...(availability === "" ? {} : { isAvailable: availability }),
      ...(serverSearch ? { search: serverSearch } : {}),
    });
    setLoading(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setItems(res.data?.items || []);
    setPagination(res.data?.pagination || { page: 1, pages: 1, total: 0 });
  }, [warehouseId, page, availability, serverSearch]);

  // Search runs on the server (all pages), debounced while typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setServerSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = useMemo(() => items, [items]);

  const varietyName = (item) => {
    const variety = (item.productId?.varieties || []).find(
      (entry) => idOf(entry._id) === idOf(item.variantId),
    );
    return variety?.name || `variant ${String(idOf(item.variantId)).slice(-6) || "—"}`;
  };

  const dirtyCount = Object.keys(drafts).length;

  const setDraft = (item, patch) => {
    const key = rowKey(item);
    setDrafts((current) => ({
      ...current,
      [key]: { ...(current[key] || {}), ...patch },
    }));
  };

  const valueOf = (item, field) => {
    const key = rowKey(item);
    const draft = drafts[key];
    if (draft && draft[field] !== undefined) return draft[field];
    return item[field];
  };

  const saveAll = async () => {
    const payload = Object.entries(drafts).map(([id, patch]) => ({ id, ...patch }));
    if (!payload.length) return;

    setSaving(true);
    const res = await bulkUpdateInventory(warehouseId, payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(`${payload.length} row(s) updated`);
    setDrafts({});
    load();
  };

  const exportCsv = () => {
    if (!items.length) {
      toast.error("Nothing to export on this page");
      return;
    }
    const rows = items.map((item) => ({
      inventoryId: rowKey(item),
      product: item.productId?.name || item.productId?.title || "",
      variety: varietyName(item),
      sku: item.productId?.sku || "",
      variantId: idOf(item.variantId),
      mrp: item.mrp,
      sellingPrice: item.sellingPrice,
      stockQty: item.stockQty,
      reservedQty: item.reservedQty,
      isAvailable: item.isAvailable,
      maxPerOrder: item.maxPerOrder ?? "",
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "inventory");
    const warehouse = warehouses.find((w) => idOf(w._id) === warehouseId);
    XLSX.writeFile(book, `inventory-${warehouse?.name || "warehouse"}-page${page}.csv`);
  };

  const importCsv = async (file) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const payload = rows
        .filter((row) => row.inventoryId)
        .map((row) => {
          const item = { id: String(row.inventoryId).trim() };
          if (row.mrp !== undefined && row.mrp !== "") item.mrp = Number(row.mrp);
          if (row.sellingPrice !== undefined && row.sellingPrice !== "")
            item.sellingPrice = Number(row.sellingPrice);
          if (row.stockQty !== undefined && row.stockQty !== "")
            item.stockQty = Number(row.stockQty);
          if (row.isAvailable !== undefined && row.isAvailable !== "") {
            item.isAvailable =
              row.isAvailable === true ||
              String(row.isAvailable).toLowerCase() === "true";
          }
          if (row.maxPerOrder !== undefined && row.maxPerOrder !== "")
            item.maxPerOrder = Number(row.maxPerOrder);
          return item;
        });

      if (!payload.length) {
        toast.error("No rows with an inventoryId column found");
        return;
      }
      if (payload.length > 1000) {
        toast.error("Maximum 1000 rows per upload");
        return;
      }

      setSaving(true);
      const res = await bulkUpdateInventory(warehouseId, payload);
      setSaving(false);

      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`${payload.length} row(s) imported`);
      load();
    } catch (error) {
      toast.error(error.message || "Could not read that file");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const outOfStock = items.filter((item) => (item.stockQty || 0) - (item.reservedQty || 0) <= 0).length;
  const selectedWarehouse = warehouses.find((w) => idOf(w._id) === warehouseId);

  return (
    <AdminPage>
      <ProductSectionTabs />
      <AdminHero
        eyebrow="Multi-city"
        title="Stock & prices"
        description="Price and stock are per warehouse. The same product can be ₹45 in Gwalior and ₹48 in Lucknow — one catalogue, separate inventory rows."
        icon={Boxes}
        meta={
          selectedWarehouse
            ? `${selectedWarehouse.name} · ${cityName(selectedWarehouse.cityId?._id || selectedWarehouse.cityId)}`
            : "Select a warehouse"
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={load} disabled={loading || !warehouseId}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="ghost" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button variant="success" onClick={saveAll} disabled={!dirtyCount || saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : `Save ${dirtyCount || ""}`}
            </Button>
          </div>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => importCsv(e.target.files?.[0])}
      />

      <AdminPanel>
        <AdminSectionTitle
          title="Inventory rows"
          description="Edit inline, then save. Import expects the exported columns — inventoryId plus any of mrp, sellingPrice, stockQty, isAvailable, maxPerOrder."
        />

        <div className="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-4">
          <Field label="Warehouse">
            <Select
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setPage(1);
                setDrafts({});
              }}
              disabled={locationsLoading}
            >
              {warehouses.map((warehouse) => (
                <option key={idOf(warehouse._id)} value={idOf(warehouse._id)}>
                  {warehouse.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Availability">
            <Select
              value={availability}
              onChange={(e) => {
                setAvailability(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="true">Available only</option>
              <option value="false">Unavailable only</option>
            </Select>
          </Field>

          <Field label="Search products" className="sm:col-span-2">
            <AdminSearchField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product name, SKU or brand"
            />
          </Field>
        </div>

        {dirtyCount > 0 ? (
          <div className="px-5 pt-4">
            <InlineAlert tone="warn">
              {dirtyCount} unsaved row(s). Changing warehouse or page discards them.
            </InlineAlert>
          </div>
        ) : null}

        {!warehouseId ? (
          <EmptyState title="Select a warehouse" description="Inventory is always warehouse-scoped." />
        ) : loading ? (
          <EmptyState title="Loading inventory..." />
        ) : !visibleItems.length ? (
          <EmptyState
            title="No inventory rows"
            description="This warehouse doesn't sell any matching product yet. Go to Products → “Add from catalogue” to list existing products here, or Add product to create a new one."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">MRP</th>
                  <th className="px-4 py-3">Selling price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Available qty</th>
                  <th className="px-4 py-3">Max/order</th>
                  <th className="px-4 py-3">Sellable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const product = item.productId || {};
                  const dirty = Boolean(drafts[rowKey(item)]);
                  const availableQty =
                    Number(valueOf(item, "stockQty") || 0) - Number(item.reservedQty || 0);

                  return (
                    <tr
                      key={rowKey(item)}
                      className={cn("hover:bg-slate-50/70", dirty && "bg-amber-50/60")}
                    >
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-900">
                          {product.name || product.title || "Unnamed product"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {product.sku ? `${product.sku} · ` : ""}
                          {varietyName(item)}
                        </p>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                          value={valueOf(item, "mrp") ?? 0}
                          onChange={(e) => setDraft(item, { mrp: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                          value={valueOf(item, "sellingPrice") ?? 0}
                          onChange={(e) =>
                            setDraft(item, { sellingPrice: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                          value={valueOf(item, "stockQty") ?? 0}
                          onChange={(e) => setDraft(item, { stockQty: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-4 py-2 text-slate-500">{item.reservedQty || 0}</td>
                      <td
                        className={cn(
                          "px-4 py-2 font-medium",
                          availableQty <= 0 ? "text-rose-600" : "text-emerald-600",
                        )}
                      >
                        {availableQty}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          placeholder="—"
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1"
                          value={valueOf(item, "maxPerOrder") ?? ""}
                          onChange={(e) =>
                            setDraft(item, {
                              maxPerOrder:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Toggle
                          checked={valueOf(item, "isAvailable") !== false}
                          onChange={(checked) => setDraft(item, { isAvailable: checked })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-600">
          <span>
            {pagination.total} rows · page {pagination.page} of {pagination.pages || 1}
            {outOfStock ? ` · ${outOfStock} out of stock on this page` : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                setDrafts({});
                setPage((p) => Math.max(1, p - 1));
              }}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= (pagination.pages || 1)}
              onClick={() => {
                setDrafts({});
                setPage((p) => p + 1);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
