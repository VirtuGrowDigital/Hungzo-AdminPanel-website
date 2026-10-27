import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Building2, MapPin, Plus, RefreshCw, Save } from "lucide-react";
import {
  AdminHero,
  AdminPage,
  AdminPanel,
  AdminSectionTitle,
  AdminTabs,
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
} from "../../Components/MulticityUI";
import { useLocations } from "../../Context/LocationProvider";
import { useAuth } from "../../Context/AuthProvider";
import {
  CITY_STATUSES,
  createCity,
  createState,
  idOf,
  pauseCity,
  updateCity,
  updateState,
} from "../../Api/multicity";

const emptyStateForm = () => ({
  name: "",
  code: "",
  invoicePrefix: "",
  gstin: "",
  status: "active",
  legalDetails: {
    legalBusinessName: "",
    tradeName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    pincode: "",
    fssaiLicenseNumber: "",
    placeOfSupply: "",
    supportPhone: "",
    supportEmail: "",
  },
});

const emptyCityForm = () => ({
  stateId: "",
  name: "",
  slug: "",
  status: "coming_soon",
  launchDate: "",
  latitude: "",
  longitude: "",
});

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function CitiesStates() {
  const { states, cities, refresh, loading, stateName } = useLocations();
  const { user } = useAuth();
  const isSuper = user?.role === "SUPERADMIN";

  const [tab, setTab] = useState("cities");
  const [stateModal, setStateModal] = useState(null); // { mode, form, id }
  const [cityModal, setCityModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const cityRows = useMemo(
    () =>
      cities.map((city) => ({
        ...city,
        stateLabel: stateName(city.stateId?._id || city.stateId),
      })),
    [cities, stateName],
  );

  const liveCount = cities.filter((c) => c.status === "live").length;

  /* ----------------------------- states ---------------------------- */

  const openStateModal = (state) => {
    if (!state) {
      setStateModal({ mode: "create", form: emptyStateForm() });
      return;
    }
    setStateModal({
      mode: "edit",
      id: idOf(state._id),
      form: {
        ...emptyStateForm(),
        ...state,
        legalDetails: { ...emptyStateForm().legalDetails, ...(state.legalDetails || {}) },
      },
    });
  };

  const saveState = async () => {
    const { mode, id, form } = stateModal;
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("State name and code are required");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      invoicePrefix: form.invoicePrefix.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      status: form.status,
      legalDetails: form.legalDetails,
    };

    const res =
      mode === "create" ? await createState(payload) : await updateState(id, payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(mode === "create" ? "State created" : "State updated");
    setStateModal(null);
    refresh();
  };

  /* ------------------------------ cities --------------------------- */

  const openCityModal = (city) => {
    if (!city) {
      setCityModal({ mode: "create", form: emptyCityForm() });
      return;
    }
    const coordinates = city.center?.coordinates || [];
    setCityModal({
      mode: "edit",
      id: idOf(city._id),
      form: {
        stateId: idOf(city.stateId?._id || city.stateId),
        name: city.name || "",
        slug: city.slug || "",
        status: city.status || "coming_soon",
        launchDate: city.launchDate ? String(city.launchDate).slice(0, 10) : "",
        longitude: coordinates[0] ?? "",
        latitude: coordinates[1] ?? "",
      },
    });
  };

  const saveCity = async () => {
    const { mode, id, form } = cityModal;
    if (!form.stateId || !form.name.trim()) {
      toast.error("State and city name are required");
      return;
    }

    const payload = {
      stateId: form.stateId,
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      status: form.status,
      launchDate: form.launchDate || null,
    };

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && form.latitude !== "" && form.longitude !== "") {
      payload.center = { type: "Point", coordinates: [lng, lat] };
    }

    setSaving(true);
    const res = mode === "create" ? await createCity(payload) : await updateCity(id, payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(mode === "create" ? "City created" : "City updated");
    setCityModal(null);
    refresh();
  };

  const handlePause = async (city) => {
    if (!window.confirm(`Pause ${city.name}? Customers there stop being able to order immediately.`)) {
      return;
    }
    const res = await pauseCity(idOf(city._id));
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(`${city.name} paused`);
    refresh();
  };

  const setCityStatus = async (city, status) => {
    const res = await updateCity(idOf(city._id), { status });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(`${city.name} → ${status.replace(/_/g, " ")}`);
    refresh();
  };

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Multi-city"
        title="States & cities"
        description="The top of the location hierarchy: State → City → Zone → Warehouse. A city must be live before any of its zones can go live."
        icon={Building2}
        meta={`${liveCount} live · ${cities.length} total cities`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={refresh} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button
              variant="success"
              onClick={() => (tab === "cities" ? openCityModal(null) : openStateModal(null))}
            >
              <Plus className="h-4 w-4" /> {tab === "cities" ? "New city" : "New state"}
            </Button>
          </div>
        }
      />

      <AdminTabs
        tabs={[
          { id: "cities", label: "Cities", icon: MapPin },
          { id: "states", label: "States & invoice identity", icon: Building2 },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      {tab === "cities" ? (
        <AdminPanel>
          <AdminSectionTitle
            title="Cities"
            description="Status drives the customer app: coming_soon shows the waitlist screen, paused stops new orders, live accepts orders."
          />
          <DataTable
            rows={cityRows}
            empty={
              <EmptyState
                title="No cities yet"
                description="Create a state first, then add your first city."
              />
            }
            columns={[
              {
                key: "name",
                header: "City",
                render: (city) => (
                  <div>
                    <p className="font-semibold text-slate-900">{city.name}</p>
                    <p className="text-xs text-slate-400">/{city.slug}</p>
                  </div>
                ),
              },
              { key: "stateLabel", header: "State" },
              {
                key: "status",
                header: "Status",
                render: (city) => <StatusPill value={city.status} />,
              },
              {
                key: "launchDate",
                header: "Launch",
                render: (city) =>
                  city.launchDate ? String(city.launchDate).slice(0, 10) : "—",
              },
              {
                key: "center",
                header: "Centre",
                render: (city) =>
                  city.center?.coordinates?.length === 2
                    ? `${city.center.coordinates[1].toFixed(4)}, ${city.center.coordinates[0].toFixed(4)}`
                    : "—",
              },
              {
                key: "actions",
                header: "Actions",
                render: (city) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openCityModal(city)}>
                      Edit
                    </Button>
                    {city.status === "live" ? (
                      <Button size="sm" variant="danger" onClick={() => handlePause(city)}>
                        Pause
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => setCityStatus(city, "live")}
                      >
                        Go live
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </AdminPanel>
      ) : (
        <AdminPanel>
          <AdminSectionTitle
            title="States"
            description="GSTIN, invoice prefix and registered address are used on every invoice for orders fulfilled from that state."
          />
          {!isSuper ? (
            <div className="px-5 pt-4">
              <InlineAlert tone="info">
                Only a super admin can create or edit states.
              </InlineAlert>
            </div>
          ) : null}
          <DataTable
            rows={states}
            empty={<EmptyState title="No states yet" description="Add Madhya Pradesh to begin." />}
            columns={[
              {
                key: "name",
                header: "State",
                render: (state) => (
                  <div>
                    <p className="font-semibold text-slate-900">{state.name}</p>
                    <p className="text-xs text-slate-400">{state.code}</p>
                  </div>
                ),
              },
              {
                key: "gstin",
                header: "GSTIN",
                render: (state) => state.gstin || <span className="text-rose-500">Not set</span>,
              },
              {
                key: "invoicePrefix",
                header: "Invoice series",
                render: (state) => state.invoicePrefix || "—",
              },
              {
                key: "fssai",
                header: "FSSAI",
                render: (state) => state.legalDetails?.fssaiLicenseNumber || "—",
              },
              {
                key: "status",
                header: "Status",
                render: (state) => <StatusPill value={state.status} />,
              },
              {
                key: "actions",
                header: "",
                render: (state) => (
                  <Button size="sm" variant="ghost" onClick={() => openStateModal(state)}>
                    Edit
                  </Button>
                ),
              },
            ]}
          />
        </AdminPanel>
      )}

      {/* --------------------------- city modal -------------------------- */}
      <Modal
        open={Boolean(cityModal)}
        onClose={() => setCityModal(null)}
        title={cityModal?.mode === "create" ? "New city" : "Edit city"}
        description="A city must be live before its zones can accept orders."
      >
        {cityModal ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State">
                <Select
                  value={cityModal.form.stateId}
                  onChange={(e) =>
                    setCityModal({
                      ...cityModal,
                      form: { ...cityModal.form, stateId: e.target.value },
                    })
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
              <Field label="City name">
                <TextInput
                  value={cityModal.form.name}
                  onChange={(e) =>
                    setCityModal({
                      ...cityModal,
                      form: {
                        ...cityModal.form,
                        name: e.target.value,
                        slug:
                          cityModal.mode === "create"
                            ? slugify(e.target.value)
                            : cityModal.form.slug,
                      },
                    })
                  }
                  placeholder="Lucknow"
                />
              </Field>
              <Field label="Slug" hint="Unique, lowercase. Used by the app.">
                <TextInput
                  value={cityModal.form.slug}
                  onChange={(e) =>
                    setCityModal({
                      ...cityModal,
                      form: { ...cityModal.form, slug: slugify(e.target.value) },
                    })
                  }
                />
              </Field>
              <Field label="Status">
                <Select
                  value={cityModal.form.status}
                  onChange={(e) =>
                    setCityModal({
                      ...cityModal,
                      form: { ...cityModal.form, status: e.target.value },
                    })
                  }
                >
                  {CITY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Launch date">
                <TextInput
                  type="date"
                  value={cityModal.form.launchDate}
                  onChange={(e) =>
                    setCityModal({
                      ...cityModal,
                      form: { ...cityModal.form, launchDate: e.target.value },
                    })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Centre latitude">
                  <TextInput
                    value={cityModal.form.latitude}
                    onChange={(e) =>
                      setCityModal({
                        ...cityModal,
                        form: { ...cityModal.form, latitude: e.target.value },
                      })
                    }
                    placeholder="26.8467"
                  />
                </Field>
                <Field label="Centre longitude">
                  <TextInput
                    value={cityModal.form.longitude}
                    onChange={(e) =>
                      setCityModal({
                        ...cityModal,
                        form: { ...cityModal.form, longitude: e.target.value },
                      })
                    }
                    placeholder="80.9462"
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCityModal(null)}>
                Cancel
              </Button>
              <Button variant="success" onClick={saveCity} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save city"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* -------------------------- state modal -------------------------- */}
      <Modal
        open={Boolean(stateModal)}
        onClose={() => setStateModal(null)}
        title={stateModal?.mode === "create" ? "New state" : "Edit state"}
        description="GSTIN and invoice prefix drive per-state invoice numbering (e.g. HZ/UP/26-27/00012)."
        width="max-w-3xl"
      >
        {stateModal ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State name">
                <TextInput
                  value={stateModal.form.name}
                  onChange={(e) =>
                    setStateModal({
                      ...stateModal,
                      form: { ...stateModal.form, name: e.target.value },
                    })
                  }
                  placeholder="Uttar Pradesh"
                />
              </Field>
              <Field label="Code" hint="Short unique code, e.g. UP">
                <TextInput
                  value={stateModal.form.code}
                  onChange={(e) =>
                    setStateModal({
                      ...stateModal,
                      form: { ...stateModal.form, code: e.target.value.toUpperCase() },
                    })
                  }
                  disabled={stateModal.mode === "edit"}
                />
              </Field>
              <Field label="GSTIN" hint="Separate registration per state">
                <TextInput
                  value={stateModal.form.gstin}
                  onChange={(e) =>
                    setStateModal({
                      ...stateModal,
                      form: { ...stateModal.form, gstin: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="09AAAAA0000A1Z5"
                />
              </Field>
              <Field label="Invoice prefix" hint="e.g. HZ/UP">
                <TextInput
                  value={stateModal.form.invoicePrefix}
                  onChange={(e) =>
                    setStateModal({
                      ...stateModal,
                      form: { ...stateModal.form, invoicePrefix: e.target.value },
                    })
                  }
                />
              </Field>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">
                Registered entity for this state
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Leave a field empty to inherit the global value from Legal Details.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["legalBusinessName", "Legal business name"],
                  ["tradeName", "Trade name"],
                  ["addressLine1", "Address line 1"],
                  ["addressLine2", "Address line 2"],
                  ["city", "City"],
                  ["pincode", "Pincode"],
                  ["fssaiLicenseNumber", "FSSAI licence"],
                  ["placeOfSupply", "Place of supply"],
                  ["supportPhone", "Support phone"],
                  ["supportEmail", "Support email"],
                ].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <TextInput
                      value={stateModal.form.legalDetails[key] || ""}
                      onChange={(e) =>
                        setStateModal({
                          ...stateModal,
                          form: {
                            ...stateModal.form,
                            legalDetails: {
                              ...stateModal.form.legalDetails,
                              [key]: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStateModal(null)}>
                Cancel
              </Button>
              <Button variant="success" onClick={saveState} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save state"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
