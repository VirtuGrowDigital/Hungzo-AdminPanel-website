import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PencilIcon, PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";

import {
  createSubCategory,
  deleteSubCategory,
  fetchSubCategories,
  updateSubCategory,
} from "../../Api";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const createInitialForm = () => ({
  category: "",
  name: "",
  image: null,
  isActive: true,
});

export default function SubCategoryManagement() {
  const [subcategories, setsubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [previewUrl, setPreviewUrl] = useState("");

  const isEditing = editingId.trim().length > 0;

  const loadData = async () => {
    setLoading(true);

    const [categoryRes, subRes] = await Promise.all([
      fetchCategories(),
      fetchSubCategories(),
    ]);

    if (categoryRes.ok) setCategories(categoryRes.categories);

    if (subRes.ok) setsubCategories(subRes.subcategories);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!form.image) return undefined;
    const url = URL.createObjectURL(form.image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  const sortedSubCategories = useMemo(
    () =>
      [...subcategories].sort((a, b) => {
        if ((a.isActive ?? true) !== (b.isActive ?? true)) {
          return a.isActive === false ? 1 : -1;
        }
        return (b.productCount ?? 0) - (a.productCount ?? 0);
      }),
    [subcategories],
  );

  const resetForm = () => {
    setEditingId("");
    setForm(createInitialForm());
    setPreviewUrl("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("SubCategory name is required");
      return;
    }
    if (!isEditing && !form.image) {
      toast.error("SubCategory image is required");
      return;
    }

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("isActive", String(form.isActive));
    if (form.image) payload.append("image", form.image);

    setSubmitting(true);
    const res = isEditing
      ? await updateSubCategory(editingId, payload)
      : await createSubCategory(payload);
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }

    toast.success(isEditing ? "SubCategory updated" : "SubCategory created");
    resetForm();
    await loadSubCategories();
  };

  const handleEdit = (subcategory) => {
    setEditingId(subcategory._id);
    setForm({
      name: subcategory.name ?? "",
      image: null,
      isActive: subcategory.isActive !== false,
    });
    setPreviewUrl(subcategory.image ?? "");
  };

  const handleDelete = async (subcategory) => {
    if (
      !window.confirm(
        `Delete ${subcategory.name}? This only works when no products are assigned.`,
      )
    ) {
      return;
    }

    const res = await deleteSubCategory(subcategory._id);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }

    toast.success("SubCategory deleted");
    if (editingId === subcategory._id) resetForm();
    await loadSubCategories();
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">
            SubCategory Management
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Manage subcategory names, images, and publish state for both the
            admin inventory and the customer shop.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? "Update subcategory" : "Create subcategory"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use a clear customer-facing image so subcategory tiles stay
                consistent across the app.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label>Category</label>

                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">Select Category</option>

                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Frozen Foods"
                  className={`${inputClass} mt-1.5`}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">
                  SubCategory image
                </label>
                <label className="mt-1.5 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        image: event.target.files?.[0] ?? null,
                      }))
                    }
                  />
                  <div className="space-y-2">
                    <PhotoIcon className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">
                      Upload PNG, JPG, or WEBP
                    </p>
                    <p className="text-xs text-slate-500">
                      Recommended under 5 MB.
                    </p>
                  </div>
                </label>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex aspect-square items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Category preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-sm text-slate-400">Image preview</div>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Publish subcategory
                  </div>
                  <div className="text-xs text-slate-500">
                    Hidden subcategories won’t appear in the customer app menu.
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : isEditing
                    ? "Update subcategory"
                    : "Create subcategory"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Live subcategories
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review publish state and product coverage before changes go
                  live.
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {sortedSubCategories.length} total
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Loading subcategories...
              </div>
            ) : sortedSubCategories.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No subcategories found yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {sortedSubCategories.map((subcategory) => (
                  <article
                    key={subcategory._id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <div className="aspect-[16/9] bg-slate-200">
                      {subcategory.image ? (
                        <img
                          src={subcategory.image}
                          alt={subcategory.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {subcategory.name}
                          </h3>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {subcategory.productCount ?? 0} linked products
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            subcategory.isActive === false
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {subcategory.isActive === false ? "Hidden" : "Live"}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(subcategory)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(subcategory)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
