import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Circle as CircleIcon,
  Map,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Undo2,
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
  Modal,
  Select,
  StatusPill,
  TextInput,
  Toggle,
} from "../../Components/MulticityUI";
import MapCanvas from "../../Components/MapCanvas";
import { useLocations } from "../../Context/LocationProvider";
import {
  ZONE_STATUSES,
  circleToPolygon,
  createZone,
  getPlaceDetails,
  getZone,
  idOf,
  listZones,
  searchPlaces,
  updateZone,
  updateZoneConfig,
} from "../../Api/multicity";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Ring must be closed: first point === last point. */
const closeRing = (points) => {
  if (points.length < 3) return null;
  const ring = points.map(([lng, lat]) => [Number(lng), Number(lat)]);
  const [first] = ring;
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1])
    ring.push([first[0], first[1]]);
  return ring;
};

const openRing = (boundary) => {
  const ring = boundary?.coordinates?.[0] || [];
  if (ring.length < 2) return [];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const points = ring.map(([lng, lat]) => [Number(lng), Number(lat)]);
  if (first[0] === last[0] && first[1] === last[1]) points.pop();
  return points;
};

const emptyForm = () => ({
  cityId: "",
  warehouseId: "",
  name: "",
  slug: "",
  status: "draft",
  priority: 0,
  pincodes: "",
  delivery: true,
  selfPickup: false,
});

const emptyConfig = () => ({
  deliveryFee: "",
  freeDeliveryAbove: "",
  minOrderValue: "",
  platformFee: "",
  codEnabled: "",
  codMaxAmount: "",
  onlinePaymentEnabled: "",
  etaMinutes: "",
  supportPhone: "",
  supportEmail: "",
});

export default function Zones() {
  const {
    cities,
    warehouses,
    warehousesOfCity,
    loading: locationsLoading,
  } = useLocations();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [editor, setEditor] = useState(null); // { mode, id, form, points }
  const [configModal, setConfigModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // Map helpers: place search, imperative view control, radius tool
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState(null);
  const [radiusKm, setRadiusKm] = useState(3);

  const moveTo = (lat, lng, zoom = 14) =>
    setView({ lat, lng, zoom, key: `${lat},${lng},${zoom},${Date.now()}` });

  const runPlaceSearch = async () => {
    const input = placeQuery.trim();
    if (input.length < 3) {
      toast.error("Type at least 3 characters");
      return;
    }
    setSearching(true);
    const res = await searchPlaces(input);
    setSearching(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    const predictions = res.data?.data || [];
    setPlaceResults(predictions.slice(0, 6));
    if (!predictions.length) toast.error("No places found");
  };

  const goToPlace = async (prediction) => {
    const res = await getPlaceDetails(prediction.place_id);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    const location = res.data?.data?.geometry?.location;
    if (!location) {
      toast.error("That place has no coordinates");
      return;
    }
    moveTo(location.lat, location.lng, 15);
    setPlaceResults([]);
    setPlaceQuery(prediction.description || "");
  };

  /** Turn "N km around this warehouse" into an editable polygon. */
  const applyRadiusCircle = () => {
    const warehouse = warehouses.find(
      (item) => idOf(item._id) === editor.form.warehouseId,
    );
    const coordinates = warehouse?.location?.location?.coordinates;
    if (!coordinates || coordinates.length !== 2) {
      toast.error("Select a warehouse with a saved location first");
      return;
    }
    const km = Number(radiusKm);
    if (!Number.isFinite(km) || km <= 0 || km > 50) {
      toast.error("Radius must be between 0.1 and 50 km");
      return;
    }
    if (
      editor.points.length &&
      !window.confirm("Replace the current shape with this circle?")
    ) {
      return;
    }

    const center = { lat: coordinates[1], lng: coordinates[0] };
    setEditor((current) => ({
      ...current,
      points: circleToPolygon(center, km, 32),
    }));
    moveTo(
      center.lat,
      center.lng,
      km <= 1 ? 15 : km <= 3 ? 14 : km <= 8 ? 13 : 11,
    );
    toast.success(`${km} km circle created — drag any point to reshape it`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listZones(cityFilter ? { cityId: cityFilter } : {});
    setLoading(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setZones(res.data?.zones || []);
  }, [cityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const mapCity = editor
    ? cities.find((c) => idOf(c._id) === editor.form.cityId)
    : null;

  const mapCenter = useMemo(() => {
    const coordinates = mapCity?.center?.coordinates;
    if (coordinates?.length === 2) return [coordinates[1], coordinates[0]];
    const warehouse = warehouses.find(
      (w) => idOf(w._id) === (editor?.form.warehouseId || ""),
    );
    const warehouseCoordinates = warehouse?.location?.location?.coordinates;
    if (warehouseCoordinates?.length === 2) {
      return [warehouseCoordinates[1], warehouseCoordinates[0]];
    }
    return [26.2183, 78.1828];
  }, [mapCity, warehouses, editor]);

  const otherZonePolygons = useMemo(
    () =>
      zones
        .filter((zone) => idOf(zone._id) !== (editor?.id || ""))
        .filter(
          (zone) =>
            !editor?.form.cityId ||
            idOf(zone.cityId?._id || zone.cityId) === editor.form.cityId,
        )
        .map((zone) => ({
          id: idOf(zone._id),
          coordinates: zone.boundary?.coordinates?.[0] || [],
          color: zone.status === "live" ? "#0f766e" : "#94a3b8",
          dashed: zone.status !== "live",
          label: `${zone.name} (${zone.status})`,
        })),
    [zones, editor],
  );

  const warehouseMarkers = useMemo(
    () =>
      warehouses
        .filter(
          (w) =>
            !editor?.form.cityId ||
            idOf(w.cityId?._id || w.cityId) === editor.form.cityId,
        )
        .map((w) => {
          const coordinates = w.location?.location?.coordinates || [];
          return {
            lat: coordinates[1],
            lng: coordinates[0],
            label: `${w.name} (${w.status})`,
            color: "#1d4ed8",
          };
        })
        .filter((m) => Number.isFinite(m.lat)),
    [warehouses, editor],
  );

  const openEditor = (zone) => {
    if (!zone) {
      setEditor({ mode: "create", form: emptyForm(), points: [] });
      return;
    }
    setEditor({
      mode: "edit",
      id: idOf(zone._id),
      form: {
        cityId: idOf(zone.cityId?._id || zone.cityId),
        warehouseId: idOf(zone.warehouseId?._id || zone.warehouseId),
        name: zone.name || "",
        slug: zone.slug || "",
        status: zone.status || "draft",
        priority: zone.priority ?? 0,
        pincodes: (zone.pincodes || []).join(", "),
        delivery: (zone.fulfillmentTypes || []).includes("DELIVERY"),
        selfPickup: (zone.fulfillmentTypes || []).includes("SELF_PICKUP"),
      },
      points: openRing(zone.boundary),
    });
  };

  const handleMapClick = ({ lat, lng }) => {
    if (!editor) return;
    setEditor({ ...editor, points: [...editor.points, [lng, lat]] });
  };

  const handleVertexDrag = (index, { lat, lng }) => {
    if (!editor) return;
    const points = editor.points.slice();
    points[index] = [lng, lat];
    setEditor({ ...editor, points });
  };

  const saveZone = async () => {
    const { mode, id, form, points } = editor;
    const ring = closeRing(points);

    if (!form.cityId || !form.name.trim()) {
      toast.error("City and zone name are required");
      return;
    }
    if (!ring) {
      toast.error("Draw at least 3 points on the map");
      return;
    }
    const fulfillmentTypes = [
      ...(form.delivery ? ["DELIVERY"] : []),
      ...(form.selfPickup ? ["SELF_PICKUP"] : []),
    ];
    if (!fulfillmentTypes.length) {
      toast.error("Select at least one fulfillment type");
      return;
    }
    if (form.status === "live" && !form.warehouseId) {
      toast.error("A live zone needs a warehouse");
      return;
    }

    const payload = {
      cityId: form.cityId,
      warehouseId: form.warehouseId || null,
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      status: form.status,
      priority: Number(form.priority) || 0,
      pincodes: form.pincodes
        .split(",")
        .map((p) => p.trim())
        .filter((p) => /^\d{6}$/.test(p)),
      fulfillmentTypes,
      boundary: { type: "Polygon", coordinates: [ring] },
    };

    setSaving(true);
    const res =
      mode === "create"
        ? await createZone(payload)
        : await updateZone(id, payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(mode === "create" ? "Zone created" : "Zone updated");
    setEditor(null);
    load();
  };

  const openConfig = async (zone) => {
    // Zone config only comes back from GET /zones/:id. Fetching it first
    // matters: opening a blank form and saving would null every value.
    const res = await getZone(idOf(zone._id));
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    const config = res.data?.config || {};
    const value = (key) =>
      config[key] === null || config[key] === undefined ? "" : config[key];
    setConfigModal({
      id: idOf(zone._id),
      name: zone.name,
      form: {
        ...emptyConfig(),
        deliveryFee: value("deliveryFee"),
        freeDeliveryAbove: value("freeDeliveryAbove"),
        minOrderValue: value("minOrderValue"),
        platformFee: value("platformFee"),
        codEnabled:
          config.codEnabled === null || config.codEnabled === undefined
            ? ""
            : String(config.codEnabled),
        codMaxAmount: value("codMaxAmount"),
        onlinePaymentEnabled:
          config.onlinePaymentEnabled === null ||
          config.onlinePaymentEnabled === undefined
            ? ""
            : String(config.onlinePaymentEnabled),
        etaMinutes: value("etaMinutes"),
        supportPhone: config.supportPhone || "",
        supportEmail: config.supportEmail || "",
      },
    });
  };

  const saveConfig = async () => {
    const { id, form } = configModal;
    const payload = {};

    [
      "deliveryFee",
      "freeDeliveryAbove",
      "minOrderValue",
      "platformFee",
      "codMaxAmount",
      "etaMinutes",
    ].forEach((key) => {
      payload[key] = form[key] === "" ? null : Number(form[key]);
    });
    ["codEnabled", "onlinePaymentEnabled"].forEach((key) => {
      payload[key] = form[key] === "" ? null : form[key] === "true";
    });
    payload.supportPhone = form.supportPhone;
    payload.supportEmail = form.supportEmail;

    setSaving(true);
    const res = await updateZoneConfig(id, payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Zone config saved");
    setConfigModal(null);
    load();
  };

  const liveZones = zones.filter((z) => z.status === "live").length;

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Multi-city"
        title="Zones & service areas"
        description="Draw the polygon a store actually delivers to. Polygons beat radius circles: launch one neighbourhood at a time and expand without a deploy."
        icon={Map}
        meta={`${liveZones} live · ${zones.length} total`}
        accent="cyan"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="success" onClick={() => openEditor(null)}>
              <Plus className="h-4 w-4" /> New zone
            </Button>
          </div>
        }
      />

      <AdminPanel>
        <AdminSectionTitle
          title="Zones"
          description="Higher priority wins where polygons overlap. A zone can only go live once its city is live and a warehouse is assigned."
          action={
            <Select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-56"
            >
              <option value="">All cities</option>
              {cities.map((city) => (
                <option key={idOf(city._id)} value={idOf(city._id)}>
                  {city.name}
                </option>
              ))}
            </Select>
          }
        />
        <DataTable
          rows={zones}
          empty={
            <EmptyState
              title="No zones yet"
              description="Draw your first polygon — start with the area you already deliver to."
              action={
                <Button
                  variant="success"
                  className="mt-3"
                  onClick={() => openEditor(null)}
                >
                  <Plus className="h-4 w-4" /> New zone
                </Button>
              }
            />
          }
          columns={[
            {
              key: "name",
              header: "Zone",
              render: (zone) => (
                <div>
                  <p className="font-semibold text-slate-900">{zone.name}</p>
                  <p className="text-xs text-slate-400">
                    {zone.cityId?.name || "—"} · priority {zone.priority ?? 0}
                  </p>
                </div>
              ),
            },
            {
              key: "warehouse",
              header: "Warehouse",
              render: (zone) =>
                zone.warehouseId?.name || (
                  <span className="text-amber-600">Not assigned</span>
                ),
            },
            {
              key: "fulfillmentTypes",
              header: "Fulfilment",
              render: (zone) => (zone.fulfillmentTypes || []).join(", ") || "—",
            },
            {
              key: "status",
              header: "Status",
              render: (zone) => <StatusPill value={zone.status} />,
            },
            {
              key: "actions",
              header: "Actions",
              render: (zone) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditor(zone)}
                  >
                    Edit map
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openConfig(zone)}
                  >
                    Fees & rules
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </AdminPanel>

      {/* ------------------------- zone map editor ------------------------ */}
      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={
          editor?.mode === "create"
            ? "New zone"
            : `Edit ${editor?.form.name || "zone"}`
        }
        description="Click the map to drop points, drag a point to move it. Existing zones are shown for reference — avoid overlaps unless you set priority."
        width="max-w-6xl"
      >
        {editor ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              {/* ---- map toolbar: search, jump, radius ---- */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="relative min-w-[240px] flex-1">
                    <Field
                      label="Find an area"
                      hint="Search a locality, landmark or address to zoom there"
                    >
                      <div className="flex gap-2">
                        <TextInput
                          value={placeQuery}
                          onChange={(e) => setPlaceQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              runPlaceSearch();
                            }
                          }}
                          placeholder="Morar, Gwalior"
                        />
                        <Button
                          variant="ghost"
                          onClick={runPlaceSearch}
                          disabled={searching}
                        >
                          <Search className="h-4 w-4" />
                          {searching ? "..." : "Search"}
                        </Button>
                      </div>
                    </Field>

                    {placeResults.length ? (
                      <ul className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        {placeResults.map((prediction) => (
                          <li key={prediction.place_id}>
                            <button
                              type="button"
                              onClick={() => goToPlace(prediction)}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              {prediction.description}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <Field label="Jump to" className="min-w-[180px]">
                    <Select
                      value=""
                      onChange={(e) => {
                        const warehouse = warehouses.find(
                          (item) => idOf(item._id) === e.target.value,
                        );
                        const coordinates =
                          warehouse?.location?.location?.coordinates;
                        if (coordinates?.length === 2)
                          moveTo(coordinates[1], coordinates[0], 14);
                      }}
                    >
                      <option value="">Warehouse...</option>
                      {warehousesOfCity(editor.form.cityId).map((warehouse) => (
                        <option
                          key={idOf(warehouse._id)}
                          value={idOf(warehouse._id)}
                        >
                          {warehouse.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Radius tool
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="h-2 w-40 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.5"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  />
                  <span className="text-sm text-slate-500">km</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={applyRadiusCircle}
                    disabled={!editor.form.warehouseId}
                  >
                    <CircleIcon className="h-4 w-4" /> Draw circle around
                    warehouse
                  </Button>
                  <span className="text-xs text-slate-400">
                    Creates an editable 32-point shape — drag points to trim
                    rivers, highways or areas you can't reach.
                  </span>
                </div>
              </div>

              <MapCanvas
                center={mapCenter}
                zoom={12}
                view={view}
                polygons={otherZonePolygons}
                markers={warehouseMarkers}
                drawPoints={editor.points}
                onMapClick={handleMapClick}
                onVertexDrag={handleVertexDrag}
                fitKey={editor.id || editor.form.cityId}
                height="520px"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEditor({ ...editor, points: editor.points.slice(0, -1) })
                  }
                  disabled={!editor.points.length}
                >
                  <Undo2 className="h-4 w-4" /> Undo point
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditor({ ...editor, points: [] })}
                  disabled={!editor.points.length}
                >
                  <Trash2 className="h-4 w-4" /> Clear
                </Button>
                <span className="text-xs text-slate-500">
                  {editor.points.length} point
                  {editor.points.length === 1 ? "" : "s"} · minimum 3
                </span>
              </div>
              {editor.points.length > 0 && editor.points.length < 3 ? (
                <InlineAlert tone="warn">
                  Add at least 3 points to close the polygon.
                </InlineAlert>
              ) : null}
            </div>

            <div className="space-y-4">
              <Field label="City">
                <Select
                  value={editor.form.cityId}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: {
                        ...editor.form,
                        cityId: e.target.value,
                        warehouseId: "",
                      },
                    })
                  }
                >
                  <option value="">Select city</option>
                  {cities.map((city) => (
                    <option key={idOf(city._id)} value={idOf(city._id)}>
                      {city.name} ({city.status.replace(/_/g, " ")})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Warehouse"
                hint="Required before the zone can go live. Orders in this polygon are fulfilled from here."
              >
                <Select
                  value={editor.form.warehouseId}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, warehouseId: e.target.value },
                    })
                  }
                  disabled={!editor.form.cityId}
                >
                  <option value="">Not assigned</option>
                  {warehousesOfCity(editor.form.cityId).map((warehouse) => (
                    <option
                      key={idOf(warehouse._id)}
                      value={idOf(warehouse._id)}
                    >
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Zone name">
                <TextInput
                  value={editor.form.name}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: {
                        ...editor.form,
                        name: e.target.value,
                        slug:
                          editor.mode === "create"
                            ? slugify(e.target.value)
                            : editor.form.slug,
                      },
                    })
                  }
                  placeholder="Morar"
                />
              </Field>

              <Field label="Slug" hint="Unique within the city">
                <TextInput
                  value={editor.form.slug}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, slug: slugify(e.target.value) },
                    })
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select
                    value={editor.form.status}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        form: { ...editor.form, status: e.target.value },
                      })
                    }
                  >
                    {ZONE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority" hint="Higher wins on overlap">
                  <TextInput
                    type="number"
                    value={editor.form.priority}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        form: { ...editor.form, priority: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>

              <Field
                label="Pincodes"
                hint="Comma separated, coarse fallback only"
              >
                <TextInput
                  value={editor.form.pincodes}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, pincodes: e.target.value },
                    })
                  }
                  placeholder="474001, 474002"
                />
              </Field>

              <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fulfilment types
                </p>
                <Toggle
                  checked={editor.form.delivery}
                  label="Delivery"
                  onChange={(checked) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, delivery: checked },
                    })
                  }
                />
                <Toggle
                  checked={editor.form.selfPickup}
                  label="Self pickup"
                  onChange={(checked) =>
                    setEditor({
                      ...editor,
                      form: { ...editor.form, selfPickup: checked },
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditor(null)}>
                  Cancel
                </Button>
                <Button
                  variant="success"
                  onClick={saveZone}
                  disabled={saving || locationsLoading}
                >
                  <Save className="h-4 w-4" />{" "}
                  {saving ? "Saving..." : "Save zone"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* -------------------------- zone config -------------------------- */}
      <Modal
        open={Boolean(configModal)}
        onClose={() => setConfigModal(null)}
        title={`Fees & rules — ${configModal?.name || ""}`}
        description="Leave a field blank to inherit the global value from Business Settings. A 0 here means literally zero."
      >
        {configModal ? (
          <div className="space-y-4">
            <InlineAlert tone="info">
              Blank = inherit. This is how a zone gets its own delivery fee,
              minimum order or COD limit without touching any other city.
            </InlineAlert>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["deliveryFee", "Delivery fee (₹)"],
                ["freeDeliveryAbove", "Free delivery above (₹)"],
                ["minOrderValue", "Minimum order (₹)"],
                ["platformFee", "Handling fee (₹)"],
                ["codMaxAmount", "COD limit (₹)"],
                ["etaMinutes", "Delivery ETA (minutes)"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <TextInput
                    type="number"
                    value={configModal.form[key]}
                    placeholder="Inherit"
                    onChange={(e) =>
                      setConfigModal({
                        ...configModal,
                        form: { ...configModal.form, [key]: e.target.value },
                      })
                    }
                  />
                </Field>
              ))}

              <Field label="Cash on delivery">
                <Select
                  value={configModal.form.codEnabled}
                  onChange={(e) =>
                    setConfigModal({
                      ...configModal,
                      form: { ...configModal.form, codEnabled: e.target.value },
                    })
                  }
                >
                  <option value="">Inherit</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </Field>

              <Field label="Online payment">
                <Select
                  value={configModal.form.onlinePaymentEnabled}
                  onChange={(e) =>
                    setConfigModal({
                      ...configModal,
                      form: {
                        ...configModal.form,
                        onlinePaymentEnabled: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">Inherit</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </Field>

              <Field label="Support phone">
                <TextInput
                  value={configModal.form.supportPhone}
                  onChange={(e) =>
                    setConfigModal({
                      ...configModal,
                      form: {
                        ...configModal.form,
                        supportPhone: e.target.value,
                      },
                    })
                  }
                />
              </Field>

              <Field label="Support email">
                <TextInput
                  value={configModal.form.supportEmail}
                  onChange={(e) =>
                    setConfigModal({
                      ...configModal,
                      form: {
                        ...configModal.form,
                        supportEmail: e.target.value,
                      },
                    })
                  }
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfigModal(null)}>
                Cancel
              </Button>
              <Button variant="success" onClick={saveConfig} disabled={saving}>
                <Save className="h-4 w-4" />{" "}
                {saving ? "Saving..." : "Save config"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
