import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Building, Clock, RefreshCw, Save } from "lucide-react";
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
  Modal,
  Select,
  StatusPill,
  TextInput,
  Toggle,
} from "../../Components/MulticityUI";
import MapCanvas from "../../Components/MapCanvas";
import { useLocations } from "../../Context/LocationProvider";
import {
  SERVICE_MODES,
  getWarehouse,
  idOf,
  reassignWarehouse,
  updateWarehouseApi,
} from "../../Api/multicity";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const defaultHours = () =>
  DAYS.map((_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    openTime: "07:00",
    closeTime: "23:00",
  }));

const SERVICE_MODE_HELP = {
  hybrid: "Zone polygons first, delivery radius as fallback. Safe default while you migrate.",
  zones: "Polygons only. Use this once the zones cover everything this store serves.",
  radius: "Radius only. Legacy behaviour — the circle ignores your polygons.",
};

export default function WarehouseSettings() {
  const { warehouses, cities, states, refresh, loading, cityName, stateName } =
    useLocations();
  const [editor, setEditor] = useState(null);
  const [reassign, setReassign] = useState(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        ...warehouse,
        cityLabel: cityName(warehouse.cityId?._id || warehouse.cityId),
      })),
    [warehouses, cityName],
  );

  const openEditor = async (warehouse) => {
    const res = await getWarehouse(idOf(warehouse._id));
    const full = res.ok ? res.data?.warehouse || res.data?.data || warehouse : warehouse;
    const coordinates = full.location?.location?.coordinates || [];

    setEditor({
      id: idOf(full._id),
      name: full.name,
      // The update endpoint revalidates the whole document, so keep the
      // original around and send it back untouched alongside our edits.
      original: full,
      form: {
        cityId: idOf(full.cityId?._id || full.cityId),
        stateId: idOf(full.stateId?._id || full.stateId),
        status: full.status || "open",
        serviceMode: full.serviceMode || "hybrid",
        timeZone: full.timeZone || "Asia/Kolkata",
        deliveryRadiusKm: full.serviceArea?.deliveryRadiusKm ?? 0,
        selfPickupRadiusKm: full.serviceArea?.selfPickupRadiusKm ?? 0,
        maxActiveOrders: full.capacity?.maxActiveOrders ?? 0,
        maxConcurrentDeliveries: full.capacity?.maxConcurrentDeliveries ?? 0,
        maxDrivers: full.capacity?.maxDrivers ?? 0,
        operatingHours:
          full.operatingHours?.length === 7 ? full.operatingHours.map((h) => ({ ...h })) : defaultHours(),
        closures: (full.closures || []).map((closure) => ({
          ...closure,
          startDate: String(closure.startDate || "").slice(0, 10),
          endDate: String(closure.endDate || "").slice(0, 10),
        })),
        latitude: coordinates[1] ?? "",
        longitude: coordinates[0] ?? "",
      },
    });
  };

  const save = async () => {
    const { id, form, original } = editor;
    // PUT /warehouses/update/:id revalidates the full payload and rejects a
    // changed city/state (use Reassign for that), so resend name/address/
    // location/hierarchy exactly as stored.
    const payload = {
      name: original.name,
      fullAddress: original.fullAddress,
      location: original.location,
      cityId: idOf(original.cityId?._id || original.cityId),
      stateId: idOf(original.stateId?._id || original.stateId),
      zoneId: idOf(original.zoneId?._id || original.zoneId) || "",
      status: form.status,
      serviceMode: form.serviceMode,
      timeZone: form.timeZone,
      serviceArea: {
        deliveryRadiusKm: Number(form.deliveryRadiusKm) || 0,
        selfPickupRadiusKm: Number(form.selfPickupRadiusKm) || 0,
      },
      capacity: {
        maxActiveOrders: Number(form.maxActiveOrders) || 0,
        maxConcurrentDeliveries: Number(form.maxConcurrentDeliveries) || 0,
        maxDrivers: Number(form.maxDrivers) || 0,
      },
      operatingHours: form.operatingHours.map((hour) => ({
        dayOfWeek: Number(hour.dayOfWeek),
        isClosed: Boolean(hour.isClosed),
        openTime: hour.openTime || "00:00",
        closeTime: hour.closeTime || "23:59",
      })),
      closures: form.closures
        .filter((closure) => closure.startDate && closure.endDate)
        .map((closure) => ({
          startDate: closure.startDate,
          endDate: closure.endDate,
          reason: closure.reason || "",
          isClosed: closure.isClosed !== false,
        })),
    };

    setSaving(true);
    const res = await updateWarehouseApi(id, payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Warehouse updated");
    setEditor(null);
    refresh();
  };

  const updateHour = (index, patch) => {
    const operatingHours = editor.form.operatingHours.slice();
    operatingHours[index] = { ...operatingHours[index], ...patch };
    setEditor({ ...editor, form: { ...editor.form, operatingHours } });
  };

  const unassigned = warehouses.filter((w) => !(w.cityId?._id || w.cityId)).length;

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Multi-city"
        title="Warehouse settings"
        description="City assignment, opening hours, closures, capacity and how this store's catchment is decided. Orders are blocked outside opening hours."
        icon={Building}
        meta={`${warehouses.length} warehouses`}
        accent="amber"
        action={
          <Button variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {unassigned > 0 ? (
        <InlineAlert tone="warn">
          {unassigned} warehouse(s) have no city assigned. Serviceability and admin
          scoping need this — set it before launching another city.
        </InlineAlert>
      ) : null}

      <AdminPanel>
        <AdminSectionTitle
          title="Warehouses"
          description="Create warehouses on the Warehouse page; this screen manages their multi-city behaviour."
        />
        <DataTable
          rows={rows}
          empty={<EmptyState title="No warehouses" description="Create one from the Warehouse page." />}
          columns={[
            {
              key: "name",
              header: "Warehouse",
              render: (warehouse) => (
                <div>
                  <p className="font-semibold text-slate-900">{warehouse.name}</p>
                  <p className="max-w-xs truncate text-xs text-slate-400">
                    {warehouse.fullAddress}
                  </p>
                </div>
              ),
            },
            { key: "cityLabel", header: "City" },
            {
              key: "serviceMode",
              header: "Service mode",
              render: (warehouse) => (
                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs capitalize">
                  {warehouse.serviceMode || "hybrid"}
                </span>
              ),
            },
            {
              key: "radius",
              header: "Radius (km)",
              render: (warehouse) =>
                `${warehouse.serviceArea?.deliveryRadiusKm ?? 0} / ${
                  warehouse.serviceArea?.selfPickupRadiusKm ?? 0
                }`,
            },
            {
              key: "status",
              header: "Status",
              render: (warehouse) => <StatusPill value={warehouse.status} />,
            },
            {
              key: "actions",
              header: "",
              render: (warehouse) => (
                <Button size="sm" variant="ghost" onClick={() => openEditor(warehouse)}>
                  Settings
                </Button>
              ),
            },
          ]}
        />
      </AdminPanel>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={`Settings — ${editor?.name || ""}`}
        description="Hours are evaluated in the warehouse timezone. Customers cannot order while the store is closed."
        width="max-w-5xl"
      >
        {editor ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="State"
                hint="Locked — use Move warehouse to change the hierarchy."
              >
                <TextInput value={stateName(editor.form.stateId)} disabled readOnly />
              </Field>

              <Field label="City" hint="Locked — use Move warehouse.">
                <div className="flex gap-2">
                  <TextInput value={cityName(editor.form.cityId)} disabled readOnly />
                  <Button variant="ghost" onClick={() => setReassign({
                    id: editor.id,
                    name: editor.name,
                    stateId: editor.form.stateId,
                    cityId: editor.form.cityId,
                  })}>
                    Move
                  </Button>
                </div>
              </Field>

              <Field label="Status">
                <Select
                  value={editor.form.status}
                  onChange={(e) =>
                    setEditor({ ...editor, form: { ...editor.form, status: e.target.value } })
                  }
                >
                  <option value="open">Open</option>
                  <option value="close">Closed</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Service mode" hint={SERVICE_MODE_HELP[editor.form.serviceMode]}>
                <Select
                  value={editor.form.serviceMode}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, serviceMode: e.target.value },
                    })
                  }
                >
                  {SERVICE_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Delivery radius (km)" hint="Used in hybrid/radius mode">
                <TextInput
                  type="number"
                  value={editor.form.deliveryRadiusKm}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, deliveryRadiusKm: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Self pickup radius (km)">
                <TextInput
                  type="number"
                  value={editor.form.selfPickupRadiusKm}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, selfPickupRadiusKm: e.target.value },
                    })
                  }
                />
              </Field>
            </div>

            {Number.isFinite(Number(editor.form.latitude)) && editor.form.latitude !== "" ? (
              <MapCanvas
                center={[Number(editor.form.latitude), Number(editor.form.longitude)]}
                zoom={12}
                height="280px"
                fitKey={editor.id}
                markers={[
                  {
                    lat: Number(editor.form.latitude),
                    lng: Number(editor.form.longitude),
                    label: editor.name,
                    color: "#1d4ed8",
                    radiusKm:
                      editor.form.serviceMode === "zones"
                        ? 0
                        : Number(editor.form.deliveryRadiusKm) || 0,
                  },
                ]}
              />
            ) : null}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-800">Opening hours</p>
                <span className="text-xs text-slate-400">({editor.form.timeZone})</span>
              </div>
              <div className="space-y-2">
                {editor.form.operatingHours.map((hour, index) => (
                  <div
                    key={hour.dayOfWeek}
                    className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 sm:grid-cols-4"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {DAYS[hour.dayOfWeek]}
                    </span>
                    <Toggle
                      checked={!hour.isClosed}
                      label={hour.isClosed ? "Closed" : "Open"}
                      onChange={(checked) => updateHour(index, { isClosed: !checked })}
                    />
                    <TextInput
                      type="time"
                      value={hour.openTime || "07:00"}
                      disabled={hour.isClosed}
                      onChange={(e) => updateHour(index, { openTime: e.target.value })}
                    />
                    <TextInput
                      type="time"
                      value={hour.closeTime || "23:00"}
                      disabled={hour.isClosed}
                      onChange={(e) => updateHour(index, { closeTime: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                A close time earlier than the open time is treated as an overnight window
                (e.g. 22:00 → 04:00).
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Holiday closures</p>
              <div className="space-y-2">
                {editor.form.closures.map((closure, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-4">
                    <TextInput
                      type="date"
                      value={closure.startDate}
                      onChange={(e) => {
                        const closures = editor.form.closures.slice();
                        closures[index] = { ...closure, startDate: e.target.value };
                        setEditor({ ...editor, form: { ...editor.form, closures } });
                      }}
                    />
                    <TextInput
                      type="date"
                      value={closure.endDate}
                      onChange={(e) => {
                        const closures = editor.form.closures.slice();
                        closures[index] = { ...closure, endDate: e.target.value };
                        setEditor({ ...editor, form: { ...editor.form, closures } });
                      }}
                    />
                    <TextInput
                      placeholder="Reason"
                      value={closure.reason || ""}
                      onChange={(e) => {
                        const closures = editor.form.closures.slice();
                        closures[index] = { ...closure, reason: e.target.value };
                        setEditor({ ...editor, form: { ...editor.form, closures } });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditor({
                          ...editor,
                          form: {
                            ...editor.form,
                            closures: editor.form.closures.filter((_, i) => i !== index),
                          },
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditor({
                      ...editor,
                      form: {
                        ...editor.form,
                        closures: [
                          ...editor.form.closures,
                          { startDate: "", endDate: "", reason: "", isClosed: true },
                        ],
                      },
                    })
                  }
                >
                  + Add closure
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Max active orders" hint="0 = unlimited">
                <TextInput
                  type="number"
                  value={editor.form.maxActiveOrders}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, maxActiveOrders: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Max concurrent deliveries" hint="0 = unlimited">
                <TextInput
                  type="number"
                  value={editor.form.maxConcurrentDeliveries}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, maxConcurrentDeliveries: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Max drivers" hint="0 = unlimited">
                <TextInput
                  type="number"
                  value={editor.form.maxDrivers}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, maxDrivers: e.target.value },
                    })
                  }
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditor(null)}>
                Cancel
              </Button>
              <Button variant="success" onClick={save} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* --------------------- move warehouse (city) --------------------- */}
      <Modal
        open={Boolean(reassign)}
        onClose={() => setReassign(null)}
        title={`Move ${reassign?.name || "warehouse"}`}
        description="Changes which city and state this store belongs to. Zones in the old city that point at it must be reassigned first."
        width="max-w-xl"
      >
        {reassign ? (
          <div className="space-y-4">
            <InlineAlert tone="warn">
              This affects invoices (state GSTIN), admin scoping and serviceability.
              Existing orders keep their original city snapshot.
            </InlineAlert>

            <Field label="New state">
              <Select
                value={reassign.stateId}
                onChange={(e) =>
                  setReassign({ ...reassign, stateId: e.target.value, cityId: "" })
                }
              >
                <option value="">Select state</option>
                {states.map((state) => (
                  <option key={idOf(state._id)} value={idOf(state._id)}>
                    {state.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="New city">
              <Select
                value={reassign.cityId}
                onChange={(e) => setReassign({ ...reassign, cityId: e.target.value })}
              >
                <option value="">Select city</option>
                {cities
                  .filter(
                    (city) =>
                      !reassign.stateId ||
                      idOf(city.stateId?._id || city.stateId) === reassign.stateId,
                  )
                  .map((city) => (
                    <option key={idOf(city._id)} value={idOf(city._id)}>
                      {city.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReassign(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={saving || !reassign.cityId || !reassign.stateId}
                onClick={async () => {
                  setSaving(true);
                  const res = await reassignWarehouse(reassign.id, {
                    cityId: reassign.cityId,
                    stateId: reassign.stateId,
                  });
                  setSaving(false);
                  if (!res.ok) {
                    toast.error(res.message);
                    return;
                  }
                  toast.success("Warehouse moved");
                  setReassign(null);
                  setEditor(null);
                  refresh();
                }}
              >
                Move warehouse
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
