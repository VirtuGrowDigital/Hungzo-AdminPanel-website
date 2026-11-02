import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Save, ShieldCheck } from "lucide-react";
import {
  AdminHero,
  AdminPage,
  AdminPanel,
  AdminSectionTitle,
} from "../../Components/AdminPrimitives";
import {
  Button,
  DataTable,
  EmptyState,
  Field,
  InlineAlert,
  Modal,
  Select,
  StatusPill,
  Toggle,
  cn,
} from "../../Components/MulticityUI";
import { useLocations } from "../../Context/LocationProvider";
import { useAuth } from "../../Context/AuthProvider";
import {
  idOf,
  listAdmins,
  updateAdminScope,
} from "../../Api/multicity";
import { PERMISSION_LABELS, PERMISSIONS } from "../../Config/permissions";
import useAdminRoles from "../../hooks/useAdminRoles";

export default function AdminScope() {
  const { states, cities, warehouses } = useLocations();
  const { roles, labelOf, descriptionOf, permissionsOf, requiresScope } = useAdminRoles();
  const { user, can } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listAdmins();
    setLoading(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    // Backend returns { success, admins }; older builds returned a bare array.
    const payload = res.data;
    setAdmins(Array.isArray(payload) ? payload : payload?.admins || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEditor = (admin) => {
    setEditor({
      id: idOf(admin._id || admin.id),
      username: admin.username,
      role: admin.role || "SUPPORT_AGENT",
      isActive: admin.isActive !== false,
      scope: {
        stateIds: (admin.scope?.stateIds || []).map((v) => idOf(v)),
        cityIds: (admin.scope?.cityIds || []).map((v) => idOf(v)),
        warehouseIds: (admin.scope?.warehouseIds || []).map((v) => idOf(v)),
      },
    });
  };

  const toggleScope = (dimension, id) => {
    const current = new Set(editor.scope[dimension]);
    if (current.has(id)) current.delete(id);
    else current.add(id);
    setEditor({ ...editor, scope: { ...editor.scope, [dimension]: [...current] } });
  };

  const save = async () => {
    const isSuper = !requiresScope(editor.role);
    const hasScope =
      editor.scope.stateIds.length ||
      editor.scope.cityIds.length ||
      editor.scope.warehouseIds.length;

    if (!isSuper && !hasScope) {
      toast.error("A non-superadmin needs at least one state, city or warehouse");
      return;
    }

    setSaving(true);
    const res = await updateAdminScope(editor.id, {
      role: editor.role,
      isActive: editor.isActive,
      scope: isSuper
        ? { stateIds: [], cityIds: [], warehouseIds: [] }
        : editor.scope,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Admin updated");
    setEditor(null);
    load();
  };

  // Permission preview for the role being edited.
  const rolePermissions = editor ? permissionsOf(editor.role) : [];

  const scopeSummary = (admin) => {
    if (admin.role === "SUPERADMIN") return "Global";
    const parts = [];
    if (admin.scope?.stateIds?.length) parts.push(`${admin.scope.stateIds.length} state(s)`);
    if (admin.scope?.cityIds?.length) parts.push(`${admin.scope.cityIds.length} city(ies)`);
    if (admin.scope?.warehouseIds?.length)
      parts.push(`${admin.scope.warehouseIds.length} warehouse(s)`);
    return parts.length ? parts.join(" · ") : "No scope — sees nothing";
  };

  const chipGroup = (label, dimension, options, renderLabel) => (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {options.length ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const id = idOf(option._id);
            const selected = editor.scope[dimension].includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleScope(dimension, id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  selected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {renderLabel(option)}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-400">None available</p>
      )}
    </div>
  );

  // Permission-based, not role-based: if the matrix ever grants
  // admins.assign_roles to another role, this screen follows automatically.
  if (!can(PERMISSIONS.ADMINS.ASSIGN_ROLES)) {
    return (
      <AdminPage>
        <AdminHero
          eyebrow="Access control"
          title="Admin roles & scope"
          icon={ShieldCheck}
          description="Only a super admin can manage admin roles and scope."
        />
        <InlineAlert tone="error">You do not have access to this screen.</InlineAlert>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Access control"
        title="Admin roles & scope"
        description="Scope is enforced in the API, not just the UI. An admin with no scope sees nothing — that is deliberate, so a Guna agent can never touch Lucknow orders."
        icon={ShieldCheck}
        meta={`${admins.length} admins`}
        action={
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <AdminPanel>
        <AdminSectionTitle
          title="Admins"
          description="Create admins on the Add Admin page; assign what they can reach here."
        />
        <DataTable
          rows={admins}
          keyField="_id"
          empty={<EmptyState title="No admins yet" />}
          columns={[
            {
              key: "username",
              header: "Admin",
              render: (admin) => (
                <div>
                  <p className="font-semibold text-slate-900">{admin.username}</p>
                  <p className="text-xs text-slate-400">{descriptionOf(admin.role)}</p>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (admin) => (
                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium">
                  {admin.role}
                </span>
              ),
            },
            { key: "scope", header: "Scope", render: scopeSummary },
            {
              key: "isActive",
              header: "Status",
              render: (admin) => (
                <StatusPill value={admin.isActive === false ? "inactive" : "active"} />
              ),
            },
            {
              key: "actions",
              header: "",
              render: (admin) => (
                <Button size="sm" variant="ghost" onClick={() => openEditor(admin)}>
                  Edit access
                </Button>
              ),
            },
          ]}
        />
      </AdminPanel>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={`Access — ${editor?.username || ""}`}
        description="Warehouse scope beats city, city beats state. Pick the narrowest level that fits the job."
        width="max-w-3xl"
      >
        {editor ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role" hint={descriptionOf(editor.role)}>
                <Select
                  value={editor.role}
                  onChange={(e) => setEditor({ ...editor, role: e.target.value })}
                >
                  {roles.map((entry) => (
                    <option key={entry.role} value={entry.role}>
                      {entry.label || labelOf(entry.role)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Account">
                <div className="pt-2">
                  <Toggle
                    checked={editor.isActive}
                    label={editor.isActive ? "Active" : "Disabled"}
                    onChange={(checked) => setEditor({ ...editor, isActive: checked })}
                  />
                </div>
              </Field>
            </div>

            {rolePermissions.length ? (
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  What this role can do ({rolePermissions.length} permissions)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rolePermissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {PERMISSION_LABELS[permission] || permission}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Enforced by the API, not just hidden in the menu.
                </p>
              </div>
            ) : null}

            {!requiresScope(editor.role) ? (
              <InlineAlert tone="warn">
                Super admins have global access. Any scope selected below is cleared on save.
              </InlineAlert>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                {chipGroup("States", "stateIds", states, (s) => `${s.name} (${s.code})`)}
                {chipGroup("Cities", "cityIds", cities, (c) => c.name)}
                {chipGroup("Warehouses", "warehouseIds", warehouses, (w) => w.name)}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditor(null)}>
                Cancel
              </Button>
              <Button variant="success" onClick={save} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save access"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
