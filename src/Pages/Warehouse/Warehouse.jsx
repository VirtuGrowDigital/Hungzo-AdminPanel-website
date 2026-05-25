import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouses,
  updateWarehouse,
} from "../../Api";
import {
  LoaderCircle,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Warehouse as WarehouseIcon,
  X,
  Link as LinkIcon,
} from "lucide-react";

const emptyLocation = () => ({
  optionType: "current_location",
  mapLink: "",
  lat: "",
  lng: "",
});

const initialFormState = {
  name: "",
  fullAddress: "",
  status: "open",
  serviceArea: {
    deliveryRadiusKm: "0",
    selfPickupRadiusKm: "0",
  },
  location: emptyLocation(),
};

const LOCATION_TYPE_OPTIONS = [
  { value: "current_location", label: "Current Location" },
  { value: "google_map_link", label: "Google Map Link" },
  { value: "pinpoint", label: "Manual Pinpoint" },
];

const parseMapLinkCoordinates = (url = "") => {
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { lat: match[1], lng: match[2] };
    }
  }

  return null;
};

const toPayload = (form) => ({
  name: form.name.trim(),
  fullAddress: form.fullAddress.trim(),
  status: form.status,
  serviceArea: {
    deliveryRadiusKm: Number(form.serviceArea.deliveryRadiusKm || 0),
    selfPickupRadiusKm: Number(form.serviceArea.selfPickupRadiusKm || 0),
  },
  location: {
    optionType: form.location.optionType,
    mapLink: form.location.mapLink.trim(),
    lat: form.location.lat === "" ? undefined : Number(form.location.lat),
    lng: form.location.lng === "" ? undefined : Number(form.location.lng),
  },
});

const normalizeWarehouseForEdit = (warehouse) => ({
  name: warehouse?.name || "",
  fullAddress: warehouse?.fullAddress || "",
  status: warehouse?.status || "open",
  serviceArea: {
    deliveryRadiusKm: String(warehouse?.serviceArea?.deliveryRadiusKm ?? 0),
    selfPickupRadiusKm: String(warehouse?.serviceArea?.selfPickupRadiusKm ?? 0),
  },
  location: warehouse?.location
    ? {
        optionType: warehouse.location.optionType || "current_location",
        mapLink: warehouse.location.mapLink || "",
        lat:
          Array.isArray(warehouse?.location?.location?.coordinates) &&
          warehouse.location.location.coordinates.length === 2
            ? String(warehouse.location.location.coordinates[1])
            : "",
        lng:
          Array.isArray(warehouse?.location?.location?.coordinates) &&
          warehouse.location.location.coordinates.length === 2
            ? String(warehouse.location.location.coordinates[0])
            : "",
      }
    : emptyLocation(),
});

const validateForm = (form) => {
  if (!form.name.trim()) {
    return "Warehouse name is required";
  }

  if (!form.fullAddress.trim()) {
    return "Warehouse full address is required";
  }

  const hasCoordinates =
    form.location.lat !== "" &&
    form.location.lng !== "" &&
    Number.isFinite(Number(form.location.lat)) &&
    Number.isFinite(Number(form.location.lng));

  if (!hasCoordinates && !form.location.mapLink.trim()) {
    return "Location needs coordinates or a Google Map link";
  }

  const deliveryRadiusKm = Number(form.serviceArea.deliveryRadiusKm);
  const selfPickupRadiusKm = Number(form.serviceArea.selfPickupRadiusKm);
  if (!Number.isFinite(deliveryRadiusKm) || deliveryRadiusKm < 0) {
    return "Delivery radius must be zero or greater";
  }

  if (!Number.isFinite(selfPickupRadiusKm) || selfPickupRadiusKm < 0) {
    return "Self pickup radius must be zero or greater";
  }

  return null;
};

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [editingWarehouseId, setEditingWarehouseId] = useState(null);

  const formTitle = useMemo(
    () => (editingWarehouseId ? "Edit Warehouse" : "Add Warehouse"),
    [editingWarehouseId]
  );

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const response = await getWarehouses();
      if (response?.ok === false) {
        toast.error(response.message || "Failed to fetch warehouses");
        return;
      }

      setWarehouses(response?.warehouses || response?.data?.warehouses || []);
    } catch (error) {
      toast.error("Failed to fetch warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const resetForm = () => {
    setForm(initialFormState);
    setEditingWarehouseId(null);
    setFormOpen(false);
  };

  const openCreateForm = () => {
    setForm(initialFormState);
    setEditingWarehouseId(null);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateLocation = (key, value) => {
    setForm((current) => {
      const nextLocation = {
        ...current.location,
        [key]: value,
      };

      if (key === "mapLink") {
        const parsed = parseMapLinkCoordinates(value);
        if (parsed) {
          nextLocation.lat = parsed.lat;
          nextLocation.lng = parsed.lng;
        }
      }

      return { ...current, location: nextLocation };
    });
  };

  const fillCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation("lat", String(position.coords.latitude));
        updateLocation("lng", String(position.coords.longitude));
        toast.success("Current location added");
      },
      () => toast.error("Unable to fetch current location")
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const payload = toPayload(form);
      const response = editingWarehouseId
        ? await updateWarehouse(editingWarehouseId, payload)
        : await createWarehouse(payload);

      if (response?.ok === false || response?.success === false) {
        toast.error(response?.message || "Failed to save warehouse");
        return;
      }

      toast.success(
        editingWarehouseId
          ? "Warehouse updated successfully"
          : "Warehouse created successfully"
      );

      resetForm();
      await loadWarehouses();
    } catch (error) {
      toast.error("Failed to save warehouse");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouseId(warehouse._id);
    setForm(normalizeWarehouseForEdit(warehouse));
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (warehouseId) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this warehouse?"
    );
    if (!shouldDelete) return;

    const response = await deleteWarehouse(warehouseId);
    if (response?.ok === false || response?.success === false) {
      toast.error(response?.message || "Failed to delete warehouse");
      return;
    }

    toast.success("Warehouse deleted successfully");
    if (editingWarehouseId === warehouseId) {
      resetForm();
    }
    await loadWarehouses();
  };

  const handleStatusToggle = async (warehouse) => {
    const nextStatus = warehouse.status === "open" ? "close" : "open";

    try {
      setStatusUpdatingId(warehouse._id);

      const response = await updateWarehouse(warehouse._id, {
        name: warehouse.name,
        fullAddress: warehouse.fullAddress || "",
        status: nextStatus,
        serviceArea: {
          deliveryRadiusKm: Number(warehouse?.serviceArea?.deliveryRadiusKm || 0),
          selfPickupRadiusKm: Number(
            warehouse?.serviceArea?.selfPickupRadiusKm || 0
          ),
        },
        location: {
          optionType: warehouse.location?.optionType,
          mapLink: warehouse.location?.mapLink || "",
          lat:
            Array.isArray(warehouse?.location?.location?.coordinates) &&
            warehouse.location.location.coordinates.length === 2
              ? warehouse.location.location.coordinates[1]
              : undefined,
          lng:
            Array.isArray(warehouse?.location?.location?.coordinates) &&
            warehouse.location.location.coordinates.length === 2
              ? warehouse.location.location.coordinates[0]
              : undefined,
        },
      });

      if (response?.ok === false || response?.success === false) {
        toast.error(response?.message || "Failed to update warehouse status");
        return;
      }

      setWarehouses((current) =>
        current.map((item) =>
          item._id === warehouse._id ? { ...item, status: nextStatus } : item
        )
      );

      if (editingWarehouseId === warehouse._id) {
        setForm((current) => ({ ...current, status: nextStatus }));
      }

      toast.success(`Warehouse marked as ${nextStatus}`);
    } catch (error) {
      toast.error("Failed to update warehouse status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <WarehouseIcon className="h-7 w-7 text-blue-600" />
            Warehouses
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            List all warehouses, toggle open or close, and add new warehouses from one screen.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadWarehouses}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Warehouse
          </button>
        </div>
      </div>

      {formOpen ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{formTitle}</h2>
              <p className="text-sm text-slate-500">
                Save one location per warehouse using current location, pinpoint, or a Google Maps link.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Warehouse Name
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Enter warehouse name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Full Address
                </span>
                <textarea
                  value={form.fullAddress}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullAddress: event.target.value,
                    }))
                  }
                  placeholder="Enter full warehouse address"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, status: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="close">Close</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Delivery Radius (km)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.serviceArea.deliveryRadiusKm}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serviceArea: {
                        ...current.serviceArea,
                        deliveryRadiusKm: event.target.value,
                      },
                    }))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Self Pickup Radius (km)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.serviceArea.selfPickupRadiusKm}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serviceArea: {
                        ...current.serviceArea,
                        selfPickupRadiusKm: event.target.value,
                      },
                    }))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Location Type
                  </span>
                  <select
                    value={form.location.optionType}
                    onChange={(event) => updateLocation("optionType", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  >
                    {LOCATION_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={fillCurrentLocation}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    <Navigation className="h-4 w-4" />
                    Use Current Location
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <LinkIcon className="h-4 w-4" />
                    Google Map Link
                  </span>
                  <input
                    type="url"
                    value={form.location.mapLink}
                    onChange={(event) => updateLocation("mapLink", event.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  />
                </label>

                <div className="grid gap-3 grid-cols-2">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPin className="h-4 w-4" />
                      Latitude
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={form.location.lat}
                      onChange={(event) => updateLocation("lat", event.target.value)}
                      placeholder="Latitude"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPin className="h-4 w-4" />
                      Longitude
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={form.location.lng}
                      onChange={(event) => updateLocation("lng", event.target.value)}
                      placeholder="Longitude"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? editingWarehouseId
                  ? "Updating..."
                  : "Creating..."
                : formTitle}
            </button>
          </form>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Warehouse List</h2>
            <p className="text-sm text-slate-500">
              Review all warehouses and quickly toggle their open or close status.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {warehouses.length} total
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Loading warehouses...
          </div>
        ) : warehouses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <WarehouseIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No warehouses added yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {warehouses.map((warehouse) => {
              const coordinates = Array.isArray(warehouse?.location?.location?.coordinates)
                ? warehouse.location.location.coordinates
                : [];

              return (
                <div
                  key={warehouse._id}
                  className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {warehouse.name}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            warehouse.status === "open"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {warehouse.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Created {new Date(warehouse.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Close
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={warehouse.status === "open"}
                          aria-label={`Set ${warehouse.name} ${
                            warehouse.status === "open" ? "close" : "open"
                          }`}
                          onClick={() => handleStatusToggle(warehouse)}
                          disabled={statusUpdatingId === warehouse._id}
                          className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
                            warehouse.status === "open"
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          } disabled:cursor-not-allowed disabled:opacity-70`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                              warehouse.status === "open"
                                ? "translate-x-8"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Open
                        </span>
                        {statusUpdatingId === warehouse._id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(warehouse)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(warehouse._id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="mb-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">Address:</span>{" "}
                      {warehouse.fullAddress || "Not provided"}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {(warehouse.location?.optionType || "location").replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      <span>
                        Delivery radius: {Number(warehouse?.serviceArea?.deliveryRadiusKm || 0)} km
                      </span>
                      <span>
                        Self pickup radius: {Number(warehouse?.serviceArea?.selfPickupRadiusKm || 0)} km
                      </span>
                      {coordinates.length === 2 ? (
                        <span>
                          Coordinates: {coordinates[1]}, {coordinates[0]}
                        </span>
                      ) : (
                        <span>Coordinates: Not provided</span>
                      )}

                      {warehouse.location?.mapLink?.trim() ? (
                        <a
                          href={warehouse.location.mapLink.trim()}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                        >
                          <LinkIcon className="h-4 w-4" />
                          Open Google Maps Link
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
