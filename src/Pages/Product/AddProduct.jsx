import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Trash2,
  Sparkles,
  FileSpreadsheet,
  Upload,
  Eye,
  Download,
  ArrowUp,
  ArrowDown,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import {
  fetchCategories,
  createProduct,
  bulkImportProducts,
} from "../../Api";

const createVarietyId = () =>
  `variety-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyVariety = () => ({
  id: createVarietyId(),
  name: "",
  originalPrice: "",
  discountedPrice: "",
  isAvailable: true,
});

const createInitialForm = () => ({
  name: "",
  category: "",
  status: "available",
  description: "",
  brand: "",
  sku: "",
  upc: "",
  hsnCode: "",
  unit: "pcs",
  packSizeLabel: "",
  stock: "",
  stockQuantity: "0",
  minOrderQuantity: "1",
  shelfLifeDays: "0",
  storageType: "ambient",
  isFeatured: false,
  isBestseller: false,
  seedRatingAverage: "0",
  seedRatingCount: "0",
  purchaseCount: "0",
  displayOrder: "0",
  badgesText: "",
});

const sectionTitleClass = "text-sm font-semibold text-slate-800";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const unitOptions = [
  "kg",
  "g",
  "l",
  "ml",
  "pcs",
  "packs",
  "boxes",
  "jars",
  "bottles",
  "cans",
];
const storageOptions = [
  { value: "ambient", label: "Ambient" },
  { value: "dry", label: "Dry storage" },
  { value: "chilled", label: "Chilled" },
  { value: "frozen", label: "Frozen" },
];
const MAX_PRODUCT_IMAGES = 5;
const UPLOAD_REFERENCE_PREFIX = "__UPLOAD_";

const bulkTemplateRows = [
  {
    name: "Mozzarella Cheese Block",
    description:
      "Low-moisture mozzarella block suitable for pizzas, sandwiches, and baked applications.",
    brand: "Amul",
    sku: "CHEESE-001",
    upc: "8901234567890",
    hsnCode: "04061000",
    category: "DAIRY",
    unit: "kg",
    packSizeLabel: "1 kg block",
    minOrderQuantity: 2,
    stockQuantity: 120,
    stock: "Dispatch in 24 hrs",
    shelfLifeDays: 120,
    storageType: "chilled",
    status: "available",
    isActive: true,
    isFeatured: true,
    isBestseller: true,
    ratingAverage: 4.7,
    ratingCount: 23,
    seedRatingAverage: 4.7,
    seedRatingCount: 23,
    userRatingAverage: 4.8,
    userRatingCount: 12,
    userRatingTotal: 57.6,
    purchaseCount: 310,
    displayOrder: 1,
    badges: "Pizza essential,High melt",
    primaryImage: "https://example.com/images/mozzarella-main.jpg",
    images:
      "https://example.com/images/mozzarella-main.jpg,https://example.com/images/mozzarella-pack.jpg",
    variety1_name: "1 kg block",
    variety1_originalPrice: 420,
    variety1_discountedPrice: 385,
    variety1_isAvailable: true,
    variety2_name: "5 kg block",
    variety2_originalPrice: 2050,
    variety2_discountedPrice: 1925,
    variety2_isAvailable: true,
    variety3_name: "",
    variety3_originalPrice: "",
    variety3_discountedPrice: "",
    variety3_isAvailable: "",
  },
];

const parseDelimitedString = (value) =>
  value
    ?.toString()
    .split(/[\n|,]/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const getUploadReference = (index) => `${UPLOAD_REFERENCE_PREFIX}${index}__`;

const moveItem = (items, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= items.length) return items;
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const buildImageItem = (file) => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
  file,
  url: URL.createObjectURL(file),
});

const extractBulkVarieties = (row) => {
  const indexes = [...new Set(
    Object.keys(row)
      .map((key) => {
        const match = key.match(/^variety(\d+)_/i);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => Number.isInteger(value) && value > 0)
  )].sort((left, right) => left - right);

  return indexes
    .map((index) => ({
      name: row[`variety${index}_name`]?.toString().trim() ?? "",
      originalPrice: row[`variety${index}_originalPrice`],
      discountedPrice: row[`variety${index}_discountedPrice`],
      isAvailable:
        row[`variety${index}_isAvailable`] === ""
          ? true
          : ["true", "1", "yes"].includes(
              String(row[`variety${index}_isAvailable`]).trim().toLowerCase()
            ),
    }))
    .filter(
      (variety) =>
        variety.name &&
        variety.originalPrice !== "" &&
        variety.discountedPrice !== ""
    )
    .map((variety) => ({
      id: createVarietyId(),
      name: variety.name,
      originalPrice: Number(variety.originalPrice),
      discountedPrice: Number(variety.discountedPrice),
      isAvailable: variety.isAvailable,
    }));
};

const normalizeBulkRow = (row) => {
  const varieties = extractBulkVarieties(row);

  return {
    name: row.name?.toString().trim() ?? "",
    description: row.description?.toString().trim() ?? "",
    brand: row.brand?.toString().trim() ?? "",
    sku: row.sku?.toString().trim() ?? "",
    upc: row.upc?.toString().trim() ?? "",
    hsnCode: row.hsnCode?.toString().trim() ?? "",
    category: row.category?.toString().trim() ?? "",
    unit: row.unit?.toString().trim() ?? "pcs",
    packSizeLabel: row.packSizeLabel?.toString().trim() ?? "",
    minOrderQuantity: Number(row.minOrderQuantity || 1),
    stockQuantity: Number(row.stockQuantity || 0),
    stock: row.stock?.toString().trim() ?? "",
    shelfLifeDays: Number(row.shelfLifeDays || 0),
    storageType: row.storageType?.toString().trim() ?? "ambient",
    status: row.status?.toString().trim() || "available",
    isActive:
      row.isActive === ""
        ? true
        : ["true", "1", "yes"].includes(String(row.isActive ?? "").trim().toLowerCase()),
    isFeatured: ["true", "1", "yes"].includes(
      String(row.isFeatured ?? "").trim().toLowerCase()
    ),
    isBestseller: ["true", "1", "yes"].includes(
      String(row.isBestseller ?? "").trim().toLowerCase()
    ),
    seedRatingAverage: Number((row.seedRatingAverage ?? row.ratingAverage) || 0),
    seedRatingCount: Number((row.seedRatingCount ?? row.ratingCount) || 0),
    userRatingAverage: Number(row.userRatingAverage || 0),
    userRatingCount: Number(row.userRatingCount || 0),
    userRatingTotal: row.userRatingTotal === "" ? "" : Number(row.userRatingTotal || 0),
    purchaseCount: Number(row.purchaseCount || 0),
    displayOrder: Number(row.displayOrder || 0),
    badges: parseDelimitedString(row.badges),
    primaryImage: row.primaryImage?.toString().trim() ?? "",
    images: parseDelimitedString(row.images),
    varieties,
  };
};

export default function AddProductPage() {
  const [mode, setMode] = useState("manual");
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [varieties, setVarieties] = useState([createEmptyVariety()]);
  const [images, setImages] = useState([]);
  const [primaryImageRef, setPrimaryImageRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [createMissingCategories, setCreateMissingCategories] = useState(true);

  const maxDesc = 500;

  const loadCategories = async () => {
    const res = await fetchCategories();
    if (res.ok) {
      setCategories(res.categories);
      return;
    }
    toast.error(res.message);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [images]);

  const badgesPreview = useMemo(
    () =>
      form.badgesText
        .split(",")
        .map((badge) => badge.trim())
        .filter(Boolean)
        .slice(0, 6),
    [form.badgesText]
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleVarietyChange = (index, field, value) => {
    setVarieties((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addVariety = () => {
    setVarieties((prev) => [...prev, createEmptyVariety()]);
  };

  const removeVariety = (index) => {
    setVarieties((prev) =>
      prev.length === 1
        ? prev
        : prev.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(
      (file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024
    );

    if (validFiles.length !== files.length) {
      toast.error("Only image files up to 5MB are allowed");
    }

    setImages((prev) => {
      const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - prev.length);
      const acceptedFiles = validFiles.slice(0, remainingSlots);

      if (validFiles.length > remainingSlots) {
        toast.error(`You can upload up to ${MAX_PRODUCT_IMAGES} product images`);
      }

      const mapped = acceptedFiles.map(buildImageItem);
      const nextImages = [...prev, ...mapped];

      setPrimaryImageRef((currentPrimaryImageRef) =>
        currentPrimaryImageRef || (mapped[0] ? mapped[0].id : nextImages[0]?.id || "")
      );

      return nextImages;
    });

    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const next = [...prev];
      const removedImage = next[index];
      if (removedImage?.url) {
        URL.revokeObjectURL(removedImage.url);
      }
      next.splice(index, 1);
      setPrimaryImageRef((currentPrimaryImageRef) =>
        currentPrimaryImageRef === removedImage?.id ? next[0]?.id || "" : currentPrimaryImageRef
      );
      return next;
    });
  };

  const moveImage = (index, direction) => {
    setImages((prev) => moveItem(prev, index, index + direction));
  };

  const setPrimaryImage = (imageId) => {
    setPrimaryImageRef(imageId);
  };

  const getValidVarieties = () =>
    varieties
      .filter(
        (variety) =>
          variety.name.trim() &&
          variety.originalPrice !== "" &&
          variety.discountedPrice !== ""
      )
      .map((variety) => ({
        name: variety.name.trim(),
        originalPrice: Number(variety.originalPrice),
        discountedPrice: Number(variety.discountedPrice),
        isAvailable: variety.isAvailable ?? true,
      }));

  const validateForm = () => {
    if (!form.name.trim()) return "Product name is required";
    if (!form.category) return "Category is required";

    const validVarieties = getValidVarieties();
    if (validVarieties.length === 0) {
      return "Add at least one valid variety";
    }

    const invalidVariety = validVarieties.find(
      (variety) =>
        variety.originalPrice <= 0 ||
        variety.discountedPrice <= 0 ||
        variety.discountedPrice > variety.originalPrice
    );
    if (invalidVariety) {
      return `Check prices for ${invalidVariety.name}. Discounted price must be positive and not exceed original price.`;
    }

    if (Number(form.seedRatingAverage) < 0 || Number(form.seedRatingAverage) > 5) {
      return "Seed rating average must be between 0 and 5";
    }

    if (
      Number(form.seedRatingCount) < 0 ||
      Number(form.purchaseCount) < 0 ||
      Number(form.stockQuantity) < 0 ||
      Number(form.displayOrder) < 0 ||
      Number(form.minOrderQuantity) <= 0 ||
      Number(form.shelfLifeDays) < 0
    ) {
      return "Numeric merchandising fields cannot be negative";
    }

    if (form.sku.trim() && !/^[A-Za-z0-9_-]{3,40}$/.test(form.sku.trim())) {
      return "SKU must be 3-40 characters and use letters, numbers, _ or -";
    }

    if (form.upc.trim() && !/^[A-Za-z0-9_-]{3,40}$/.test(form.upc.trim())) {
      return "UPC must be 3-40 characters and use letters, numbers, _ or -";
    }

    if (form.hsnCode.trim() && !/^[0-9]{4,8}$/.test(form.hsnCode.trim())) {
      return "HSN code must be 4 to 8 digits";
    }

    return null;
  };

  const resetForm = () => {
    images.forEach((image) => URL.revokeObjectURL(image.url));
    setForm(createInitialForm());
    setVarieties([createEmptyVariety()]);
    setImages([]);
    setPrimaryImageRef("");
  };

  const resetBulkState = () => {
    setBulkRows([]);
    setBulkFileName("");
    setBulkPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setMessage({ type: "error", text: validationMessage });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("category", form.category);
      formData.append("status", form.status);
      formData.append("description", form.description.trim());
      formData.append("brand", form.brand.trim());
      formData.append("sku", form.sku.trim().toUpperCase());
      formData.append("upc", form.upc.trim().toUpperCase());
      formData.append("hsnCode", form.hsnCode.trim());
      formData.append("unit", form.unit);
      formData.append("packSizeLabel", form.packSizeLabel.trim());
      formData.append("stock", form.stock.trim());
      formData.append("stockQuantity", String(Number(form.stockQuantity) || 0));
      formData.append(
        "minOrderQuantity",
        String(Math.max(1, Number(form.minOrderQuantity) || 1))
      );
      formData.append("shelfLifeDays", String(Number(form.shelfLifeDays) || 0));
      formData.append("storageType", form.storageType);
      formData.append("isFeatured", String(form.isFeatured));
      formData.append("isBestseller", String(form.isBestseller));
      formData.append(
        "seedRatingAverage",
        String(Number(form.seedRatingAverage) || 0)
      );
      formData.append(
        "seedRatingCount",
        String(Number(form.seedRatingCount) || 0)
      );
      formData.append("purchaseCount", String(Number(form.purchaseCount) || 0));
      formData.append("displayOrder", String(Number(form.displayOrder) || 0));
      formData.append("badges", JSON.stringify(badgesPreview));
      formData.append("varieties", JSON.stringify(getValidVarieties()));
      formData.append(
        "imageOrder",
        JSON.stringify(images.map((image, index) => getUploadReference(index)))
      );
      if (primaryImageRef) {
        const primaryIndex = images.findIndex((image) => image.id === primaryImageRef);
        if (primaryIndex >= 0) {
          formData.append("primaryImage", getUploadReference(primaryIndex));
        }
      }

      images.forEach((image) => {
        formData.append("images", image.file);
      });

      const res = await createProduct(formData);
      if (!res.ok) throw new Error(res.message);

      toast.success("Product created successfully");
      setMessage({ type: "success", text: "Product added successfully" });
      resetForm();
    } catch (error) {
      toast.error(error.message || "Server error");
      setMessage({ type: "error", text: error.message || "Server error" });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(bulkTemplateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "restaurant-supply-product-template.xlsx");
  };

  const handleBulkFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      const nextRows = rawRows.map(normalizeBulkRow);

      if (nextRows.length === 0) {
        toast.error("No product rows found in the file");
        return;
      }

      setBulkRows(nextRows);
      setBulkFileName(file.name);
      setBulkPreview(null);
      toast.success(`${nextRows.length} rows parsed from CSV`);
    } catch {
      toast.error("Unable to read the CSV/XLSX file");
    } finally {
      event.target.value = "";
    }
  };

  const handleBulkPreview = async () => {
    if (bulkRows.length === 0) {
      toast.error("Upload a CSV file first");
      return;
    }

    setBulkLoading(true);
    try {
      const res = await bulkImportProducts({
        rows: bulkRows,
        dryRun: true,
        createMissingCategories,
      });

      if (!res.ok) {
        throw new Error(res.message);
      }

      setBulkPreview(res.data);
      toast.success("Preview generated");
    } catch (error) {
      toast.error(error.message || "Unable to validate CSV");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkPreview) {
      toast.error("Run preview before importing");
      return;
    }
    if (bulkPreview.summary?.failedRows > 0) {
      toast.error("Fix validation errors before importing");
      return;
    }

    setBulkImporting(true);
    try {
      const res = await bulkImportProducts({
        rows: bulkRows,
        dryRun: false,
        createMissingCategories,
      });

      if (!res.ok) {
        const fallbackMessage = res.data?.message || res.message;
        throw new Error(fallbackMessage);
      }

      toast.success(res.data?.message || "Products imported successfully");
      resetBulkState();
    } catch (error) {
      toast.error(error.message || "Bulk import failed");
    } finally {
      setBulkImporting(false);
    }
  };

  const renderManualForm = () => (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Core details</h2>
              <p className="text-sm text-slate-500">
                Product basics shown throughout the marketplace.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={sectionTitleClass}>Product name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Mozzarella cheese block"
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label className={sectionTitleClass}>Brand</label>
              <input
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="Amul, Veeba, Del Monte"
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label className={sectionTitleClass}>SKU</label>
              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                placeholder="CHEESE-001"
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label className={sectionTitleClass}>UPC / barcode</label>
              <input
                name="upc"
                value={form.upc}
                onChange={handleChange}
                placeholder="8901234567890"
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label className={sectionTitleClass}>HSN / SAC code</label>
              <input
                name="hsnCode"
                value={form.hsnCode}
                onChange={handleChange}
                placeholder="04061000"
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label className={sectionTitleClass}>Category</label>
              <div className="mt-1.5 flex gap-3">
                <select
                  value={form.category}
                  onChange={handleChange}
                  name="category"
                  className={inputClass}
                >
                  <option value="">Select category</option>
                  {categories
                    .filter((category) => category.isActive !== false)
                    .map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                </select>
                <Link
                  to="/product/categories"
                  className="inline-flex items-center rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Manage
                </Link>
              </div>
            </div>

            <div>
              <label className={sectionTitleClass}>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={`${inputClass} mt-1.5`}
              >
                <option value="available">Available</option>
                <option value="not available">Not available</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={sectionTitleClass}>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={maxDesc}
                placeholder="Describe usage, ingredient quality, pack handling, and restaurant use cases."
                className={`${inputClass} mt-1.5 min-h-28`}
              />
              <div className="mt-1 text-right text-xs text-slate-400">
                {form.description.length}/{maxDesc}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pricing and variants</h2>
              <p className="text-sm text-slate-500">
                Add wholesale pack options like 500 g, 1 kg, 5 L, or carton packs.
              </p>
            </div>
            <button
              type="button"
              onClick={addVariety}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add variety
            </button>
          </div>

          <div className="space-y-3">
            {varieties.map((variety, index) => (
              <div
                key={variety.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    Variety {index + 1}
                  </span>
                  <button
                    type="button"
                    disabled={varieties.length === 1}
                    onClick={() => removeVariety(index)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    placeholder="Pack option"
                    value={variety.name}
                    onChange={(e) =>
                      handleVarietyChange(index, "name", e.target.value)
                    }
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Original price"
                    value={variety.originalPrice}
                    onChange={(e) =>
                      handleVarietyChange(index, "originalPrice", e.target.value)
                    }
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Discounted price"
                    value={variety.discountedPrice}
                    onChange={(e) =>
                      handleVarietyChange(index, "discountedPrice", e.target.value)
                    }
                    className={inputClass}
                  />
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={variety.isAvailable}
                      onChange={(e) =>
                        handleVarietyChange(index, "isAvailable", e.target.checked)
                      }
                    />
                    Available
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Merchandising</h2>
          <p className="mb-4 text-sm text-slate-500">
            These fields power discovery, badges, ranking, and home page emphasis.
          </p>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={form.isFeatured}
                  onChange={handleChange}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="isBestseller"
                  checked={form.isBestseller}
                  onChange={handleChange}
                />
                Bestseller
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={sectionTitleClass}>Manual seed rating</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  name="seedRatingAverage"
                  value={form.seedRatingAverage}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={sectionTitleClass}>Manual seed count</label>
                <input
                  type="number"
                  min="0"
                  name="seedRatingCount"
                  value={form.seedRatingCount}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={sectionTitleClass}>Purchase count</label>
                <input
                  type="number"
                  min="0"
                  name="purchaseCount"
                  value={form.purchaseCount}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={sectionTitleClass}>Display order</label>
                <input
                  type="number"
                  min="0"
                  name="displayOrder"
                  value={form.displayOrder}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
            </div>

            <div>
              <label className={sectionTitleClass}>Badges</label>
              <input
                name="badgesText"
                value={form.badgesText}
                onChange={handleChange}
                placeholder="Pizza essential, High melt, Restaurant favourite"
                className={`${inputClass} mt-1.5`}
              />
              {badgesPreview.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {badgesPreview.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
              Manual seed ratings are preserved and combined with real user reviews in the app.
              New customer reviews will increase the live rating automatically.
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Inventory and media</h2>
          <p className="mb-4 text-sm text-slate-500">
            Capture wholesale supply details that restaurants care about while ordering.
          </p>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={sectionTitleClass}>Unit</label>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={sectionTitleClass}>Pack size label</label>
                <input
                  name="packSizeLabel"
                  value={form.packSizeLabel}
                  onChange={handleChange}
                  placeholder="1 kg block / 24 x 200 ml"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={sectionTitleClass}>Min order quantity</label>
                <input
                  type="number"
                  min="1"
                  name="minOrderQuantity"
                  value={form.minOrderQuantity}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={sectionTitleClass}>Storage type</label>
                <select
                  name="storageType"
                  value={form.storageType}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                >
                  {storageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={sectionTitleClass}>Shelf life (days)</label>
                <input
                  type="number"
                  min="0"
                  name="shelfLifeDays"
                  value={form.shelfLifeDays}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={sectionTitleClass}>Stock quantity</label>
                <input
                  type="number"
                  min="0"
                  name="stockQuantity"
                  value={form.stockQuantity}
                  onChange={handleChange}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={sectionTitleClass}>Stock note</label>
                <input
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                  placeholder="Dispatch in 24 hrs / Batch available"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
            </div>

            <div>
              <label className={sectionTitleClass}>Product images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFiles}
                className={`${inputClass} mt-1.5 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700`}
              />
              <p className="mt-2 text-xs text-slate-400">
                Upload up to 5 images. Set any image as primary and reorder the gallery before publishing.
                If you skip images, the system applies the default catalog image automatically.
              </p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="relative">
                      <img
                        src={image.url}
                        alt="preview"
                        className="h-28 w-full object-cover"
                      />
                      {primaryImageRef === image.id && (
                        <span className="absolute left-2 top-2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(image.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                          primaryImageRef === image.id
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Check size={12} />
                        {primaryImageRef === image.id ? "Primary" : "Set primary"}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={index === images.length - 1}
                          onClick={() => moveImage(index, 1)}
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Publish</h2>
            <p className="text-sm text-slate-300">
              Review everything and publish a supply-catalog-ready product.
            </p>
          </div>
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {loading ? "Creating product..." : "Create product"}
          </button>
          {message && (
            <p
              className={`mt-3 text-sm ${
                message.type === "error" ? "text-rose-300" : "text-emerald-300"
              }`}
            >
              {message.text}
            </p>
          )}
        </section>
      </div>
    </form>
  );

  const renderBulkSection = () => (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Bulk CSV import</h2>
            <p className="text-sm text-slate-500">
              Upload products with hosted image URLs. Preview and validate before import.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Download template
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">CSV or Excel upload</h3>
              <p className="text-sm text-slate-500">
                Supported: `.csv`, `.xlsx`. If image URLs are provided, they must be public
                `http/https` URLs. Missing images use the default product image.
              </p>
            </div>
          </div>

          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleBulkFile}
            className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700`}
          />

          {bulkFileName && (
            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <div className="font-semibold">{bulkFileName}</div>
              <div className="mt-1 text-slate-500">{bulkRows.length} rows parsed</div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBulkPreview}
              disabled={bulkLoading || bulkRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Eye size={16} />
              {bulkLoading ? "Validating..." : "Preview import"}
            </button>
            <button
              type="button"
              onClick={handleBulkImport}
              disabled={
                bulkImporting ||
                !bulkPreview ||
                bulkPreview.summary?.failedRows > 0
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              <Upload size={16} />
              {bulkImporting ? "Importing..." : "Import products"}
            </button>
            <button
              type="button"
              onClick={resetBulkState}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={createMissingCategories}
              onChange={(event) => setCreateMissingCategories(event.target.checked)}
            />
            Auto-create missing categories from CSV during preview/import
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <div className="font-semibold">Required CSV columns</div>
          <div className="mt-2 leading-6">
            `name`, `brand`, `sku`, `category`, `unit`, `packSizeLabel`,
            `minOrderQuantity`, `stockQuantity`, `storageType`, `status`, and at least one variety using
            `variety1_name`, `variety1_originalPrice`, `variety1_discountedPrice`.
          </div>
          <div className="mt-2 leading-6">
            Supported optional columns include `description`, `upc`, `hsnCode`, `stock`,
            `shelfLifeDays`, `isActive`, `isFeatured`, `isBestseller`, `ratingAverage`,
            `ratingCount`, `seedRatingAverage`, `seedRatingCount`, `userRatingAverage`,
            `userRatingCount`, `userRatingTotal`, `purchaseCount`, `displayOrder`, `badges`,
            `primaryImage`, `images`, plus additional variety columns like `variety2_*` and
            `variety3_*`. When images are omitted, products receive the default catalog image automatically.
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Preview summary</h2>
        <p className="mb-4 text-sm text-slate-500">
          The backend checks category matching, SKU uniqueness, image URLs, and variants.
        </p>

        {!bulkPreview ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
            Upload a file and run preview to see validation results here.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Total
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {bulkPreview.summary?.totalRows ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                  Valid
                </div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">
                  {bulkPreview.summary?.validRows ?? 0}
                </div>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4 text-center ring-1 ring-rose-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                  Failed
                </div>
                <div className="mt-1 text-2xl font-bold text-rose-700">
                  {bulkPreview.summary?.failedRows ?? 0}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-800 ring-1 ring-sky-200">
              Categories to create automatically: {bulkPreview.summary?.createdCategories ?? 0}
            </div>

            <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
              {bulkPreview.rows?.map((row) => (
                <div
                  key={`${row.rowNumber}-${row.sku}-${row.name}`}
                  className={`rounded-2xl p-4 ring-1 ${
                    row.errors?.length > 0
                      ? "bg-rose-50 ring-rose-200"
                      : "bg-emerald-50 ring-emerald-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Row {row.rowNumber}: {row.name || "Unnamed product"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        SKU: {row.sku || "—"} | Category: {row.categoryName || "—"} |
                        {row.categoryStatus === "will_create"
                          ? " New category will be created |"
                          : ""}{" "}
                        Varieties: {row.varietyCount || 0} | Images: {row.imageCount || 0}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        row.errors?.length > 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {row.errors?.length > 0 ? "Needs fixes" : "Ready"}
                    </span>
                  </div>

                  {row.errors?.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-rose-700">
                      {row.errors.map((error) => (
                        <li key={error}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            <Sparkles size={14} />
            Production-ready catalog
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Add Products</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Create restaurant-supply products manually or upload them in bulk with CSV.
          </p>
        </div>

        <div className="mb-6 inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {[
            { value: "manual", label: "Manual add" },
            { value: "bulk", label: "Bulk CSV import" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === option.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "manual" ? renderManualForm() : renderBulkSection()}
      </div>
    </div>
  );
}
