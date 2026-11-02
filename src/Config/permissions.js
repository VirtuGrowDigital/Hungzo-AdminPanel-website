/**
 * PERMISSION CATALOGUE — mirror of the backend's config/permissions.js.
 *
 * Used to DECLARE what each screen needs (see Config/navigation.js).
 * The permissions an actual admin holds always come from the API
 * (`GET /admin/me`), never from this file — the server is the authority and
 * will reject anything the UI lets through.
 *
 * Keep the string values identical to the backend.
 */
export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: "dashboard.view",
    ANALYTICS: "dashboard.analytics",
    LIVE_OPERATIONS: "dashboard.live_operations",
  },

  LOCATIONS: {
    VIEW_STATES: "locations.states.view",
    MANAGE_STATES: "locations.states.manage",
    VIEW_CITIES: "locations.cities.view",
    MANAGE_CITIES: "locations.cities.manage",
    VIEW_ZONES: "locations.zones.view",
    MANAGE_ZONES: "locations.zones.manage",
    VIEW_WAREHOUSES: "locations.warehouses.view",
    MANAGE_WAREHOUSES: "locations.warehouses.manage",
    MANAGE_SERVICEABILITY: "locations.serviceability.manage",
    VIEW_DEMAND: "locations.demand.view",
  },

  CATALOGUE: {
    VIEW: "catalogue.view",
    CREATE: "catalogue.create",
    UPDATE: "catalogue.update",
    DELETE: "catalogue.delete",
    MANAGE_CATEGORIES: "catalogue.categories.manage",
    MANAGE_VARIANTS: "catalogue.variants.manage",
    MANAGE_PRICING: "catalogue.pricing.manage",
    IMPORT: "catalogue.import",
    EXPORT: "catalogue.export",
    MODERATE_REVIEWS: "catalogue.reviews.moderate",
    // Edit / delete-everywhere a product that other locations also sell.
    MANAGE_SHARED: "catalogue.shared.manage",
  },

  INVENTORY: {
    VIEW: "inventory.view",
    UPDATE: "inventory.update",
    ADJUST_STOCK: "inventory.adjust_stock",
    TRANSFER: "inventory.transfer",
    VIEW_LOW_STOCK: "inventory.low_stock",
  },

  ORDERS: {
    VIEW: "orders.view",
    VIEW_ALL: "orders.view_all",
    UPDATE_STATUS: "orders.update_status",
    ASSIGN_WAREHOUSE: "orders.assign_warehouse",
    CANCEL: "orders.cancel",
    REQUEST_CANCEL: "orders.request_cancel",
    MANAGE_RETURNS: "orders.manage_returns",
    VIEW_DELIVERY: "orders.view_delivery",
    VERIFY_PICKUP: "orders.verify_pickup",
  },

  CUSTOMERS: {
    VIEW: "customers.view",
    VIEW_DETAILS: "customers.view_details",
    UPDATE: "customers.update",
    BLOCK: "customers.block",
    MANAGE_WALLET: "customers.manage_wallet",
    REVIEW_GST: "customers.gst.review",
    MANAGE_DELETION: "customers.deletion.manage",
  },

  SUPPORT: {
    VIEW: "support.view",
    REPLY: "support.reply",
    ASSIGN: "support.assign",
    RESOLVE: "support.resolve",
    ESCALATE: "support.escalate",
  },

  DRIVERS: {
    VIEW: "drivers.view",
    VERIFY: "drivers.verify",
    MANAGE: "drivers.manage",
    ASSIGN: "drivers.assign",
    TRACK: "drivers.track",
    VIEW_PERFORMANCE: "drivers.performance",
  },

  FINANCE: {
    VIEW_TRANSACTIONS: "finance.transactions.view",
    VIEW_REFUNDS: "finance.refunds.view",
    APPROVE_REFUNDS: "finance.refunds.approve",
    EXECUTE_REFUNDS: "finance.refunds.execute",
    VIEW_SETTLEMENTS: "finance.settlements.view",
    MANAGE_SETTLEMENTS: "finance.settlements.manage",
    VIEW_REPORTS: "finance.reports.view",
    RECONCILE: "finance.reconcile",
    VIEW_LEDGER: "finance.ledger.view",
  },

  MARKETING: {
    VIEW: "marketing.view",
    MANAGE_BANNERS: "marketing.banners.manage",
    MANAGE_COUPONS: "marketing.coupons.manage",
    MANAGE_CAMPAIGNS: "marketing.campaigns.manage",
    SEND_NOTIFICATIONS: "marketing.notifications.send",
  },

  ADMINS: {
    VIEW: "admins.view",
    CREATE: "admins.create",
    UPDATE: "admins.update",
    DEACTIVATE: "admins.deactivate",
    ASSIGN_ROLES: "admins.assign_roles",
    MANAGE_PERMISSIONS: "admins.manage_permissions",
  },

  SETTINGS: {
    VIEW: "settings.view",
    MANAGE_CITY: "settings.city.manage",
    MANAGE_GLOBAL: "settings.global.manage",
    MANAGE_LEGAL: "settings.legal.manage",
    MANAGE_INTEGRATIONS: "settings.integrations.manage",
    MANAGE_SECURITY: "settings.security.manage",
    VIEW_AUDIT_LOGS: "settings.audit_logs.view",
  },
};

/** Flatten a nested permission group into an array of strings. */
export const values = (group) =>
  Object.values(group).flatMap((value) =>
    typeof value === "string" ? [value] : values(value),
  );

export const ALL_PERMISSIONS = values(PERMISSIONS);

/** Roles in display order. The server is authoritative; this is a fallback. */
export const ADMIN_ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "SUBADMIN",
  "STATE_MANAGER",
  "CITY_MANAGER",
  "WAREHOUSE_MANAGER",
];

export const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Admin",
  SUBADMIN: "Sub Admin",
  STATE_MANAGER: "State Manager",
  CITY_MANAGER: "City Manager",
  WAREHOUSE_MANAGER: "Warehouse Manager",
};

export const ROLE_DESCRIPTIONS = {
  SUPERADMIN: "Full access to every city and every screen, including admins and global settings.",
  ADMIN: "Full operations inside their scope. Cannot change roles or global platform settings.",
  SUBADMIN: "Products and Orders only, inside their scope. No locations, customers, drivers, finance or settings.",
  STATE_MANAGER: "Runs every city inside their states: products, prices & stock, zones, warehouses, orders, drivers.",
  CITY_MANAGER: "Runs their cities end to end: products, prices & stock, zones, warehouses, orders, drivers, promos.",
  WAREHOUSE_MANAGER: "Runs a single store: its products, prices & stock, orders, returns and driver visibility.",
};

/** Human labels for individual permissions (used in the role preview). */
export const PERMISSION_LABELS = {
  "dashboard.view": "Dashboard",
  "dashboard.analytics": "Analytics",
  "dashboard.live_operations": "Live operations",

  "locations.states.view": "View states",
  "locations.states.manage": "Manage states",
  "locations.cities.view": "View cities",
  "locations.cities.manage": "Manage cities",
  "locations.zones.view": "View zones",
  "locations.zones.manage": "Draw & edit zones",
  "locations.warehouses.view": "View warehouses",
  "locations.warehouses.manage": "Manage warehouses",
  "locations.serviceability.manage": "Serviceability",
  "locations.demand.view": "Demand heatmap",

  "catalogue.view": "View catalogue",
  "catalogue.create": "Add products",
  "catalogue.update": "Edit products",
  "catalogue.delete": "Delete products",
  "catalogue.categories.manage": "Manage categories",
  "catalogue.variants.manage": "Manage variants",
  "catalogue.pricing.manage": "Manage pricing",
  "catalogue.import": "Bulk import",
  "catalogue.export": "Export catalogue",
  "catalogue.reviews.moderate": "Moderate reviews",
  "catalogue.shared.manage": "Edit shared products (all locations)",

  "inventory.view": "View inventory",
  "inventory.update": "Edit inventory",
  "inventory.adjust_stock": "Adjust stock",
  "inventory.transfer": "Transfer stock",
  "inventory.low_stock": "Low-stock alerts",

  "orders.view": "View orders",
  "orders.view_all": "View all orders",
  "orders.update_status": "Update order status",
  "orders.assign_warehouse": "Reassign warehouse",
  "orders.cancel": "Cancel orders",
  "orders.request_cancel": "Request cancellation",
  "orders.manage_returns": "Manage returns",
  "orders.view_delivery": "View delivery",
  "orders.verify_pickup": "Verify pickup OTP",

  "customers.view": "View customers",
  "customers.view_details": "Customer details",
  "customers.update": "Edit customers",
  "customers.block": "Block customers",
  "customers.manage_wallet": "Manage wallets",
  "customers.gst.review": "Review buyer GST",
  "customers.deletion.manage": "Deletion requests",

  "support.view": "View support",
  "support.reply": "Reply to tickets",
  "support.assign": "Assign tickets",
  "support.resolve": "Resolve tickets",
  "support.escalate": "Escalate tickets",

  "drivers.view": "View drivers",
  "drivers.verify": "Verify drivers",
  "drivers.manage": "Manage drivers",
  "drivers.assign": "Assign drivers",
  "drivers.track": "Track drivers",
  "drivers.performance": "Driver performance",

  "finance.transactions.view": "View transactions",
  "finance.refunds.view": "View refunds",
  "finance.refunds.approve": "Approve refunds",
  "finance.refunds.execute": "Execute refunds",
  "finance.settlements.view": "View settlements",
  "finance.settlements.manage": "Manage settlements",
  "finance.reports.view": "Financial reports",
  "finance.reconcile": "Reconcile",
  "finance.ledger.view": "View ledger",

  "marketing.view": "View marketing",
  "marketing.banners.manage": "Manage banners",
  "marketing.coupons.manage": "Manage offers",
  "marketing.campaigns.manage": "Manage campaigns",
  "marketing.notifications.send": "Send notifications",

  "admins.view": "View admins",
  "admins.create": "Create admins",
  "admins.update": "Edit admins",
  "admins.deactivate": "Disable admins",
  "admins.assign_roles": "Assign roles",
  "admins.manage_permissions": "Manage permissions",

  "settings.view": "View settings",
  "settings.city.manage": "City settings",
  "settings.global.manage": "Global settings",
  "settings.legal.manage": "Legal details",
  "settings.integrations.manage": "Integrations",
  "settings.security.manage": "Security",
  "settings.audit_logs.view": "Audit logs",
};

/**
 * Any-of check.
 * @param {string[]} permissions  what the admin holds (from /admin/me)
 * @param {string|string[]} required  empty/undefined = no restriction
 */
export const hasPermission = (permissions, required) => {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  if (!list.length) return true;
  if (!permissions?.length) return false;
  return list.some((permission) => permissions.includes(permission));
};

/** All-of check, for screens that need several capabilities at once. */
export const hasAllPermissions = (permissions, required = []) => {
  const list = Array.isArray(required) ? required : [required];
  if (!list.length) return true;
  if (!permissions?.length) return false;
  return list.every((permission) => permissions.includes(permission));
};
