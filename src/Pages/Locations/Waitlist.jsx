import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Flame, RefreshCw } from "lucide-react";
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
  TextInput,
} from "../../Components/MulticityUI";
import MapCanvas from "../../Components/MapCanvas";
import { listWaitlist, waitlistSummary } from "../../Api/multicity";

/**
 * Demand data from customers who opened the app where we do not deliver yet.
 * This is what should decide the launch order.
 */
export default function Waitlist() {
  const [summary, setSummary] = useState({ total: 0, cells: [], byCity: [] });
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ cityGuess: "", pincode: "", notified: "" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {
      page,
      limit: 25,
      ...(filters.cityGuess ? { cityGuess: filters.cityGuess } : {}),
      ...(filters.pincode ? { pincode: filters.pincode } : {}),
      ...(filters.notified ? { notified: filters.notified } : {}),
    };

    const [summaryRes, listRes] = await Promise.all([
      waitlistSummary({ precision: 2, ...params }),
      listWaitlist(params),
    ]);
    setLoading(false);

    if (summaryRes.ok) {
      setSummary({
        total: summaryRes.data?.total || 0,
        cells: summaryRes.data?.cells || [],
        byCity: summaryRes.data?.byCity || [],
      });
    } else {
      toast.error(summaryRes.message);
    }

    if (listRes.ok) {
      setItems(listRes.data?.items || []);
      setPagination(listRes.data?.pagination || { page: 1, pages: 1, total: 0 });
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const topCity = summary.byCity[0];

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Expansion"
        title="Demand heatmap"
        description="Every pin is someone who opened Hungzo where we don't deliver yet. Launch where the heat is, not where it feels right."
        icon={Flame}
        accent="amber"
        meta={
          topCity
            ? `${summary.total} requests · top: ${topCity.city} (${topCity.count})`
            : `${summary.total} requests`
        }
        action={
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <AdminPanel>
          <AdminSectionTitle
            title="Where people are asking"
            description="Bigger, darker circles = more requests in that ~1 km cell."
          />
          <div className="p-4">
            {summary.cells.length ? (
              <MapCanvas
                center={[26.2183, 78.1828]}
                zoom={7}
                heatCells={summary.cells}
                fitKey={`cells-${summary.cells.length}`}
                height="540px"
              />
            ) : (
              <EmptyState
                title="No demand data yet"
                description="The app writes here when a customer taps 'Notify me' outside a serviceable area."
              />
            )}
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionTitle title="By city" description="Ranked by request volume" />
          <DataTable
            keyField="city"
            rows={summary.byCity}
            empty={<EmptyState title="Nothing yet" />}
            columns={[
              { key: "city", header: "City guess" },
              { key: "count", header: "Requests" },
              { key: "pending", header: "Not notified" },
            ]}
          />
        </AdminPanel>
      </div>

      <AdminPanel>
        <AdminSectionTitle title="Requests" />
        <div className="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-4">
          <Field label="City guess">
            <TextInput
              value={filters.cityGuess}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, cityGuess: e.target.value });
              }}
              placeholder="Jhansi"
            />
          </Field>
          <Field label="Pincode">
            <TextInput
              value={filters.pincode}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, pincode: e.target.value });
              }}
            />
          </Field>
          <Field label="Notified">
            <Select
              value={filters.notified}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, notified: e.target.value });
              }}
            >
              <option value="">All</option>
              <option value="false">Not notified</option>
              <option value="true">Notified</option>
            </Select>
          </Field>
        </div>

        <DataTable
          rows={items}
          empty={<EmptyState title="No requests match these filters" />}
          columns={[
            {
              key: "createdAt",
              header: "When",
              render: (row) => new Date(row.createdAt).toLocaleString(),
            },
            { key: "cityGuess", header: "City guess", render: (row) => row.cityGuess || "—" },
            { key: "pincode", header: "Pincode", render: (row) => row.pincode || "—" },
            { key: "phone", header: "Phone", render: (row) => row.phone || "—" },
            {
              key: "location",
              header: "Coordinates",
              render: (row) =>
                row.location?.coordinates?.length === 2
                  ? `${row.location.coordinates[1].toFixed(4)}, ${row.location.coordinates[0].toFixed(4)}`
                  : "—",
            },
            {
              key: "rawAddress",
              header: "Address",
              render: (row) => (
                <span className="block max-w-xs truncate">{row.rawAddress || "—"}</span>
              ),
            },
          ]}
        />

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-600">
          <span>
            {pagination.total} requests · page {pagination.page} of {pagination.pages || 1}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= (pagination.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
