import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Info } from "lucide-react";
import { useAuth } from "../../Context/AuthProvider";
import { PERMISSIONS as P } from "../../Config/permissions";

// Only the tabs the signed-in admin can actually open are shown.
const tabs = [
  { to: "/product/inventory", label: "Products", permission: P.CATALOGUE.VIEW },
  { to: "/product/add", label: "Add product", permission: P.CATALOGUE.CREATE },
  { to: "/inventory", label: "Stock & prices", permission: P.INVENTORY.VIEW },
  { to: "/product/bulk-images", label: "Bulk images", permission: P.CATALOGUE.IMPORT },
  { to: "/product/categories", label: "Categories", permission: P.CATALOGUE.MANAGE_CATEGORIES },
  { to: "/product/subcategories", label: "Sub categories", permission: P.CATALOGUE.MANAGE_CATEGORIES },
];

/**
 * Plain-language summary of how products work across locations, shown at the
 * top of every Products screen so every role knows what they can do.
 */
export function HowProductsWork() {
  const { isSuperAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 text-sm text-sky-900">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4" />
          How products work across locations
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <ul className="list-disc space-y-1.5 px-9 pb-4 text-sky-900/90">
          <li>
            <b>One product, one record.</b> "Amul Butter 500 g" exists once in the catalogue. It is never
            created twice. Adding a product that already exists offers <i>Add to my location</i> instead.
          </li>
          <li>
            <b>Each location has its own price and stock.</b> Lucknow and Gwalior can sell the same product
            at different prices with separate stock. Use <i>Price &amp; stock</i> on any product.
          </li>
          <li>
            <b>You manage your own locations.</b> Warehouse, city and state managers add, edit, price and
            remove products for the warehouses in their scope.
          </li>
          <li>
            <b>Shared products are locked.</b> If another location also sells a product, you can still set
            your price and stock, but its name, images and varieties can only be changed by a Super Admin.
            "Delete" removes it from your locations only.
          </li>
          {isSuperAdmin ? (
            <li>
              <b>Super Admin:</b> you see every location and can edit or delete any product everywhere.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export default function ProductSectionTabs() {
  const { can } = useAuth();
  const visible = tabs.filter((tab) => can(tab.permission));

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        {visible.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <HowProductsWork />
    </>
  );
}
