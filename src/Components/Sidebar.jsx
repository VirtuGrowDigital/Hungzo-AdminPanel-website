import React, { useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import logo from "../assets/Logo.png";
import { useAuth } from "../Context/AuthProvider";
import { buildNavigation } from "../Config/navigation";
import { ROLE_LABELS, hasPermission } from "../Config/permissions";

/**
 * The sidebar is a pure renderer of Config/navigation.js, filtered by the
 * permissions the API reported for this admin (GET /admin/me).
 *
 * There is no per-role menu here on purpose: adding a role on the server
 * changes what appears with no frontend release, and a role can never be
 * shown a screen the API would reject.
 */

function SingleLink({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${
          isActive
            ? "bg-white text-slate-900 shadow-sm"
            : "text-white/70 hover:bg-white/8 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              isActive ? "bg-emerald-500 text-white" : "bg-white/8 text-white/70"
            }`}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
          </span>
          <span className="min-w-0 flex-1 font-medium">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function ParentGroup({ item, pathname }) {
  const Icon = item.icon;
  const isActiveGroup = item.children?.some((child) => pathname === child.to);

  return (
    <div className="space-y-1.5">
      <div
        className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
          isActiveGroup ? "bg-white/10 text-white" : "text-white/70"
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            isActiveGroup ? "bg-emerald-500 text-white" : "bg-white/8 text-white/70"
          }`}
        >
          {Icon ? <Icon className="h-4 w-4" /> : null}
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
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`
              }
            >
              {ChildIcon ? <ChildIcon className="h-3.5 w-3.5 shrink-0" /> : null}
              <span className="min-w-0 flex-1 font-medium">{child.label}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-45 transition group-hover:translate-x-0.5" />
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, permissions, scope, profileLoading } = useAuth();
  const location = useLocation();

  const sections = useMemo(
    () => buildNavigation(permissions, hasPermission),
    [permissions],
  );

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] || user.role || "Admin";
  const scopeCount =
    (scope?.cityIds?.length || 0) +
    (scope?.stateIds?.length || 0) +
    (scope?.warehouseIds?.length || 0);

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-hidden border-r border-slate-800/80 bg-[linear-gradient(180deg,#0b1220_0%,#0f172a_52%,#111827_100%)] px-4 py-4 text-white">
      <div className="flex h-full flex-col">
        <Link to="/" className="rounded-2xl px-2 py-2 transition hover:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
              <img src={logo} alt="Hungzo" className="h-7 w-7" />
            </div>
            <div className="flex min-w-0 flex-col justify-center leading-none">
              <p className="text-base font-semibold tracking-tight text-white">Hungzo</p>
              <p className="mt-1 truncate text-[10px] uppercase tracking-[0.2em] text-white/40">
                {roleLabel}
              </p>
            </div>
          </div>
        </Link>

        {user.role && user.role !== "SUPERADMIN" ? (
          <p className="mt-2 px-2 text-[10px] text-white/35">
            {scopeCount
              ? `Scoped to ${scopeCount} location${scopeCount === 1 ? "" : "s"}`
              : "No scope assigned"}
          </p>
        ) : null}

        <div
          className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {!sections.length ? (
            <p className="px-3 py-6 text-xs leading-5 text-white/50">
              {profileLoading
                ? "Loading your access..."
                : "No screens are available for your role yet. Ask a super admin to review your access."}
            </p>
          ) : (
            <nav className="space-y-4">
              {sections.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 px-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
                      {section.title}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {section.items.map((item) =>
                      item.children?.length ? (
                        <ParentGroup
                          key={item.label}
                          item={item}
                          pathname={location.pathname}
                        />
                      ) : (
                        <SingleLink key={item.to} item={item} />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </nav>
          )}
        </div>
      </div>
    </aside>
  );
}
