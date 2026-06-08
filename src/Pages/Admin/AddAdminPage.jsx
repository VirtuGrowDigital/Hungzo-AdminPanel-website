import React, { useState } from "react";
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
} from "@heroicons/react/24/outline";

/* 🔒 Password Strength Helper  */
const getPasswordStrength = (password) => {
  if (!password) return null;

  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", color: "bg-red-500" };
  if (score === 2) return { label: "Medium", color: "bg-yellow-500" };
  return { label: "Strong", color: "bg-green-500" };
};

export default function AddAdminPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "SELECT ROLE",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // const roles = ["SUPERADMIN", "ADMIN"];
  const roles = ["SELECT ROLE", "ADMIN"];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      toast.error("Username and password are required");
      return;
    }

    setLoading(true);

    const res = await createAdmin(form);

    if (res.ok === false) {
      toast.error(res.message);
      setLoading(false);
      return;
    }

    toast.success("Admin created successfully");
    navigate("/admin");
    setLoading(false);
  };

  const strength = getPasswordStrength(form.password);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <UserPlusIcon className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            Create Admin
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Add a new administrator account
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
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
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

            {/* 🔒 Password Strength */}
            {form.password && strength && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm flex items-center gap-2 mt-1"
              >
                <div className={`w-3 h-3 rounded-full ${strength.color}`} />
                <span className="text-slate-600">
                  Password Strength: <b>{strength.label}</b>
                </span>
              </motion.div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <div className="relative">
              <ShieldCheckIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold ${
              loading
                ? "bg-gray-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Creating..." : "Create Admin"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
