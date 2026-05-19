import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileText, ShieldCheck, Truck, Undo2 } from "lucide-react";

import { getPolicyDocuments, updatePolicyDocuments } from "../../Api";
import SectionTabsPanel from "../../Components/SectionTabsPanel";

const APP_LABELS = {
  HUNGZO: "Hungzo Customer App",
  DELIVERY_PARTNER: "Delivery Partner App",
  GLOBAL: "Global",
};

const APP_ICONS = {
  HUNGZO: FileText,
  DELIVERY_PARTNER: Truck,
  GLOBAL: ShieldCheck,
};

const emptyPolicy = () => ({
  id: "",
  key: "",
  app: "HUNGZO",
  title: "",
  summary: "",
  content: "",
  published: true,
  sortOrder: 0,
});

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeApp, setActiveApp] = useState("HUNGZO");

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    setLoading(true);
    const response = await getPolicyDocuments();

    if (!response?.success) {
      toast.error(response?.message || "Failed to fetch policy documents");
      setLoading(false);
      return;
    }

    setPolicies(
      (response.policies || []).map((policy) => ({
        ...emptyPolicy(),
        ...policy,
      }))
    );
    const apps = [
      ...new Set((response.policies || []).map((policy) => policy.app || "HUNGZO")),
    ];
    if (apps.length > 0) {
      setActiveApp((current) => (apps.includes(current) ? current : apps[0]));
    }
    setLoading(false);
  }

  function updatePolicy(index, key, value) {
    setPolicies((current) =>
      current.map((policy, currentIndex) =>
        currentIndex === index ? { ...policy, [key]: value } : policy
      )
    );
  }

  const groupedPolicies = useMemo(() => {
    return policies.reduce((groups, policy) => {
      const app = policy.app || "HUNGZO";
      if (!groups[app]) {
        groups[app] = [];
      }
      groups[app].push(policy);
      return groups;
    }, {});
  }, [policies]);

  const appGroups = Object.entries(groupedPolicies);
  const availableApps = appGroups.map(([app]) => app);
  const resolvedActiveApp = availableApps.includes(activeApp)
    ? activeApp
    : availableApps[0] || "HUNGZO";
  const activePolicies = groupedPolicies[resolvedActiveApp] || [];
  const ActiveAppIcon = APP_ICONS[resolvedActiveApp] || FileText;

  function validatePolicies() {
    for (const policy of policies) {
      if (!policy.key.trim()) {
        return "Each policy must have a key";
      }
      if (!policy.title.trim()) {
        return `Title is required for ${policy.key || "a policy"}`;
      }
      if (Number.isNaN(Number(policy.sortOrder))) {
        return `Sort order must be numeric for ${policy.title || policy.key}`;
      }
    }

    const duplicateKeys = policies
      .map((policy) => policy.key.trim().toUpperCase())
      .filter((key, index, values) => values.indexOf(key) !== index);

    if (duplicateKeys.length > 0) {
      return `Duplicate policy keys found: ${duplicateKeys.join(", ")}`;
    }

    return null;
  }

  async function handleSave(event) {
    event.preventDefault();

    const validationMessage = validatePolicies();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setSaving(true);
    const payload = policies.map((policy) => ({
      key: policy.key.trim().toUpperCase(),
      app: policy.app,
      title: policy.title.trim(),
      summary: policy.summary.trim(),
      content: policy.content.trim(),
      published: policy.published === true,
      sortOrder: Number(policy.sortOrder),
    }));

    const response = await updatePolicyDocuments(payload);

    if (!response?.success) {
      toast.error(response?.message || "Failed to update policy documents");
      setSaving(false);
      return;
    }

    setPolicies(
      (response.policies || []).map((policy) => ({
        ...emptyPolicy(),
        ...policy,
      }))
    );
    toast.success("Policy documents updated");
    setSaving(false);
  }

  const inputClassName =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <div className="min-h-full bg-slate-50 px-6 py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-200">
                Central Content Repository
              </p>
              <h1 className="mt-2 text-3xl font-semibold">Policies</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-200">
                Manage Terms, Privacy, Refund, and Cancellation content from one place so support, apps, and future web pages can all use the same source of truth.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-50">
              <ShieldCheck className="h-4 w-4" />
              Admin-managed and publish-ready
            </div>
          </div>
        </section>

        <form onSubmit={handleSave} className="space-y-6">
          <SectionTabsPanel
            eyebrow="Policy Tabs"
            title="Browse By Audience"
            helper="Jump between app audiences from the left rail and keep the editing surface focused on one policy group at a time."
            items={appGroups.map(([app, appPolicies]) => ({
              key: app,
              title: APP_LABELS[app] || app,
              description: "Centralized policy documents grouped by app audience.",
              icon: APP_ICONS[app] || FileText,
              meta: `${appPolicies.length} policies`,
            }))}
            activeKey={resolvedActiveApp}
            onChange={setActiveApp}
          >
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 border-b border-slate-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <ActiveAppIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {APP_LABELS[resolvedActiveApp] || resolvedActiveApp}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Centralized policy documents grouped by app audience.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Total Policies
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {activePolicies.length}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Documents in this tab</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Published
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {activePolicies.filter((policy) => policy.published === true).length}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Live documents visible to apps</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {activePolicies.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      No policies in this tab yet
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Once documents are available for this audience, they will appear here for editing.
                    </p>
                  </div>
                ) : null}
                {activePolicies.map((policy) => {
                  const index = policies.findIndex((item) => item.key === policy.key);
                  return (
                    <div
                      key={policy.id || `${policy.app}-${policy.key}`}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="grid gap-5 md:grid-cols-[1.3fr_0.7fr]">
                        <div className="space-y-5">
                          <div className="grid gap-5 md:grid-cols-2">
                            <label className="text-sm font-medium text-slate-700">
                              Policy key
                              <input
                                value={policy.key}
                                onChange={(event) =>
                                  updatePolicy(index, "key", event.target.value.toUpperCase())
                                }
                                className={inputClassName}
                                disabled={loading || saving}
                              />
                            </label>

                            <label className="text-sm font-medium text-slate-700">
                              Title
                              <input
                                value={policy.title}
                                onChange={(event) =>
                                  updatePolicy(index, "title", event.target.value)
                                }
                                className={inputClassName}
                                disabled={loading || saving}
                              />
                            </label>
                          </div>

                          <label className="block text-sm font-medium text-slate-700">
                            Summary
                            <input
                              value={policy.summary}
                              onChange={(event) =>
                                updatePolicy(index, "summary", event.target.value)
                              }
                              className={inputClassName}
                              placeholder="Short description shown in admin and API consumers"
                              disabled={loading || saving}
                            />
                          </label>

                          <label className="block text-sm font-medium text-slate-700">
                            Content
                            <textarea
                              value={policy.content}
                              onChange={(event) =>
                                updatePolicy(index, "content", event.target.value)
                              }
                              className={`${inputClassName} min-h-[260px] resize-y`}
                              placeholder="Write the policy content here. Plain text or markdown-style formatting can be stored."
                              disabled={loading || saving}
                            />
                          </label>
                        </div>

                        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5">
                          <label className="block text-sm font-medium text-slate-700">
                            App
                            <select
                              value={policy.app}
                              onChange={(event) =>
                                updatePolicy(index, "app", event.target.value)
                              }
                              className={inputClassName}
                              disabled={loading || saving}
                            >
                              <option value="HUNGZO">Hungzo</option>
                              <option value="DELIVERY_PARTNER">Delivery Partner</option>
                              <option value="GLOBAL">Global</option>
                            </select>
                          </label>

                          <label className="block text-sm font-medium text-slate-700">
                            Sort order
                            <input
                              type="number"
                              value={policy.sortOrder}
                              onChange={(event) =>
                                updatePolicy(index, "sortOrder", event.target.value)
                              }
                              className={inputClassName}
                              disabled={loading || saving}
                            />
                          </label>

                          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                            Published
                            <input
                              type="checkbox"
                              checked={policy.published === true}
                              onChange={(event) =>
                                updatePolicy(index, "published", event.target.checked)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              disabled={loading || saving}
                            />
                          </label>

                          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            <p className="font-semibold text-slate-700">Public API</p>
                            <p className="mt-2 break-all">
                              {`/store/policies?app=${policy.app}${policy.key ? `&key=${policy.key}` : ""}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </SectionTabsPanel>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={loadPolicies}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Undo2 className="h-4 w-4" />
              Reload
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Policies"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
