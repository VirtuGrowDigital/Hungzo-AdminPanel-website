import React, { useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon,
  BellAlertIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentTextIcon,
  TruckIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/solid";
import { ChevronRight, Gift, Scale, ShieldCheck, Wallet } from "lucide-react";
import logo from "../assets/Logo.png";
import { useAuth } from "../Context/AuthProvider";

const adminMenu = [
  {
    label: "Products",
    icon: CubeIcon,
    children: [
      { to: "/product/inventory", label: "Inventory", icon: CubeIcon },
      { to: "/product/add", label: "Add Products", icon: CubeIcon },
      { to: "/product/categories", label: "Category Management", icon: CubeIcon },
    ],
  },
  { to: "/orders", label: "Orders", icon: ClipboardDocumentListIcon },
  {
    label: "Users",
    icon: BuildingOffice2Icon,
    children: [
      { to: "/users/profiles", label: "Profiles", icon: BuildingOffice2Icon },
      {
        to: "/users/deletion-requests",
        label: "Deletion Requests",
        icon: DocumentTextIcon,
      },
    ],
  },
  { to: "/banner", label: "Banner", icon: ArchiveBoxIcon },
  { to: "/warehouse", label: "Warehouse", icon: BuildingStorefrontIcon },
  { to: "/business-hours", label: "Business Hours", icon: ClockIcon },
  { to: "/app-configuration", label: "App Configuration", icon: Cog6ToothIcon },
  { to: "/policies", label: "Policies", icon: DocumentTextIcon },
  { to: "/legal-details", label: "Legal Details", icon: ShieldCheck },
  { to: "/notification", label: "Notifications", icon: BellAlertIcon },
  {
    label: "Offers",
    icon: Gift,
    children: [{ to: "/offers/wallet", label: "Wallet Offers", icon: Wallet }],
  },
  { to: "/Terms", label: "Terms & Rules", icon: Scale },
  { to: "/logout", label: "Logout", icon: ArrowRightOnRectangleIcon },
];

const superAdminMenu = [
  {
    label: "Products",
    icon: CubeIcon,
    children: [
      { to: "/product/inventory", label: "Inventory", icon: CubeIcon },
      { to: "/product/add", label: "Add Products", icon: CubeIcon },
      { to: "/product/categories", label: "Category Management", icon: CubeIcon },
    ],
  },
  { to: "/orders", label: "Orders", icon: ClipboardDocumentListIcon },
  {
    label: "Users",
    icon: BuildingOffice2Icon,
    children: [
      { to: "/users/profiles", label: "Profiles", icon: BuildingOffice2Icon },
      { to: "/users/buyer-gst", label: "Buyer GST", icon: DocumentTextIcon },
      {
        to: "/users/deletion-requests",
        label: "Deletion Requests",
        icon: DocumentTextIcon,
      },
    ],
  },
  { to: "/verification", label: "Verification", icon: ClipboardDocumentListIcon },
  { to: "/drivers", label: "Drivers", icon: TruckIcon },
  { to: "/admin", label: "Admins", icon: UserGroupIcon },
  { to: "/add-admin", label: "Add Admin", icon: UserPlusIcon },
  { to: "/banner", label: "Banner", icon: ArchiveBoxIcon },
  { to: "/warehouse", label: "Warehouse", icon: BuildingStorefrontIcon },
  { to: "/business-hours", label: "Business Hours", icon: ClockIcon },
  { to: "/app-configuration", label: "App Configuration", icon: Cog6ToothIcon },
  { to: "/policies", label: "Policies", icon: DocumentTextIcon },
  { to: "/legal-details", label: "Legal Details", icon: ShieldCheck },
  { to: "/notification", label: "Notifications", icon: BellAlertIcon },
  { to: "/walletDetails", label: "Wallet", icon: Wallet },
  {
    label: "Offers",
    icon: Gift,
    children: [{ to: "/offers/wallet", label: "Wallet Offers", icon: Wallet }],
  },
  { to: "/Terms", label: "Terms & Rules", icon: Scale },
  { to: "/logout", label: "Logout", icon: ArrowRightOnRectangleIcon },
];

const buildMenuSections = (menuItems) => {
  const primary = [];
  const operations = [];
  const system = [];

  menuItems.forEach((item) => {
    const target = item.to || item.label;

    if (
      [
        "/orders",
        "/verification",
        "/drivers",
        "/walletDetails",
        "/warehouse",
        "/business-hours",
      ].includes(target)
    ) {
      operations.push(item);
      return;
    }

    if (
      [
        "/app-configuration",
        "/policies",
        "/legal-details",
        "/notification",
        "/Terms",
        "/logout",
      ].includes(target)
    ) {
      system.push(item);
      return;
    }

    primary.push(item);
  });

  return [
    { title: "Workspace", items: primary },
    { title: "Operations", items: operations },
    { title: "System", items: system },
  ].filter((section) => section.items.length > 0);
};

function ParentGroup({ item, pathname }) {
  const Icon = item.icon;
  const isActiveGroup = item.children?.some((child) => pathname === child.to);

  return (
    <div className="space-y-1.5">
      <div
        className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
          isActiveGroup ? "bg-white/10 text-white" : "text-white/72"
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            isActiveGroup ? "bg-emerald-500 text-white" : "bg-white/8 text-white/70"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{item.label}</p>
        </div>
      </div>

      <div className="ml-5 space-y-1 border-l border-white/10 pl-3">
        {item.children.map((child) => {
          const ChildIcon = child.icon;
          return (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-white/62 hover:bg-white/7 hover:text-white"
                }`
              }
            >
              <ChildIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 font-medium">{child.label}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-45 transition group-hover:translate-x-0.5" />
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

function SingleLink({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
          isActive
            ? "bg-white text-slate-900 shadow-sm"
            : "text-white/72 hover:bg-white/7 hover:text-white"
        }`
      }
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
          item.to === "/logout" ? "bg-rose-500/14 text-rose-200" : "bg-white/8 text-current"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="min-w-0 flex-1 font-medium">{item.label}</span>
      <ChevronRight className="h-3.5 w-3.5 opacity-45 transition group-hover:translate-x-0.5" />
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const menuItems =
    user.role === "SUPERADMIN"
      ? superAdminMenu
      : user.role === "ADMIN"
        ? adminMenu
        : [];

  const sections = useMemo(() => buildMenuSections(menuItems), [menuItems]);
  const roleLabel = user.role === "SUPERADMIN" ? "Signed in as Super Admin" : "Signed in as Admin";

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-hidden border-r border-slate-800/80 bg-[linear-gradient(180deg,#0b1220_0%,#0f172a_52%,#111827_100%)] px-4 py-4 text-white">
      <div className="flex h-full flex-col">
        <Link to="/" className="rounded-2xl px-2 py-2 transition hover:bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
              <img src={logo} alt="logo" className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex flex-col justify-center leading-none">
              <p className="text-base font-semibold tracking-tight text-white">Hungzo</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/38">
                {roleLabel}
              </p>
            </div>
          </div>
        </Link>

        <div
          className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <nav className="space-y-4">
            {sections.map((section) => (
              <div key={section.title}>
                <div className="mb-2 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">
                    {section.title}
                  </p>
                </div>

                <div className="space-y-1">
                  {section.items.map((item) =>
                    item.children?.length ? (
                      <ParentGroup key={item.label} item={item} pathname={location.pathname} />
                    ) : (
                      <SingleLink key={item.to} item={item} />
                    )
                  )}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-3 px-3 py-2 text-[11px] text-white/38">
          © {new Date().getFullYear()} Hungzo Admin Panel
        </div>
      </div>

      <style>{`
        div[style*="scrollbar-width: none"]::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>
    </aside>
  );
}
