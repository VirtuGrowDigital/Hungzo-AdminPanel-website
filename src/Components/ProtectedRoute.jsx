import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthProvider";
import { hasPermission } from "../Config/permissions";
import { permissionsForRoute } from "../Config/navigation";
import NoAccess from "./NoAccess";

/**
 * Auth + permission gate.
 *
 * Required permissions come from Config/navigation.js by route path, so a
 * screen that is hidden in the sidebar also cannot be reached by typing its
 * URL. Pass `permission` explicitly for dynamic paths (/wallet/:userId),
 * where the live pathname never matches the declared pattern.
 *
 * The API enforces the same rules; this only turns a raw 403 into a
 * readable screen.
 */
export default function ProtectedRoute({ children, permission }) {
  const { isAuthenticated, isHydrated, permissions, profileLoading, role } = useAuth();
  const location = useLocation();

  if (!isHydrated) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Permissions arrive from GET /admin/me; don't flash "no access" first.
  if (profileLoading && !permissions.length) return null;

  const required = permission
    ? [].concat(permission)
    : permissionsForRoute(location.pathname);

  if (!hasPermission(permissions, required)) {
    return <NoAccess role={role} required={required} />;
  }

  return children;
}
