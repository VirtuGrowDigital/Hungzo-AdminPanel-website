import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Bike,
  PackageCheck,
  RefreshCw,
  Timer,
  TrendingUp,
} from "lucide-react";
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
  InlineAlert,
  Select,
  StatusPill,
} from "../../Components/MulticityUI";
import { BarList, DonutChart, KpiCard, TrendChart } from "../../Components/Charts";
import { formatMoney, formatNumber as number } from "../../utils/format";
import { useAuth } from "../../Context/AuthProvider";
import { useLocations } from "../../Context/LocationProvider";
import { PERMISSIONS } from "../../Config/permissions";
import {
  DASHBOARD_RANGES,
  getDashboardLive,
  getDashboardOverview,
  idOf,
} from "../../Api/multicity";

const LIVE_POLL_MS = 30000;

/**
 * The real dashboard: scope-aware KPIs, a revenue/orders trend, breakdowns,
 * top products, low stock and a live operations strip.
 *
 * Everything comes from GET /admin/dashboard/overview, which applies the
 * admin's scope server-side — a city manager sees their own city's numbers
 * from the same call, with no client-side filtering to get wrong.
 */
export default function Dashboard() {
  const { user, can } = useAuth();
  const { cities, warehouses, warehousesOfCity } = useLocations();

  const [range, setRange] = useState("7d");
  const [cityId, setCityId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [data, setData] = useState(null);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canSeeLive = can(PERMISSIONS.DASHBOARD.LIVE_OPERATIONS);
  const canSeeCrossCity = can(PERMISSIONS.DASHBOARD.ANALYTICS);

  const params = useMemo(
    () => ({
      range,
      ...(cityId ? { cityId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
    }),
    [range, cityId, warehouseId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getDashboardOverview(params);
    setLoading(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }
    setError("");
    setData(res.data);
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  // Live strip polls on its own cadence so the heavy query isn't repeated.
  useEffect(() => {
    if (!canSeeLive) return undefined;

    let active = true;
    const tick = async () => {
      const res = await getDashboardLive(
        cityId || warehouseId ? { cityId, warehouseId } : {},
      );
      if (active && res.ok) setLive(res.data);
    };

    tick();
    const timer = setInterval(tick, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [canSeeLive, cityId, warehouseId]);

  const kpis = data?.kpis;

  const statusData = useMemo(
    () =>
      (data?.statusBreakdown || []).map((row) => ({
        label: row.status,
        value: row.count,
      })),
    [data],
  );

  const productData = useMemo(
    () =>
      (data?.topProducts || []).map((row) => ({
        id: idOf(row.productId),
        label: row.name || "Unnamed product",
        value: row.revenue,
        meta: `${number(row.quantity)} sold`,
      })),
    [data],
  );

  const paymentData = useMemo(
    () =>
      (data?.paymentBreakdown || []).map((row) => ({
        label: row.method || "Unknown",
        value: row.revenue,
        meta: `${number(row.count)} orders`,
      })),
    [data],
  );

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Overview"
        title={`Welcome back, ${user?.username || "admin"}`}
        description="Revenue, orders and operations for everything inside your scope. Switch the period or narrow to one city to compare."
        icon={BarChart3}
        meta={data?.range?.label || "Loading..."}
        action={
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      {/* ---------------------------- filters ---------------------------- */}
      <AdminPanel>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
          <Field label="Period">
            <Select value={range} onChange={(e) => setRange(e.target.value)}>
              {DASHBOARD_RANGES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="City">
            <Select
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value);
                setWarehouseId("");
              }}
            >
              <option value="">All my cities</option>
              {cities.map((city) => (
                <option key={idOf(city._id)} value={idOf(city._id)}>
                  {city.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Warehouse">
            <Select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">All warehouses</option>
              {(cityId ? warehousesOfCity(cityId) : warehouses).map((warehouse) => (
                <option key={idOf(warehouse._id)} value={idOf(warehouse._id)}>
                  {warehouse.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </AdminPanel>

      {/* ------------------------------ KPIs ----------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={formatMoney(kpis?.revenue?.value)}
          metric={kpis?.revenue}
        />
        <KpiCard label="Orders" value={number(kpis?.orders?.value)} metric={kpis?.orders} />
        <KpiCard
          label="Average order value"
          value={formatMoney(kpis?.averageOrderValue?.value)}
          metric={kpis?.averageOrderValue}
        />
        <KpiCard
          label="Cancellation rate"
          value={`${kpis?.cancelRate?.value ?? 0}%`}
          metric={kpis?.cancelRate}
          invertTrend
          tone={(kpis?.cancelRate?.value ?? 0) > 10 ? "warn" : "default"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Customers who ordered"
          value={number(kpis?.customers?.value)}
          metric={kpis?.customers}
        />
        <KpiCard
          label="New customers"
          value={number(kpis?.newCustomers?.value)}
          metric={kpis?.newCustomers}
        />
        <KpiCard
          label="Items sold"
          value={number(kpis?.itemsSold?.value)}
          hint="In the selected period"
        />
        <KpiCard
          label="Cancelled orders"
          value={number(kpis?.cancelledOrders?.value)}
          metric={kpis?.cancelledOrders}
          invertTrend
        />
      </div>

      {/* ------------------------- live operations ----------------------- */}
      {canSeeLive ? (
        <AdminPanel>
          <AdminSectionTitle
            title="Right now"
            description={
              live?.asOf
                ? `Updated ${new Date(live.asOf).toLocaleTimeString("en-IN")} · refreshes every 30s`
                : "Loading live operations..."
            }
            action={
              live ? (
                <span className="text-sm text-slate-500">
                  Last hour: {number(live.lastHour?.orders)} orders ·{" "}
                  {formatMoney(live.lastHour?.revenue)}
                </span>
              ) : null
            }
          />
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
            <OpsTile
              icon={PackageCheck}
              label="Active orders"
              value={live?.operations?.activeOrders}
            />
            <OpsTile
              icon={Timer}
              label="Awaiting a driver"
              value={live?.operations?.awaitingDriver}
              warn={(live?.operations?.awaitingDriver || 0) > 0}
            />
            <OpsTile
              icon={TrendingUp}
              label="Out for delivery"
              value={live?.operations?.outForDelivery}
            />
            <OpsTile
              icon={Bike}
              label="Drivers online"
              value={live?.operations?.onlineDrivers}
              hint={`of ${number(live?.operations?.totalDrivers)} approved`}
              warn={(live?.operations?.onlineDrivers || 0) === 0}
            />
          </div>

          {live?.recentOrders?.length ? (
            <DataTable
              keyField="id"
              rows={live.recentOrders}
              columns={[
                {
                  key: "createdAt",
                  header: "Placed",
                  render: (row) => new Date(row.createdAt).toLocaleTimeString("en-IN"),
                },
                { key: "city", header: "City" },
                { key: "warehouse", header: "Warehouse" },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusPill value={row.status} />,
                },
                {
                  key: "totalAmount",
                  header: "Total",
                  render: (row) => formatMoney(row.totalAmount),
                },
              ]}
            />
          ) : null}
        </AdminPanel>
      ) : null}

      {/* ---------------------------- trend ----------------------------- */}
      <AdminPanel>
        <AdminSectionTitle
          title="Revenue & orders"
          description="Cancelled orders are excluded from revenue."
        />
        <div className="px-5 py-4">
          {loading && !data ? (
            <div className="h-[260px] animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <TrendChart data={data?.timeseries || []} />
          )}
        </div>
      </AdminPanel>

      {/* -------------------------- breakdowns -------------------------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel>
          <AdminSectionTitle title="Order status" description="Where orders are sitting" />
          <div className="px-5 py-4">
            <DonutChart data={statusData} />
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionTitle title="Payment methods" description="Revenue by method" />
          <div className="px-5 py-4">
            <BarList data={paymentData} />
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminPanel>
          <AdminSectionTitle
            title="Top products"
            description="By revenue in this period"
            action={
              can(PERMISSIONS.CATALOGUE.VIEW) ? (
                <Link
                  to="/product/inventory"
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  View catalogue
                </Link>
              ) : null
            }
          />
          <div className="px-5 py-4">
            <BarList data={productData} />
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionTitle
            title="Low stock"
            description={
              data?.lowStock
                ? `${number(data.lowStock.count)} item(s) at or below ${data.lowStock.threshold} available`
                : "Checking stock..."
            }
            action={
              can(PERMISSIONS.INVENTORY.VIEW) ? (
                <Link
                  to="/inventory"
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Manage inventory
                </Link>
              ) : null
            }
          />
          {data?.lowStock?.items?.length ? (
            <DataTable
              keyField="inventoryId"
              rows={data.lowStock.items}
              columns={[
                { key: "product", header: "Product" },
                { key: "warehouse", header: "Warehouse" },
                {
                  key: "available",
                  header: "Available",
                  render: (row) => (
                    <span
                      className={
                        row.available <= 0
                          ? "font-semibold text-rose-600"
                          : "font-medium text-amber-600"
                      }
                    >
                      {row.available}
                    </span>
                  ),
                },
              ]}
            />
          ) : (
            <EmptyState
              title="Nothing running low"
              description="Every available item is above the low-stock threshold."
            />
          )}
        </AdminPanel>
      </div>

      {/* ------------------------ city comparison ----------------------- */}
      {canSeeCrossCity ? (
        <AdminPanel>
          <AdminSectionTitle
            title="By city"
            description="A weak city is invisible inside a healthy total — this is where it shows."
            action={
              can(PERMISSIONS.ORDERS.VIEW_ALL) ? (
                <Link
                  to="/orders/cities"
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Cross-city orders
                </Link>
              ) : null
            }
          />
          <DataTable
            keyField="cityId"
            rows={data?.cityBreakdown || []}
            empty={<EmptyState title="No city data for this period" />}
            columns={[
              { key: "city", header: "City" },
              { key: "orders", header: "Orders", render: (row) => number(row.orders) },
              {
                key: "revenue",
                header: "Revenue",
                render: (row) => formatMoney(row.revenue),
              },
              {
                key: "aov",
                header: "AOV",
                render: (row) =>
                  formatMoney(row.orders ? row.revenue / row.orders : 0),
              },
            ]}
          />
        </AdminPanel>
      ) : null}

      {/* -------------------------- warehouses -------------------------- */}
      <AdminPanel>
        <AdminSectionTitle title="By warehouse" description="Revenue per store" />
        <DataTable
          keyField="warehouseId"
          rows={data?.warehouseBreakdown || []}
          empty={<EmptyState title="No warehouse data for this period" />}
          columns={[
            { key: "warehouse", header: "Warehouse" },
            { key: "orders", header: "Orders", render: (row) => number(row.orders) },
            {
              key: "revenue",
              header: "Revenue",
              render: (row) => formatMoney(row.revenue),
            },
          ]}
        />
      </AdminPanel>
    </AdminPage>
  );
}

function OpsTile({ icon, label, value, hint, warn }) {
  const Glyph = warn ? AlertTriangle : icon;
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warn ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Glyph className={`h-4 w-4 ${warn ? "text-amber-500" : "text-slate-400"}`} />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value === undefined || value === null ? "—" : number(value)}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
