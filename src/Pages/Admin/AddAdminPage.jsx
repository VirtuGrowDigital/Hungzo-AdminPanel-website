import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createAdmin } from "../../Api/index";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserPlusIcon,
  UserIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useLocations } from "../../Context/LocationProvider";
import { idOf } from "../../Api/multicity";
import useAdminRoles from "../../hooks/useAdminRoles";

/* Password rules match the backend: 8–128 characters. */
const MIN_PASSWORD_LENGTH = 8;

const getPasswordStrength = (password) => {
  if (!password) return null;

  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length < MIN_PASSWORD_LENGTH || score <= 1) {
    return { label: "Weak", color: "bg-red-500" };
  }
  if (score === 2) return { label: "Medium", color: "bg-yellow-500" };
  return { label: "Strong", color: "bg-green-500" };
};

/**
 * Which scope levels each role is normally given. Every non-superadmin needs
 * at least one scope entry — the backend rejects the request otherwise.
 * Roles not listed here may use any level.
 */
const ROLE_SCOPE_LEVELS = {
  STATE_MANAGER: ["stateIds"],
  CITY_MANAGER: ["cityIds"],
  WAREHOUSE_MANAGER: ["warehouseIds"],
};

const ALL_LEVELS = ["stateIds", "cityIds", "warehouseIds"];

const emptyScope = () => ({ stateIds: [], cityIds: [], warehouseIds: [] });

export default function AddAdminPage() {
  const navigate = useNavigate();
  const { states, cities, warehouses, loading: locationsLoading } = useLocations();
  // Roles come from the server so this picker never drifts from the backend.
  const { roles, labelOf, descriptionOf, requiresScope } = useAdminRoles();

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "",
  });
  const [scope, setScope] = useState(emptyScope());
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const needsScope = form.role ? requiresScope(form.role) : false;
  const isSuper = Boolean(form.role) && !needsScope;
  const allowedLevels = ROLE_SCOPE_LEVELS[form.role] || ALL_LEVELS;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setForm({ ...form, role });

    // Drop scope levels the new role doesn't use, so a City Manager isn't
    // silently created with leftover state-level access.
    const levels = ROLE_SCOPE_LEVELS[role] || ALL_LEVELS;
    setScope((current) => ({
      stateIds: levels.includes("stateIds") ? current.stateIds : [],
      cityIds: levels.includes("cityIds") ? current.cityIds : [],
      warehouseIds: levels.includes("warehouseIds") ? current.warehouseIds : [],
    }));
  };

  const toggleScope = (level, id) => {
    setScope((current) => {
      const next = new Set(current[level]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...current, [level]: [...next] };
    });
  };

  const scopeCount =
    scope.stateIds.length + scope.cityIds.length + scope.warehouseIds.length;

  const cityLabel = useMemo(() => {
    const stateById = new Map(states.map((s) => [idOf(s._id), s]));
    return (city) => {
      const state = stateById.get(idOf(city.stateId?._id || city.stateId));
      return state ? `${city.name} (${state.code})` : city.name;
    };
  }, [states]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = form.username.trim();
    if (!username || !form.password) {
      toast.error("Username and password are required");
      return;
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (!form.role) {
      toast.error("Select a role");
      return;
    }
    if (!isSuper && scopeCount === 0) {
      toast.error("Assign at least one state, city or warehouse for this role");
      return;
    }

    setLoading(true);

    const res = await createAdmin({
      username,
      password: form.password,
      role: form.role,
      scope: isSuper ? emptyScope() : scope,
    });

    setLoading(false);

    if (res.ok === false) {
      toast.error(res.message);
      return;
    }

    toast.success("Admin created successfully");
    navigate("/admin");
  };

  const strength = getPasswordStrength(form.password);

  const chipGroup = (level, label, options, renderLabel) => {
    if (!allowedLevels.includes(level)) return null;

    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {options.length ? (
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const id = idOf(option._id);
              const selected = scope[level].includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleScope(level, id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {renderLabel(option)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            {locationsLoading ? "Loading..." : `No ${label.toLowerCase()} created yet`}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <UserPlusIcon className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Create Admin</h2>
          <p className="text-sm text-gray-500 mt-1">
            Pick a role, then choose which states, cities or warehouses they can manage
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <UserIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                autoComplete="off"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <LockClosedIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border"
              />
              <div
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 cursor-pointer"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>

            {form.password && strength && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm flex items-center gap-2 mt-1"
              >
                <div className={`w-3 h-3 rounded-full ${strength.color}`} />
                <span className="text-slate-600">
                  Password Strength: <b>{strength.label}</b>
                  {form.password.length < MIN_PASSWORD_LENGTH
                    ? ` · minimum ${MIN_PASSWORD_LENGTH} characters`
                    : ""}
                </span>
              </motion.div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="relative">
              <ShieldCheckIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <select
                name="role"
                value={form.role}
                onChange={handleRoleChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white"
              >
                <option value="" disabled>
                  Select role
                </option>
                {roles.map((entry) => (
                  <option key={entry.role} value={entry.role}>
                    {entry.label || labelOf(entry.role)}
                  </option>
                ))}
              </select>
            </div>
            {form.role ? (
              <p className="mt-1 text-xs text-gray-500">{descriptionOf(form.role)}</p>
            ) : null}
          </div>

          {/* Scope */}
          {form.role && !isSuper ? (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Access scope</p>
                <p className="text-xs text-gray-500">
                  This admin will only see and edit data inside what you select.
                  With nothing selected they would see nothing, so at least one is required.
                </p>
              </div>

              {chipGroup("stateIds", "States", states, (s) => `${s.name} (${s.code})`)}
              {chipGroup("cityIds", "Cities", cities, cityLabel)}
              {chipGroup("warehouseIds", "Warehouses", warehouses, (w) => w.name)}

              <p
                className={`text-xs font-medium ${
                  scopeCount ? "text-green-700" : "text-red-600"
                }`}
              >
                {scopeCount
                  ? `${scopeCount} location${scopeCount === 1 ? "" : "s"} selected`
                  : "No scope selected yet"}
              </p>
            </div>
          ) : null}

          {isSuper ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Super admins have full access to every city, including creating other admins.
              Only give this role to founders or trusted leads.
            </div>
          ) : null}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Creating..." : "Create Admin"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
