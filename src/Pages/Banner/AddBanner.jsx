import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { createBanner, fetchCategories, myProducts } from "../../Api";
import LocationTargetingPicker from "../../Components/LocationTargetingPicker";
import { emptyTargeting, isGlobalTargeting } from "../../Api/multicity";
import { useAuth } from "../../Context/AuthProvider";
import {
  ALLOWED_BANNER_IMAGE_MIME_TYPES,
  MAX_BANNER_IMAGE_SIZE_MB,
  MAX_BANNER_IMAGE_SIZE_BYTES,
} from "../../constants/banner";

const createInitialForm = () => ({
  title: "",
  subtitle: "",
  description: "",
  actionType: "CATEGORY",
  actionId: "",
  targetUrl: "",
  displayOrder: "0",
  startsAt: "",
  endsAt: "",
  isActive: true,
});

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const AddBanner = ({ onBack, onBannerCreated }) => {
  const [form, setForm] = useState(createInitialForm);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targeting, setTargeting] = useState(emptyTargeting());
  const { user } = useAuth();

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const actionOptions = useMemo(
    () => [
      { value: "CATEGORY", label: "Open category" },
      { value: "PRODUCT", label: "Open product" },
      { value: "URL", label: "Open web URL" },
      { value: "NONE", label: "No action" },
    ],
    []
  );

  const actionTargets = useMemo(() => {
    if (form.actionType === "CATEGORY") return categories;
    if (form.actionType === "PRODUCT") return products;
    return [];
  }, [categories, form.actionType, products]);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, productsRes] = await Promise.all([
        fetchCategories(),
        myProducts(),
      ]);

      if (categoriesRes?.ok) {
        setCategories(categoriesRes.categories || []);
      }

      if (productsRes?.ok) {
        const nextProducts = Array.isArray(productsRes.data?.products)
          ? productsRes.data.products
          : [];
        setProducts(nextProducts);
      }
    } catch {
      toast.error("Failed to load banner references");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (form.actionType === "CATEGORY") {
      setForm((prev) => ({
        ...prev,
        actionId: prev.actionId || categories[0]?._id || "",
        targetUrl: "",
      }));
      return;
    }

    if (form.actionType === "PRODUCT") {
      setForm((prev) => ({
        ...prev,
        actionId: prev.actionId || products[0]?._id || "",
        targetUrl: "",
      }));
      return;
    }

    if (form.actionType === "URL") {
      setForm((prev) => ({
        ...prev,
        actionId: "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      actionId: "",
      targetUrl: "",
    }));
  }, [categories, form.actionType, products]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    const invalidFiles = [];

    files.forEach((file) => {
      if (!ALLOWED_BANNER_IMAGE_MIME_TYPES.has(file.type)) {
        invalidFiles.push(`${file.name} must be JPG, PNG, or WEBP`);
      } else if (file.size > MAX_BANNER_IMAGE_SIZE_BYTES) {
        invalidFiles.push(`${file.name} exceeds ${MAX_BANNER_IMAGE_SIZE_MB}MB`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      const message = invalidFiles[0];
      setSelectedImage(null);
      setImagePreview("");
      setFormErrors((prev) => ({
        ...prev,
        images: message,
      }));
      toast.error(message);
    } else if (formErrors.images) {
      setFormErrors((prev) => ({
        ...prev,
        images: "",
      }));
    }

    const nextFile = validFiles[0];
    if (!nextFile) return;

    if (validFiles.length > 1) {
      const message = "Only one banner image can be uploaded.";
      setFormErrors((prev) => ({
        ...prev,
        images: message,
      }));
      toast(message);
    }

    setSelectedImage(nextFile);
    setImagePreview(URL.createObjectURL(nextFile));
    event.target.value = "";
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    if (formErrors.images) {
      setFormErrors((prev) => ({
        ...prev,
        images: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!form.title.trim()) errors.title = "Banner title is required";
    if (!selectedImage) errors.images = "Select one banner image";
    if (form.actionType === "CATEGORY" && !form.actionId) {
      errors.actionId = "Select a category";
    }
    if (form.actionType === "PRODUCT" && !form.actionId) {
      errors.actionId = "Select a product";
    }
    if (form.actionType === "URL" && !/^https?:\/\//i.test(form.targetUrl.trim())) {
      errors.targetUrl = "Target URL must start with http:// or https://";
    }
    if (form.startsAt && form.endsAt && form.startsAt > form.endsAt) {
      errors.endsAt = "Start time cannot be after end time";
    }

    setFormErrors(errors);
    return errors;
  };

  const applyServerErrors = (response) => {
    const payload = response?.error || response;
    const nextErrors = {};

    if (payload?.errors && typeof payload.errors === "object") {
      Object.assign(nextErrors, payload.errors);
    }

    if (!nextErrors.form && payload?.message) {
      nextErrors.form = payload.message;
    }

    setFormErrors((prev) => ({
      ...prev,
      ...nextErrors,
    }));

    return {
      message: payload?.message || "Failed to create banner",
      hasFieldErrors: Object.keys(nextErrors).some((key) => key !== "form" && nextErrors[key]),
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isGlobalTargeting(targeting) && user?.role !== "SUPERADMIN") {
        toast.error("Select at least one location for this banner");
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      // Location targeting: empty arrays = every city (super admin only).
      formData.append("targeting", JSON.stringify(targeting));
      formData.append("title", form.title.trim());
      formData.append("subtitle", form.subtitle.trim());
      formData.append("description", form.description.trim());
      formData.append("actionType", form.actionType);
      formData.append("displayOrder", form.displayOrder || "0");
      formData.append("isActive", String(form.isActive));

      if (form.startsAt) {
        formData.append("startsAt", new Date(form.startsAt).toISOString());
      }
      if (form.endsAt) {
        formData.append("endsAt", new Date(form.endsAt).toISOString());
      }

      if (form.actionType === "CATEGORY" || form.actionType === "PRODUCT") {
        formData.append("actionId", form.actionId);
      }

      if (form.actionType === "URL") {
        formData.append("targetUrl", form.targetUrl.trim());
      }

      formData.append("images", selectedImage);

      const response = await createBanner(formData);

      if (!response?.ok) {
        const { message, hasFieldErrors } = applyServerErrors(response);
        if (!hasFieldErrors) {
          toast.error(message);
        }
        return;
      }

      setFormErrors({});
      toast.success("Banner created successfully");
      if (onBannerCreated) {
        onBannerCreated(response.data?.banner);
      }
      if (onBack) {
        onBack();
      }
    } catch (error) {
      toast.error(error.message || "Failed to create banner");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActionField = () => {
    if (form.actionType === "URL") {
      return (
        <input
          type="url"
          name="targetUrl"
          placeholder="https://example.com/promo"
          value={form.targetUrl}
          onChange={handleChange}
          className={inputClass}
        />
      );
    }

    if (form.actionType === "NONE") {
      return (
        <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
          This banner will only display in the app and will not open any destination.
        </p>
      );
    }

    return (
      <select
        name="actionId"
        value={form.actionId}
        onChange={handleChange}
        className={inputClass}
      >
        <option value="">
          Select {form.actionType === "CATEGORY" ? "category" : "product"}
        </option>
        {actionTargets.map((item) => (
          <option key={item._id} value={item._id}>
            {item.name || item.title || "Untitled"}
          </option>
        ))}
      </select>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">
        Loading banner references...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Create storefront banner</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a banner, choose where it should open, and control when it appears in
          the app.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Content</h3>
            <div className="space-y-4">
              <input
                type="text"
                name="title"
                placeholder="Summer kitchen essentials"
                value={form.title}
                onChange={handleChange}
                className={inputClass}
              />
              {formErrors.title && (
                <p className="text-xs text-rose-600">{formErrors.title}</p>
              )}
              <input
                type="text"
                name="subtitle"
                placeholder="Bulk deals for restaurants"
                value={form.subtitle}
                onChange={handleChange}
                className={inputClass}
              />
              <textarea
                name="description"
                placeholder="Optional banner supporting copy"
                value={form.description}
                onChange={handleChange}
                className={`${inputClass} min-h-28`}
              />
              {formErrors.form && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {formErrors.form}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">CTA and schedule</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <select
                  name="actionType"
                  value={form.actionType}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">{renderActionField()}</div>
              {formErrors.actionId && (
                <p className="md:col-span-2 -mt-2 text-xs text-rose-600">
                  {formErrors.actionId}
                </p>
              )}
              {formErrors.targetUrl && (
                <p className="md:col-span-2 -mt-2 text-xs text-rose-600">
                  {formErrors.targetUrl}
                </p>
              )}

              <input
                type="number"
                min="0"
                name="displayOrder"
                value={form.displayOrder}
                onChange={handleChange}
                className={inputClass}
                placeholder="Display priority"
              />

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                Active banner
              </label>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Starts at
                </label>
                <input
                  type="datetime-local"
                  name="startsAt"
                  value={form.startsAt}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Ends at
                </label>
                <input
                  type="datetime-local"
                  name="endsAt"
                  value={form.endsAt}
                  onChange={handleChange}
                  className={inputClass}
                />
                {formErrors.endsAt && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.endsAt}</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Media</h3>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700`}
            />
            <p className="mt-2 text-xs text-slate-400">
              Upload one JPG, PNG, or WEBP image up to {MAX_BANNER_IMAGE_SIZE_MB}MB. This is the exact banner shown in the app.
            </p>
            {formErrors.images && (
              <p className="mt-2 text-xs text-rose-600">{formErrors.images}</p>
            )}

            {imagePreview ? (
              <div className="mt-4 relative overflow-hidden rounded-2xl border border-slate-200">
                <img src={imagePreview} alt="Banner preview" className="h-40 w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Preview
                </span>
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-rose-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No image selected yet.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <LocationTargetingPicker
              value={targeting}
              onChange={setTargeting}
              role={user?.role}
              description="This banner only appears for customers in the selected locations. Leave empty for all cities (super admin only)."
            />
          </section>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {isSubmitting ? "Creating..." : "Create banner"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddBanner;
