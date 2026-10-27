import API from "./index";

/**
 * Multi-city API surface (states, cities, zones, zone config, warehouse
 * settings, inventory, serviceability, waitlist, admin scope, targeting).
 *
 * Every helper resolves to { ok, data?, message? } so pages never need
 * try/catch around calls.
 */

const ok = (data) => ({ ok: true, data });
const fail = (error, fallback) => ({
  ok: false,
  message:
    error?.response?.data?.message ||
    error?.message ||
    fallback ||
    "Request failed",
  code: error?.response?.data?.code || null,
  status: error?.response?.status || 0,
});

const request = async (promise, fallbackMessage) => {
  try {
    const res = await promise;
    return ok(res.data);
  } catch (error) {
    return fail(error, fallbackMessage);
  }
};

/* ============================ STATES ============================ */

export const listStates = () =>
  request(API.get("/cities/states"), "Failed to load states");

export const createState = (payload) =>
  request(API.post("/cities/states", payload), "Failed to create state");

/** payload: { name, gstin, invoicePrefix, status, legalDetails:{...} } */
export const updateState = (id, payload) =>
  request(API.put(`/cities/states/${id}`, payload), "Failed to update state");

/* ============================ CITIES ============================ */

export const listCities = () =>
  request(API.get("/cities"), "Failed to load cities");

export const getCity = (id) =>
  request(API.get(`/cities/${id}`), "Failed to load city");

/** payload: { stateId, name, slug, status, launchDate, center:{type:"Point",coordinates:[lng,lat]} } */
export const createCity = (payload) =>
  request(API.post("/cities", payload), "Failed to create city");

export const updateCity = (id, payload) =>
  request(API.put(`/cities/${id}`, payload), "Failed to update city");

export const pauseCity = (id) =>
  request(API.post(`/cities/${id}/pause`), "Failed to pause city");

export const listPublicCities = () =>
  request(API.get("/cities/public"), "Failed to load cities");

/* ============================= ZONES ============================ */

export const listZones = (params = {}) =>
  request(API.get("/zones", { params }), "Failed to load zones");

export const getZone = (id) =>
  request(API.get(`/zones/${id}`), "Failed to load zone");

/**
 * payload: {
 *   cityId, warehouseId, name, slug, priority, status,
 *   pincodes: [], fulfillmentTypes: ["DELIVERY","SELF_PICKUP"],
 *   boundary: { type:"Polygon", coordinates:[[[lng,lat], ...closed ring]] }
 * }
 */
export const createZone = (payload) =>
  request(API.post("/zones", payload), "Failed to create zone");

export const updateZone = (id, payload) =>
  request(API.put(`/zones/${id}`, payload), "Failed to update zone");

/** Send null for any numeric/boolean field to inherit the global value. */
export const updateZoneConfig = (id, payload) =>
  request(API.put(`/zones/${id}/config`, payload), "Failed to save zone config");

/* ========================== WAREHOUSES ========================== */

export const listWarehouses = () =>
  request(API.get("/warehouses"), "Failed to load warehouses");

export const getWarehouse = (id) =>
  request(API.get(`/warehouses/${id}`), "Failed to load warehouse");

export const createWarehouseApi = (payload) =>
  request(API.post("/warehouses/create", payload), "Failed to create warehouse");

export const updateWarehouseApi = (id, payload) =>
  request(API.put(`/warehouses/update/${id}`, payload), "Failed to update warehouse");

/** Move a warehouse to another city/state (separate from normal update). */
export const reassignWarehouse = (id, payload) =>
  request(API.post(`/warehouses/${id}/reassign`, payload), "Failed to move warehouse");

export const getPublicServiceAreas = () =>
  request(API.get("/warehouses/service-areas"), "Failed to load service areas");

/* =========================== INVENTORY ========================== */

export const listInventory = (params = {}) =>
  request(API.get("/inventory", { params }), "Failed to load inventory");

export const createInventory = (payload) =>
  request(API.post("/inventory", payload), "Failed to create inventory row");

export const updateInventory = (id, payload) =>
  request(API.put(`/inventory/${id}`, payload), "Failed to update inventory");

export const deleteInventory = (id) =>
  request(API.delete(`/inventory/${id}`), "Failed to delete inventory row");

/** items: [{ id, mrp?, sellingPrice?, stockQty?, isAvailable?, maxPerOrder? }] */
export const bulkUpdateInventory = (warehouseId, items) =>
  request(
    API.post("/inventory/bulk-update", { warehouseId, items }),
    "Bulk update failed",
  );

export const exportInventory = (params = {}) =>
  request(API.get("/inventory/export", { params }), "Failed to export inventory");

/* ========================= SERVICEABILITY ======================= */

/** Public endpoint — exactly what the customer app calls. */
export const checkServiceability = ({ lat, lng, fulfillmentType = "DELIVERY" }) =>
  request(
    API.get("/serviceability/check", { params: { lat, lng, fulfillmentType } }),
    "Serviceability check failed",
  );

export const listWaitlist = (params = {}) =>
  request(
    API.get("/admin/serviceability-requests", { params }),
    "Failed to load waitlist",
  );

export const waitlistSummary = (params = {}) =>
  request(
    API.get("/admin/serviceability-requests/summary", { params }),
    "Failed to load waitlist summary",
  );

/* ========================== ADMIN SCOPE ========================= */

export const listAdmins = () =>
  request(API.get("/admin/list"), "Failed to load admins");

/** payload: { role, scope: { stateIds, cityIds, warehouseIds }, isActive } */
export const updateAdminScope = (id, payload) =>
  request(API.put(`/admin/${id}/scope`, payload), "Failed to update admin");

/**
 * Role catalogue from the server: label, description, whether a scope is
 * required, and the exact permission list for each role. The pickers are
 * built from this, so a role added on the backend appears with no frontend
 * release.
 */
export const listAdminRoles = () =>
  request(API.get("/admin/roles"), "Failed to load roles");

/** Signed-in admin: role, scope and permissions. */
export const getMyAdminProfile = () =>
  request(API.get("/admin/me"), "Failed to load your profile");

/* =========================== CAMPAIGNS ========================== */

export const listCampaigns = (params = {}) =>
  request(
    API.get("/admin/notifications/campaigns", { params }),
    "Failed to load campaigns",
  );

/** payload includes targeting: { stateIds, cityIds, zoneIds, warehouseIds } */
export const createCampaign = (payload) =>
  request(
    API.post("/admin/notifications/campaigns", payload),
    "Failed to send campaign",
  );

/* ============================ DASHBOARD ========================= */

/**
 * Dashboard analytics. Scope-aware on the server, so a city manager gets
 * their own city's numbers from the same call.
 * @param {{range?: "today"|"7d"|"30d"|"90d", cityId?: string, warehouseId?: string}} params
 */
export const getDashboardOverview = (params = {}) =>
  request(
    API.get("/admin/dashboard/overview", { params }),
    "Failed to load dashboard",
  );

/** Small payload, safe to poll every ~30s. */
export const getDashboardLive = (params = {}) =>
  request(API.get("/admin/dashboard/live", { params }), "Failed to load live operations");

export const DASHBOARD_RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

/* ============================== MAPS ============================ */

/** Google Places autocomplete (backend-proxied, needs GOOGLE_MAPS_API_KEY). */
export const searchPlaces = (input, sessionToken) =>
  request(
    API.get("/maps/places/autocomplete", { params: { input, sessionToken } }),
    "Place search failed",
  );

export const getPlaceDetails = (placeId, sessionToken) =>
  request(
    API.get("/maps/places/details", { params: { placeId, sessionToken } }),
    "Could not load that place",
  );

/* ============================ HELPERS =========================== */

/**
 * Approximate a circle as a polygon ring so a radius can be saved as a normal
 * zone boundary. Uses an equirectangular correction for longitude, which is
 * accurate well beyond any delivery radius.
 *
 * @param {{lat:number,lng:number}} center
 * @param {number} radiusKm
 * @param {number} points  more points = smoother circle (32 is plenty)
 * @returns {Array<[number, number]>} open ring of [lng, lat]
 */
export const circleToPolygon = (center, radiusKm, points = 32) => {
  const EARTH_RADIUS_KM = 6371;
  const latRad = (center.lat * Math.PI) / 180;
  const dLat = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const dLng = dLat / Math.max(0.01, Math.cos(latRad));

  return Array.from({ length: points }, (_, index) => {
    const angle = (2 * Math.PI * index) / points;
    return [
      Number((center.lng + dLng * Math.cos(angle)).toFixed(6)),
      Number((center.lat + dLat * Math.sin(angle)).toFixed(6)),
    ];
  });
};

export const emptyTargeting = () => ({
  stateIds: [],
  cityIds: [],
  zoneIds: [],
  warehouseIds: [],
});

export const isGlobalTargeting = (targeting) =>
  !targeting ||
  (!targeting.stateIds?.length &&
    !targeting.cityIds?.length &&
    !targeting.zoneIds?.length &&
    !targeting.warehouseIds?.length);

export const normalizeTargeting = (targeting) => ({
  stateIds: (targeting?.stateIds || []).map((v) => String(v?._id || v)),
  cityIds: (targeting?.cityIds || []).map((v) => String(v?._id || v)),
  zoneIds: (targeting?.zoneIds || []).map((v) => String(v?._id || v)),
  warehouseIds: (targeting?.warehouseIds || []).map((v) => String(v?._id || v)),
});

export const CITY_STATUSES = ["coming_soon", "live", "paused", "inactive"];
export const ZONE_STATUSES = ["draft", "live", "paused", "inactive"];
export const SERVICE_MODES = ["hybrid", "zones", "radius"];

export const STATUS_TONES = {
  live: "bg-emerald-100 text-emerald-700 border-emerald-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  coming_soon: "bg-amber-100 text-amber-700 border-amber-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  paused: "bg-orange-100 text-orange-700 border-orange-200",
  inactive: "bg-rose-100 text-rose-700 border-rose-200",
  open: "bg-emerald-100 text-emerald-700 border-emerald-200",
  close: "bg-rose-100 text-rose-700 border-rose-200",
};

export const idOf = (value) => (value ? String(value._id || value) : "");
