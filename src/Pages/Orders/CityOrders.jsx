import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Activity, RefreshCw } from "lucide-react";
import {
  AdminHero,
  AdminPage,
  AdminPanel,
  AdminSectionTitle,
} from "../../Components/AdminPrimitives";
import {
  Button,
  DataTable,
  EmptyState,
  Field,
  Select,
  StatusPill,
  cn,
} from "../../Components/MulticityUI";
import { useLocations } from "../../Context/LocationProvider";
import { getAdminOrders } from "../../Api";
import { idOf } from "../../Api/multicity";
import useStaffSocket from "../../hooks/useStaffSocket";

const CANCELLED = new Set(["Cancelled", "Rejected"]);

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

/**
 * Side-by-side city performance. Orders already carry cityId/warehouseId, so
 * this works without any extra backend aggregation endpoint.
 */
export default function CityOrders() {
  const { cities, warehouses, cityName, warehouseName } = useLocations();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [liveCount, setLiveCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAdminOrders();
    setLoading(false);

    // getAdminOrders() returns { ok, data } where data is the API body.
    if (!res?.ok) {
      toast.error(res?.message || "Failed to load orders");
      return;
    }
    setOrders(res.data?.orders || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { connected } = useStaffSocket({
    onNewOrder: (payload) => {
      setLiveCount((count) => count + 1);
      toast.success(
        `New order in ${cityName(payload.cityId) || "your area"} · ${money(payload.totalAmount)}`,
      );
      load();
    },
  });

  const stats = useMemo(() => {
    const byCity = new Map();

    orders.forEach((order) => {
      const key = idOf(order.cityId) || "unassigned";
      if (!byCity.has(key)) {
        byCity.set(key, {
          cityId: key,
          city: key === "unassigned" ? "Unassigned" : cityName(key),
          orders: 0,
          gmv: 0,
          cancelled: 0,
        });
      }
      const row = byCity.get(key);
      row.orders += 1;
      if (CANCELLED.has(order.orderStatus)) row.cancelled += 1;
      else row.gmv += Number(order.totalAmount || 0);
    });

    return [...byCity.values()]
      .map((row) => ({
        ...row,
        aov: row.orders ? Math.round(row.gmv / Math.max(1, row.orders - row.cancelled)) : 0,
        cancelRate: row.orders ? Math.round((row.cancelled / row.orders) * 100) : 0,
      }))
      .sort((a, b) => b.gmv - a.gmv);
  }, [orders, cityName]);

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        if (cityFilter && idOf(order.cityId) !== cityFilter) return false;
        if (warehouseFilter && idOf(order.warehouseId) !== warehouseFilter) return false;
        if (statusFilter && order.orderStatus !== statusFilter) return false;
        return true;
      }),
    [orders, cityFilter, warehouseFilter, statusFilter],
  );

  const statuses = useMemo(
    () => [...new Set(orders.map((order) => order.orderStatus).filter(Boolean))],
    [orders],
  );

  const unassigned = orders.filter((order) => !order.cityId).length;

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Multi-city"
        title="Cross-city orders"
        description="Every city side by side. A broken Lucknow is invisible inside healthy Gwalior totals — this is where you spot it."
        icon={Activity}
        meta={
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected ? "bg-emerald-400" : "bg-slate-400",
              )}
            />
            {connected ? "Live" : "Offline"}
            {liveCount ? ` · ${liveCount} new` : ""}
          </span>
        }
        action={
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <AdminPanel>
        <AdminSectionTitle
          title="City performance"
          description="From the orders visible to your admin scope. Cancelled orders are excluded from GMV."
        />
        <DataTable
          keyField="cityId"
          rows={stats}
          empty={<EmptyState title="No orders yet" />}
          columns={[
            { key: "city", header: "City" },
            { key: "orders", header: "Orders" },
            { key: "gmv", header: "GMV", render: (row) => money(row.gmv) },
            { key: "aov", header: "AOV", render: (row) => money(row.aov) },
            {
              key: "cancelRate",
              header: "Cancelled",
              render: (row) => (
                <span className={row.cancelRate > 10 ? "font-semibold text-rose-600" : ""}>
                  {row.cancelRate}% ({row.cancelled})
                </span>
              ),
            },
          ]}
        />
        {unassigned > 0 ? (
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-amber-700">
            {unassigned} order(s) have no city — these predate the multi-city migration.
            Run the backfill script to stamp them.
          </p>
        ) : null}
      </AdminPanel>

      <AdminPanel>
        <AdminSectionTitle title="Orders" description="Filter by city, warehouse or status." />
        <div className="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-3">
          <Field label="City">
            <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((city) => (
                <option key={idOf(city._id)} value={idOf(city._id)}>
                  {city.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Warehouse">
            <Select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">All warehouses</option>
              {warehouses
                .filter(
                  (warehouse) =>
                    !cityFilter || idOf(warehouse.cityId?._id || warehouse.cityId) === cityFilter,
                )
                .map((warehouse) => (
                  <option key={idOf(warehouse._id)} value={idOf(warehouse._id)}>
                    {warehouse.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <DataTable
          rows={filtered.slice(0, 200)}
          empty={<EmptyState title="No orders match these filters" />}
          columns={[
            {
              key: "createdAt",
              header: "Placed",
              render: (order) => new Date(order.createdAt).toLocaleString(),
            },
            {
              key: "city",
              header: "City",
              render: (order) => cityName(order.cityId) || "—",
            },
            {
              key: "warehouse",
              header: "Warehouse",
              render: (order) =>
                warehouseName(order.warehouseId) ||
                order.warehouseAssignment?.name ||
                "—",
            },
            {
              key: "orderStatus",
              header: "Status",
              render: (order) => <StatusPill value={order.orderStatus} />,
            },
            { key: "paymentMethod", header: "Payment" },
            {
              key: "totalAmount",
              header: "Total",
              render: (order) => money(order.totalAmount),
            },
            {
              key: "invoiceNumber",
              header: "Invoice",
              render: (order) => order.invoiceNumber || "—",
            },
          ]}
        />
        {filtered.length > 200 ? (
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing the first 200 of {filtered.length} matching orders.
          </p>
        ) : null}
      </AdminPanel>
    </AdminPage>
  );
}
