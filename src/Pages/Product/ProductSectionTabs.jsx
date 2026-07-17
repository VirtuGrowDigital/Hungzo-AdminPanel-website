import React from "react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/product/inventory", label: "Inventory" },
  { to: "/product/add", label: "Add Products" },
  { to: "/product/categories", label: "Category Management" },
  { to: "/product/subcategories", label: "SubCategory Management" },
];

export default function ProductSectionTabs() {
  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
