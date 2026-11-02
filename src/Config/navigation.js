import {
  Activity,
  Archive,
  BadgeIndianRupee,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  Clock,
  Cog,
  Crosshair,
  FileText,
  Flame,
  Gift,
  Globe2,
  Image,
  LayoutDashboard,
  LogOut,
  Map,
  Package,
  PackagePlus,
  Images,
  RotateCcw,
  Scale,
  ShieldCheck,
  Store,
  Truck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { PERMISSIONS as P } from "./permissions";

/**
 * NAVIGATION — the single source of truth for the admin panel's structure.
 *
 * Every screen is declared once, with the permission it needs. From this one
 * tree we derive:
 *   1. the sidebar (sections and items are hidden when empty for that role)
 *   2. the route guard map used by <ProtectedRoute>
 *
 * Adding a screen = add one entry here. Nothing else to touch.
 *
 * `permission` accepts a string or an array (any-of). Omit it for a screen
 * every signed-in admin may open.
 *
 * `hidden: true` keeps a route guarded without putting it in the sidebar
 * (detail pages, sub-screens reached from a table row).
 */
export const NAVIGATION = [
  {
    id: "overview",
    title: "Overview",
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: P.DASHBOARD.VIEW,
      },
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: P.DASHBOARD.VIEW,
        hidden: true,
      },
    ],
  },

  {
    id: "catalogue",
    title: "Products",
    items: [
      {
        label: "Products",
        icon: Package,
        children: [
          {
            to: "/product/inventory",
            label: "Inventory",
            icon: Package,
            permission: P.CATALOGUE.VIEW,
          },
          {
            to: "/product/add",
            label: "Add Product",
            icon: PackagePlus,
            permission: P.CATALOGUE.CREATE,
          },
          {
            to: "/product/bulk-images",
            label: "Bulk Images",
            icon: Images,
            permission: P.CATALOGUE.IMPORT,
          },
          {
            to: "/product/categories",
            label: "Categories",
            icon: Archive,
            permission: P.CATALOGUE.MANAGE_CATEGORIES,
          },
          {
            to: "/product/subcategories",
            label: "Sub Categories",
            icon: Archive,
            permission: P.CATALOGUE.MANAGE_CATEGORIES,
          },
        ],
      },
      {
        to: "/inventory",
        label: "Stock & Prices",
        icon: Boxes,
        permission: P.INVENTORY.VIEW,
      },
    ],
  },

  {
    id: "orders",
    title: "Orders",
    items: [
      {
        to: "/orders",
        label: "Orders",
        icon: ClipboardList,
        permission: P.ORDERS.VIEW,
      },
      {
        to: "/orders/cities",
        label: "Cross-city Orders",
        icon: Activity,
        permission: P.ORDERS.VIEW_ALL,
      },
      {
        to: "/orders/user/:userId",
        label: "Customer Orders",
        permission: P.ORDERS.VIEW,
        hidden: true,
      },
      {
        to: "/driver-orders/:driverId",
        label: "Driver Orders",
        permission: [P.DRIVERS.VIEW, P.ORDERS.VIEW_DELIVERY],
        hidden: true,
      },
    ],
  },

  {
    id: "locations",
    title: "Locations",
    items: [
      {
        label: "Locations",
        icon: Globe2,
        children: [
          {
            to: "/locations/cities",
            label: "States & Cities",
            icon: Globe2,
            permission: [P.LOCATIONS.VIEW_CITIES, P.LOCATIONS.VIEW_STATES],
          },
          {
            to: "/locations/zones",
            label: "Zones & Map",
            icon: Map,
            permission: P.LOCATIONS.VIEW_ZONES,
          },
          {
            to: "/locations/warehouses",
            label: "Warehouse Settings",
            icon: Store,
            permission: P.LOCATIONS.VIEW_WAREHOUSES,
          },
          {
            to: "/locations/serviceability",
            label: "Serviceability Test",
            icon: Crosshair,
            permission: P.LOCATIONS.MANAGE_SERVICEABILITY,
          },
          {
            to: "/locations/waitlist",
            label: "Demand Heatmap",
            icon: Flame,
            permission: P.LOCATIONS.VIEW_DEMAND,
          },
        ],
      },
      {
        to: "/warehouse",
        label: "Warehouses",
        icon: Building2,
        permission: P.LOCATIONS.VIEW_WAREHOUSES,
      },
    ],
  },

  {
    id: "customers",
    title: "Customers",
    items: [
      {
        label: "Customers",
        icon: Users,
        children: [
          {
            to: "/users/profiles",
            label: "Profiles",
            icon: Users,
            permission: P.CUSTOMERS.VIEW,
          },
          {
            to: "/users/buyer-gst",
            label: "Buyer GST",
            icon: FileText,
            permission: P.CUSTOMERS.REVIEW_GST,
          },
          {
            to: "/users/deletion-requests",
            label: "Deletion Requests",
            icon: FileText,
            permission: P.CUSTOMERS.MANAGE_DELETION,
          },
        ],
      },
      {
        to: "/walletDetails",
        label: "Wallets",
        icon: Wallet,
        permission: P.CUSTOMERS.MANAGE_WALLET,
      },
      {
        to: "/wallet/:userId",
        label: "Customer Wallet",
        permission: P.CUSTOMERS.MANAGE_WALLET,
        hidden: true,
      },
    ],
  },

  {
    id: "delivery",
    title: "Delivery",
    items: [
      {
        to: "/drivers",
        label: "Drivers",
        icon: Truck,
        permission: P.DRIVERS.VIEW,
      },
      {
        to: "/verification",
        label: "Verification",
        icon: ShieldCheck,
        permission: P.DRIVERS.VERIFY,
      },
    ],
  },

  {
    id: "marketing",
    title: "Marketing",
    items: [
      {
        to: "/banner",
        label: "Banners",
        icon: Image,
        permission: P.MARKETING.MANAGE_BANNERS,
      },
      {
        to: "/notification",
        label: "Notifications",
        icon: Bell,
        permission: P.MARKETING.SEND_NOTIFICATIONS,
      },
      {
        label: "Offers",
        icon: Gift,
        children: [
          {
            to: "/offers/wallet",
            label: "Wallet Offers",
            icon: BadgeIndianRupee,
            permission: P.MARKETING.MANAGE_COUPONS,
          },
        ],
      },
    ],
  },

  {
    id: "administration",
    title: "Administration",
    items: [
      {
        to: "/admin",
        label: "Admins",
        icon: UserCog,
        permission: P.ADMINS.VIEW,
      },
      {
        to: "/add-admin",
        label: "Add Admin",
        icon: UserPlus,
        permission: P.ADMINS.CREATE,
      },
      {
        to: "/admin/scope",
        label: "Roles & Scope",
        icon: ShieldCheck,
        permission: P.ADMINS.ASSIGN_ROLES,
      },
    ],
  },

  {
    id: "settings",
    title: "Settings",
    items: [
      {
        to: "/business-hours",
        label: "Business Hours",
        icon: Clock,
        permission: P.SETTINGS.VIEW,
      },
      {
        to: "/app-configuration",
        label: "App Configuration",
        icon: Cog,
        permission: P.SETTINGS.MANAGE_GLOBAL,
      },
      {
        to: "/policies",
        label: "Policies",
        icon: FileText,
        permission: P.SETTINGS.VIEW,
      },
      {
        to: "/legal-details",
        label: "Legal Details",
        icon: Scale,
        permission: P.SETTINGS.MANAGE_LEGAL,
      },
      {
        to: "/returns",
        label: "Returns",
        icon: RotateCcw,
        permission: P.ORDERS.MANAGE_RETURNS,
        hidden: true,
      },
    ],
  },

  {
    id: "account",
    title: "Account",
    items: [
      // No permission: every signed-in admin can always sign out.
      { to: "/logout", label: "Logout", icon: LogOut },
    ],
  },
];

/** Every declared item, flattened (groups included via their children). */
const flatten = () =>
  NAVIGATION.flatMap((section) =>
    section.items.flatMap((item) =>
      item.children?.length ? item.children : [item],
    ),
  );

/**
 * path -> required permissions. Built once from NAVIGATION.
 * Public routes (login, terms) are intentionally absent.
 */
export const ROUTE_PERMISSIONS = Object.fromEntries(
  flatten()
    .filter((item) => item.to)
    .map((item) => [
      item.to,
      item.permission
        ? Array.isArray(item.permission)
          ? item.permission
          : [item.permission]
        : [],
    ]),
);

/** Permissions a route needs; [] when unrestricted or unknown. */
export const permissionsForRoute = (path) => ROUTE_PERMISSIONS[path] ?? [];

/**
 * Sidebar tree for a given permission list. Items the admin cannot open are
 * removed; a group with no remaining children, and a section with no
 * remaining items, disappear entirely.
 */
export const buildNavigation = (permissions, can) =>
  NAVIGATION.map((section) => {
    const items = section.items
      .filter((item) => !item.hidden)
      .map((item) => {
        if (item.children?.length) {
          const children = item.children.filter(
            (child) => !child.hidden && can(permissions, child.permission),
          );
          return children.length ? { ...item, children } : null;
        }
        return can(permissions, item.permission) ? item : null;
      })
      .filter(Boolean);

    return items.length ? { ...section, items } : null;
  }).filter(Boolean);

/**
 * First screen this admin is allowed to open (used after login).
 *
 * Returns null when no screen is available — callers must handle that
 * (show "no access"), never fall back to /logout, which would sign the
 * admin straight back out.
 */
export const firstAllowedRoute = (permissions, can) => {
  if (!permissions?.length) return null;

  const sections = buildNavigation(permissions, can);
  for (const section of sections) {
    if (section.id === "account") continue;
    for (const item of section.items) {
      if (item.children?.length) return item.children[0].to;
      if (item.to && item.to !== "/logout") return item.to;
    }
  }
  return null;
};
