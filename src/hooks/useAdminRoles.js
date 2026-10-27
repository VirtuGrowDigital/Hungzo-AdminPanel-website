import { useEffect, useState } from "react";
import { listAdminRoles } from "../Api/multicity";
import {
  ADMIN_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "../Config/permissions";

/**
 * Role catalogue for the admin pickers.
 *
 * Source of truth is GET /admin/roles, so a role added on the backend shows
 * up here without a frontend release. The static config is only a fallback
 * for when that call fails (offline, older backend).
 */
const fallback = () =>
  ADMIN_ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role] || role,
    description: ROLE_DESCRIPTIONS[role] || "",
    requiresScope: role !== "SUPERADMIN",
    permissions: [],
  }));

export default function useAdminRoles() {
  const [roles, setRoles] = useState(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    listAdminRoles()
      .then((res) => {
        if (!active) return;
        if (res.ok && res.data?.roles?.length) setRoles(res.data.roles);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const byRole = Object.fromEntries(roles.map((entry) => [entry.role, entry]));

  return {
    roles,
    loading,
    byRole,
    labelOf: (role) => byRole[role]?.label || ROLE_LABELS[role] || role,
    descriptionOf: (role) => byRole[role]?.description || ROLE_DESCRIPTIONS[role] || "",
    permissionsOf: (role) => byRole[role]?.permissions || [],
    requiresScope: (role) => byRole[role]?.requiresScope ?? role !== "SUPERADMIN",
  };
}
