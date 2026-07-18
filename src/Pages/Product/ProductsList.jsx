import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

import {
  fetchCategories,
  myProducts,
  updateProduct,
  deleteProduct,
  fetchProductReviewsAdmin,
  updateProductReviewStatus,
  fetchSubCategories,
  exportProducts
} from "../../Api";
import { PUBLIC_PRODUCT_DEFAULT_IMAGE_URL } from "../../utils/publicAssets";
import ProductSectionTabs from "./ProductSectionTabs";

const createVarietyId = () =>
  `variety-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyVariety = () => ({
  id: createVarietyId(),
  name: "",
  originalPrice: "",
  discountedPrice: "",
  isAvailable: true,
});

const toSafeArray = (value) => (Array.isArray(value) ? value : []);
const formatCurrency = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(numericValue)
    : "—";
};
const getProductCategoryId = (product = {}) =>
  typeof product.category === "object"
    ? product.category?._id ?? ""
    : product.category?.toString() ?? "";
const getProductCategoryName = (product = {}, categoryNameById = {}) =>
  typeof product.category === "object"
    ? product.category?.name ?? "—"
    : categoryNameById[product.category] ?? "—";

const getProductSubCategoryId = (product = {}) =>
  typeof product.subcategory === "object"
    ? product.subcategory?._id ?? ""
    : product.subcategory?.toString() ?? "";

const getSubCategoryParentId = (subCategory = {}) =>
  typeof subCategory.category === "object"
    ? subCategory.category?._id ?? ""
    : subCategory.category?.toString() ?? "";
const getProductsFromResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
const getProductFromResponse = (payload) =>
  payload?.product ?? payload?.data?.product ?? null;
const LEGACY_PRODUCT_IMAGE_URL =
  "https://via.placeholder.com/600x600?text=Hungzo+Product";
const DEFAULT_PRODUCT_IMAGE_URL = PUBLIC_PRODUCT_DEFAULT_IMAGE_URL;
const isDefaultProductImage = (value = "") =>
  value === DEFAULT_PRODUCT_IMAGE_URL || value === LEGACY_PRODUCT_IMAGE_URL;
const extractImageUrl = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    return value.map(extractImageUrl).find(Boolean) ?? "";
  }

  if (typeof value === "object") {
    return [
      value.url,
      value.location,
      value.src,
      value.href,
      value.secure_url,
      value.imageUrl,
      value.image,
      value.primaryImage,
    ]
      .map(extractImageUrl)
      .find(Boolean) ?? "";
  }

  return "";
};
const getProductPrimaryImage = (product = {}) => {
  const primaryImage = extractImageUrl(product.primaryImage);
  if (primaryImage && primaryImage !== LEGACY_PRODUCT_IMAGE_URL) return primaryImage;

  return toSafeArray(product.images)
    .map(extractImageUrl)
    .filter((image) => image !== LEGACY_PRODUCT_IMAGE_URL)
    .find(Boolean) ?? DEFAULT_PRODUCT_IMAGE_URL;
};
const getAvailableVarieties = (product = {}) =>
  toSafeArray(product.varieties).filter((variety) => variety?.isAvailable !== false);
const getPriceSummary = (product = {}) => {
  const startingPrice = Number(product.startingPrice);
  const originalPrice = Number(product.originalPrice);
  return {
    startingPrice: Number.isFinite(startingPrice) ? startingPrice : null,
    originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
  };
};
const getLowStockState = (stockQuantity) => {
  const numericStock = Number(stockQuantity);
  if (!Number.isFinite(numericStock)) return false;
  return numericStock > 0 && numericStock <= 10;
};
const getNumericStock = (stockQuantity) => {
  const numericStock = Number(stockQuantity);
  return Number.isFinite(numericStock) ? numericStock : 0;
};
const getInventoryHealth = (product = {}) => {
  const stock = getNumericStock(product.stockQuantity);
  const unavailable = product.status !== "available";

  if (stock <= 0) {
    return {
      key: "out",
      label: "Out of stock",
      tone: "bg-rose-100 text-rose-700",
      border: "border-rose-200",
    };
  }

  if (getLowStockState(stock)) {
    return {
      key: "low",
      label: "Low stock",
      tone: "bg-amber-100 text-amber-700",
      border: "border-amber-200",
    };
  }

  if (unavailable) {
    return {
      key: "hidden",
      label: "Hidden",
      tone: "bg-slate-200 text-slate-700",
      border: "border-slate-200",
    };
  }

  return {
    key: "healthy",
    label: "Healthy",
    tone: "bg-emerald-100 text-emerald-700",
    border: "border-emerald-200",
  };
};
const getStorageTone = (storageType) => {
  switch (storageType) {
    case "frozen":
      return "bg-sky-100 text-sky-700";
    case "chilled":
      return "bg-cyan-100 text-cyan-700";
    case "dry":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const normalizeVarietyForForm = (variety = {}) => {
  const effectivePrice = variety.discountedPrice ?? variety.price ?? "";
  return {
    ...variety,
    id: variety.id ?? variety._id ?? createVarietyId(),
    name: variety.name ?? "",
    originalPrice: variety.originalPrice ?? variety.price ?? "",
    discountedPrice: effectivePrice,
    isAvailable: variety.isAvailable ?? true,
  };
};

const MAX_PRODUCT_IMAGES = 5;
const UPLOAD_REFERENCE_PREFIX = "__UPLOAD_";
const ALLOWED_PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PRODUCT_UPLOAD_TOTAL_BYTES = 8 * 1024 * 1024;

const getUploadReference = (index) => `${UPLOAD_REFERENCE_PREFIX}${index}__`;

const moveItem = (items, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= items.length) return items;
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const createSelectedImageItem = (file) => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
  file,
  previewUrl: URL.createObjectURL(file),
});

const normalizeProductImages = (product = {}) => {
  const images = toSafeArray(product.images)
    .map(extractImageUrl)
    .filter((image) => image !== LEGACY_PRODUCT_IMAGE_URL)
    .filter(Boolean);
  const primaryImage = extractImageUrl(product.primaryImage);

  if (
    primaryImage &&
    primaryImage !== LEGACY_PRODUCT_IMAGE_URL &&
    images.includes(primaryImage)
  ) {
    return [primaryImage, ...images.filter((image) => image !== primaryImage)];
  }

  return images;
};

const getEditableProductImages = (product = {}, selectedImages = []) => {
  const images = normalizeProductImages(product);
  const realImages = images.filter((image) => !isDefaultProductImage(image));
  const primaryImage = extractImageUrl(product.primaryImage);

  if (realImages.length > 0) {
    if (
      primaryImage &&
      !isDefaultProductImage(primaryImage) &&
      realImages.includes(primaryImage)
    ) {
      return [primaryImage, ...realImages.filter((image) => image !== primaryImage)];
    }

    return realImages;
  }

  if (selectedImages.length > 0) {
    return [];
  }

  return images.length > 0 ? images : [DEFAULT_PRODUCT_IMAGE_URL];
};

const getEditableImageCount = (product = {}, selectedImages = []) =>
  normalizeProductImages(product).filter((image) => !isDefaultProductImage(image)).length +
  selectedImages.length;

const normalizeProductForEdit = (product) => ({
  ...product,
  category: getProductCategoryId(product),
  subcategory: getProductSubCategoryId(product),
  description: product.description ?? "",
  name: product.name ?? "",
  brand: product.brand ?? "",
  sku: product.sku ?? "",
  upc: product.upc ?? "",
  hsnCode: product.hsnCode ?? "",
  status: product.status ?? "available",
  unit: product.unit ?? "pcs",
  packSizeLabel: product.packSizeLabel ?? "",
  stock: product.stock ?? "",
  stockQuantity: String(product.stockQuantity ?? 0),
  minOrderQuantity: String(product.minOrderQuantity ?? 1),
  shelfLifeDays: String(product.shelfLifeDays ?? 0),
  storageType: product.storageType ?? "ambient",
  seedRatingAverage: String(
    product.seedRatingAverage ?? product.ratingAverage ?? product.rating ?? 0
  ),
  seedRatingCount: String(product.seedRatingCount ?? product.ratingCount ?? 0),
  purchaseCount: String(product.purchaseCount ?? 0),
  displayOrder: String(product.displayOrder ?? 0),
  badgesText: Array.isArray(product.badges) ? product.badges.join(", ") : "",
  images: normalizeProductImages(product),
  primaryImage: getProductPrimaryImage(product),
  varieties:
    toSafeArray(product.varieties).length > 0
      ? toSafeArray(product.varieties).map(normalizeVarietyForForm)
      : [createEmptyVariety()],
});

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const unitOptions = ["kg", "g", "l", "ml", "pcs", "packs", "boxes", "jars", "bottles", "cans"];
const storageOptions = [
  { value: "ambient", label: "Ambient" },
  { value: "dry", label: "Dry storage" },
  { value: "chilled", label: "Chilled" },
  { value: "frozen", label: "Frozen" },
];
const INVENTORY_PAGE_SIZE = 10;

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subCategoryFilter, setsubCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [merchandisingFilter, setMerchandisingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("attention");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: INVENTORY_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [productStats, setProductStats] = useState({
    total: 0,
    featured: 0,
    available: 0,
    lowStock: 0,
    outOfStock: 0,
    hidden: 0,
    unitsOnHand: 0,
  });
  const [inventoryPanels, setInventoryPanels] = useState({
    attentionItems: [],
    hiddenItems: [],
    topMovers: [],
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageSelectionError, setImageSelectionError] = useState("");
  const [statusLoading, setStatusLoading] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [productReviews, setProductReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStatusLoading, setReviewStatusLoading] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const previousFilterKeyRef = useRef("");

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadSubCategories();
  }, []);

  useEffect(() => {
    const filterKey = JSON.stringify({
      search,
      categoryFilter,
      subCategoryFilter,
      stockFilter,
      merchandisingFilter,
      sortBy,
    });

    if (
      previousFilterKeyRef.current &&
      previousFilterKeyRef.current !== filterKey &&
      currentPage !== 1
    ) {
      previousFilterKeyRef.current = filterKey;
      setCurrentPage(1);
      return;
    }

    previousFilterKeyRef.current = filterKey;
    loadProducts();
  }, [currentPage, search, categoryFilter, subCategoryFilter, stockFilter, merchandisingFilter, sortBy]);

  useEffect(() => {
    return () => {
      selectedImages.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [selectedImages]);

  const loadCategories = async () => {
    const res = await fetchCategories();
    if (res?.ok) {
      setCategories(res.categories || []);
    }
  };

  const loadSubCategories = async () => {
    const res = await fetchSubCategories();
    if (res?.ok) {
      setSubCategories(res.subcategories || []);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    setProductsError("");
    const res = await myProducts({
      page: currentPage,
      limit: INVENTORY_PAGE_SIZE,
      search,
      categoryId: categoryFilter,
      subcategoryId: subCategoryFilter,
      stockFilter,
      merchandisingFilter,
      sortBy,
    });
    if (res?.ok) {
      setProducts(getProductsFromResponse(res.data));
      setPagination(
        res.data?.pagination || {
          page: 1,
          limit: INVENTORY_PAGE_SIZE,
          total: 0,
          totalPages: 1,
          hasPrev: false,
          hasNext: false,
        }
      );
      setProductStats(
        res.data?.summary || {
          total: 0,
          featured: 0,
          available: 0,
          lowStock: 0,
          outOfStock: 0,
          hidden: 0,
          unitsOnHand: 0,
        }
      );
      setInventoryPanels(
        res.data?.panels || {
          attentionItems: [],
          hiddenItems: [],
          topMovers: [],
        }
      );
      setProductsLoading(false);
      return;
    }
    setProducts([]);
    setPagination({
      page: 1,
      limit: INVENTORY_PAGE_SIZE,
      total: 0,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
    });
    setProductsLoading(false);
    setProductsError(res?.message || "Failed to load products");
    toast.error("Failed to load products");
  };

  const categoryNameById = useMemo(
    () =>
      categories.reduce((accumulator, category) => {
        accumulator[category._id] = category.name;
        return accumulator;
      }, {}),
    [categories]
  );

  const filterSubCategories = useMemo(
    () =>
      categoryFilter === "all"
        ? subCategories
        : subCategories.filter(
          (sub) => getSubCategoryParentId(sub) === categoryFilter
        ),
    [subCategories, categoryFilter]
  );

  const editSubCategories = useMemo(
    () =>
      editingProduct?.category
        ? subCategories.filter(
          (sub) => getSubCategoryParentId(sub) === editingProduct.category
        )
        : [],
    [subCategories, editingProduct?.category]
  );

  useEffect(() => {
    setsubCategoryFilter("all");
  }, [categoryFilter]);

  const filteredProducts = products;

  const visiblePageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages || 1;
    const maxButtons = 4;
    const start = Math.max(
      1,
      Math.min(currentPage - 1, totalPages - maxButtons + 1)
    );
    const end = Math.min(totalPages, start + maxButtons - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, pagination.totalPages]);

  const updateStatus = async (id, status) => {
    setStatusLoading(id);
    try {
      const formData = new FormData();
      formData.append("status", status);
      const response = await updateProduct(id, formData);
      if (!response.ok) {
        throw new Error(response.message);
      }

      await loadProducts();
      toast.success("Status updated");
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setStatusLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product permanently?")) return;

    try {
      const res = await deleteProduct(id);
      if (!res?.ok) {
        throw new Error(res?.message || "Delete failed");
      }
      await loadProducts();
      toast.success("Product deleted permanently");
    } catch (error) {
      toast.error(error.message || "Delete failed");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(normalizeProductForEdit(product));
    setImageSelectionError("");
    setSelectedImages((prev) => {
      prev.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      return [];
    });
    setProductReviews([]);
    loadProductReviews(product._id);
  };

  const closeEditModal = () => {
    setSelectedImages((prev) => {
      prev.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      return [];
    });
    setImageSelectionError("");
    setEditingProduct(null);
    setProductReviews([]);
  };

  const loadProductReviews = async (productId) => {
    setReviewsLoading(true);
    const response = await fetchProductReviewsAdmin(productId);
    if (response?.ok) {
      setProductReviews(response.data?.reviews || []);
    } else {
      setProductReviews([]);
      toast.error(response?.message || "Failed to load product reviews");
    }
    setReviewsLoading(false);
  };

  // const handleChange = (e) => {
  //   const { name, value, type, checked } = e.target;
  //   setEditingProduct((prev) => ({
  //     ...prev,
  //     [name]: type === "checkbox" ? checked : value,
  //   }));
  // };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingProduct((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "category" && value !== prev.category
        ? { subcategory: "" }
        : {}),
    }));
  };

  const handleExportProducts = async () => {
    setExportLoading(true);

    try {
      const params = {
        search,
        categoryId: categoryFilter,
        subcategoryId: subCategoryFilter,
        stockFilter,
        merchandisingFilter,
        sortBy,
      };

      const result = await exportProducts(params);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const blobUrl =
        window.URL.createObjectURL(result.blob);

      const a = document.createElement("a");

      a.href = blobUrl;

      const match =
        /filename="([^"]+)"/i.exec(
          result.contentDisposition
        );

      a.download =
        match?.[1] ||
        `products-export-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);

      toast.success("Products exported");
    } finally {
      setExportLoading(false);
    }
  };

  const handleVarietyChange = (index, field, value) => {
    setEditingProduct((prev) => {
      const nextVarieties = [...prev.varieties];
      nextVarieties[index] = { ...nextVarieties[index], [field]: value };
      return { ...prev, varieties: nextVarieties };
    });
  };

  const addVariety = () => {
    setEditingProduct((prev) => ({
      ...prev,
      varieties: [...prev.varieties, createEmptyVariety()],
    }));
  };

  const removeVariety = (index) => {
    setEditingProduct((prev) => {
      if (prev.varieties.length === 1) return prev;
      return {
        ...prev,
        varieties: prev.varieties.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const getValidVarieties = (varieties = []) =>
    varieties
      .filter(
        (variety) =>
          variety.name?.trim() &&
          variety.originalPrice !== "" &&
          variety.discountedPrice !== ""
      )
      .map((variety) => ({
        name: variety.name.trim(),
        originalPrice: Number(variety.originalPrice),
        discountedPrice: Number(variety.discountedPrice),
        isAvailable: variety.isAvailable ?? true,
      }));

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const nextErrors = [];
    const validFiles = files.filter(
      (file) => {
        const validType = ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type);
        const validSize = file.size <= MAX_PRODUCT_IMAGE_SIZE_BYTES;
        return validType && validSize;
      }
    );

    if (validFiles.length !== files.length) {
      nextErrors.push("Only JPG, PNG, or WEBP images up to 5MB are allowed.");
      toast.error("Only JPG, PNG, or WEBP images up to 5MB are allowed");
    }

    const currentImageCount = getEditableImageCount(editingProduct, selectedImages);
    const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - currentImageCount);
    const acceptedFiles = validFiles.slice(0, remainingSlots);

    if (validFiles.length > remainingSlots) {
      nextErrors.push(`You can upload up to ${MAX_PRODUCT_IMAGES} product images.`);
      toast.error(`You can upload up to ${MAX_PRODUCT_IMAGES} product images`);
    }

    const currentSelectedBytes = selectedImages.reduce(
      (total, image) => total + (image.file?.size || 0),
      0
    );
    let runningTotalBytes = currentSelectedBytes;
    const uploadableFiles = [];

    acceptedFiles.forEach((file) => {
      if (runningTotalBytes + file.size <= MAX_PRODUCT_UPLOAD_TOTAL_BYTES) {
        uploadableFiles.push(file);
        runningTotalBytes += file.size;
      }
    });

    if (uploadableFiles.length !== acceptedFiles.length) {
      nextErrors.push("Total new upload size cannot exceed 8MB per update.");
      toast.error("Total new upload size cannot exceed 8MB per update");
    }

    const nextFiles = uploadableFiles.map(createSelectedImageItem);

    setSelectedImages((prev) => {
      const combinedImages = [...prev, ...nextFiles];
      if (!editingProduct?.primaryImage && combinedImages[0]) {
        setEditingProduct((currentProduct) =>
          currentProduct
            ? { ...currentProduct, primaryImage: combinedImages[0].id }
            : currentProduct
        );
      }
      return combinedImages;
    });
    setImageSelectionError(nextErrors[0] || "");
    e.target.value = "";
  };

  const removeExistingImage = (imageToRemove) => {
    setEditingProduct((prev) => {
      if (!prev) return prev;
      const nextImages = prev.images.filter((image) => image !== imageToRemove);
      return {
        ...prev,
        images: nextImages,
        primaryImage:
          prev.primaryImage === imageToRemove
            ? nextImages[0] || selectedImages[0]?.id || ""
            : prev.primaryImage,
      };
    });
    setImageSelectionError("");
  };

  const removeSelectedImage = (imageId) => {
    setSelectedImages((prev) => {
      const imageToRemove = prev.find((image) => image.id === imageId);
      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      const nextImages = prev.filter((image) => image.id !== imageId);
      setEditingProduct((currentProduct) =>
        currentProduct
          ? {
            ...currentProduct,
            primaryImage:
              currentProduct.primaryImage === imageId
                ? currentProduct.images[0] || nextImages[0]?.id || ""
                : currentProduct.primaryImage,
          }
          : currentProduct
      );
      return nextImages;
    });
    setImageSelectionError("");
  };

  const moveExistingImage = (index, direction) => {
    setEditingProduct((prev) =>
      prev
        ? {
          ...prev,
          images: moveItem(prev.images, index, index + direction),
        }
        : prev
    );
  };

  const moveSelectedImage = (index, direction) => {
    setSelectedImages((prev) => moveItem(prev, index, index + direction));
  };

  const editableExistingImages = useMemo(
    () => getEditableProductImages(editingProduct || {}, selectedImages),
    [editingProduct, selectedImages]
  );

  const setPrimaryImage = (imageReference) => {
    setEditingProduct((prev) =>
      prev
        ? {
          ...prev,
          primaryImage: imageReference,
        }
        : prev
    );
  };

  const validateEditingProduct = () => {
    if (!editingProduct.name?.trim()) {
      return "Product name is required";
    }
    if (!editingProduct.category) {
      return "Category is required";
    }
    if (!editingProduct.subcategory) {
      return "SubCategory is required";
    }

    const validVarieties = getValidVarieties(editingProduct.varieties);
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

    if (
      Number(editingProduct.seedRatingAverage) < 0 ||
      Number(editingProduct.seedRatingAverage) > 5
    ) {
      return "Manual seed rating must be between 0 and 5";
    }

    if (
      Number(editingProduct.stockQuantity) < 0 ||
      Number(editingProduct.seedRatingCount) < 0 ||
      Number(editingProduct.purchaseCount) < 0 ||
      Number(editingProduct.displayOrder) < 0 ||
      Number(editingProduct.minOrderQuantity) <= 0 ||
      Number(editingProduct.shelfLifeDays) < 0
    ) {
      return "Numeric merchandising fields cannot be negative";
    }

    if (
      editingProduct.sku?.trim() &&
      !/^[A-Za-z0-9_-]{3,40}$/.test(editingProduct.sku.trim())
    ) {
      return "SKU must be 3-40 characters and use letters, numbers, _ or -";
    }

    if (
      editingProduct.upc?.trim() &&
      !/^[A-Za-z0-9_-]{3,40}$/.test(editingProduct.upc.trim())
    ) {
      return "UPC must be 3-40 characters and use letters, numbers, _ or -";
    }

    if (
      editingProduct.hsnCode?.trim() &&
      !/^[0-9]{4,8}$/.test(editingProduct.hsnCode.trim())
    ) {
      return "HSN code must be 4 to 8 digits";
    }

    return null;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const validationMessage = validateEditingProduct();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setUpdateLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", editingProduct.name.trim());
      formData.append("description", editingProduct.description?.trim() || "");
      formData.append("brand", editingProduct.brand?.trim() || "");
      formData.append("sku", editingProduct.sku?.trim().toUpperCase() || "");
      formData.append("upc", editingProduct.upc?.trim().toUpperCase() || "");
      formData.append("hsnCode", editingProduct.hsnCode?.trim() || "");
      formData.append("category", editingProduct.category);
      formData.append("subcategory", editingProduct.subcategory);
      formData.append("unit", editingProduct.unit || "pcs");
      formData.append("packSizeLabel", editingProduct.packSizeLabel?.trim() || "");
      formData.append("status", editingProduct.status);
      formData.append("stock", editingProduct.stock?.trim() || "");
      formData.append(
        "stockQuantity",
        String(Number(editingProduct.stockQuantity) || 0)
      );
      formData.append(
        "minOrderQuantity",
        String(Math.max(1, Number(editingProduct.minOrderQuantity) || 1))
      );
      formData.append(
        "shelfLifeDays",
        String(Number(editingProduct.shelfLifeDays) || 0)
      );
      formData.append("storageType", editingProduct.storageType || "ambient");
      formData.append("isFeatured", String(Boolean(editingProduct.isFeatured)));
      formData.append(
        "isBestseller",
        String(Boolean(editingProduct.isBestseller))
      );
      formData.append(
        "seedRatingAverage",
        String(Number(editingProduct.seedRatingAverage) || 0)
      );
      formData.append(
        "seedRatingCount",
        String(Number(editingProduct.seedRatingCount) || 0)
      );
      formData.append(
        "purchaseCount",
        String(Number(editingProduct.purchaseCount) || 0)
      );
      formData.append(
        "displayOrder",
        String(Number(editingProduct.displayOrder) || 0)
      );
      formData.append(
        "badges",
        JSON.stringify(
          (editingProduct.badgesText || "")
            .split(",")
            .map((badge) => badge.trim())
            .filter(Boolean)
            .slice(0, 6)
        )
      );

      const validVarieties = getValidVarieties(editingProduct.varieties);
      formData.append("varieties", JSON.stringify(validVarieties));
      formData.append(
        "retainImages",
        JSON.stringify(editableExistingImages)
      );

      const imageOrder = [
        ...editableExistingImages,
        ...selectedImages.map((_, index) => getUploadReference(index)),
      ];
      formData.append("imageOrder", JSON.stringify(imageOrder));

      if (editingProduct.primaryImage) {
        const selectedImageIndex = selectedImages.findIndex(
          (image) => image.id === editingProduct.primaryImage
        );
        formData.append(
          "primaryImage",
          selectedImageIndex >= 0
            ? getUploadReference(selectedImageIndex)
            : editingProduct.primaryImage
        );
      }

      selectedImages.forEach(({ file }) => {
        formData.append("images", file);
      });

      const response = await updateProduct(editingProduct._id, formData);
      if (!response.ok) {
        throw new Error(response.message || "Update failed");
      }

      const updatedProduct = getProductFromResponse(response.data);
      toast.success("Product updated");
      if (updatedProduct?._id) {
        await loadProducts();
      } else {
        await loadProducts();
      }
      setEditingProduct(null);
      setImageSelectionError("");
      setSelectedImages((prev) => {
        prev.forEach((image) => {
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
        });
        return [];
      });
      setProductReviews([]);
    } catch (error) {
      toast.error(error.message || "Update failed");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleReviewStatusToggle = async (reviewId, nextStatus) => {
    setReviewStatusLoading(reviewId);
    try {
      const response = await updateProductReviewStatus(reviewId, nextStatus);
      if (!response?.ok) {
        throw new Error(response?.message || "Failed to update review status");
      }

      setProductReviews((prev) =>
        prev.map((review) =>
          review._id === reviewId ? response.data?.review ?? review : review
        )
      );

      if (editingProduct?._id) {
        await loadProducts();
      }
      toast.success(response.data?.message || "Review status updated");
    } catch (error) {
      toast.error(error.message || "Failed to update review status");
    } finally {
      setReviewStatusLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">Inventory Panel</h1>
          <p className="max-w-4xl text-sm text-slate-600">
            Track stock health, review catalog readiness, surface products that need action,
            and update wholesale inventory from one operations-first workspace.
          </p>
        </div>

        <ProductSectionTabs />

        <section className="mb-5 rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white shadow-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
                <CubeIcon className="h-4 w-4" />
                Inventory control
              </div>
              <h2 className="mt-3 text-2xl font-semibold">
                Monitor live stock, assortment health, and product visibility.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Use filters to isolate stock risks, then edit products, hide unavailable listings,
                or jump into product creation and category maintenance.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadProducts}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Refresh inventory
              </button>
              <button
                type="button"
                onClick={handleExportProducts}
                disabled={exportLoading}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
              >
                {exportLoading ? "Exporting..." : "Export CSV"}
              </button>
              <Link
                to="/product/add"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Add product
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total SKUs
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{productStats.total}</div>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Units on hand
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {productStats.unitsOnHand}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Available
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {productStats.available}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Low stock
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700">
              {productStats.lowStock}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Out of stock
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {productStats.outOfStock}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Hidden listings
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-700">
              {productStats.hidden}
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900">Inventory filters</h3>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr),repeat(4,minmax(0,1fr))]">
            <label className="relative block">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product, brand, SKU, category, or badge..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={subCategoryFilter}
              onChange={(e) => setsubCategoryFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All subcategories</option>
              {filterSubCategories.map((subcategory) => (
                <option key={subcategory._id} value={subcategory._id}>
                  {subcategory.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All stock health</option>
              <option value="healthy">Healthy stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="hidden">Hidden listings</option>
            </select>

            <select
              value={merchandisingFilter}
              onChange={(e) => setMerchandisingFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All merchandising</option>
              <option value="featured">Featured only</option>
              <option value="bestseller">Bestseller only</option>
              <option value="available">Published only</option>
              <option value="hidden">Hidden only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={inputClass}
            >
              <option value="attention">Sort by attention</option>
              <option value="updated">Recently updated</option>
              <option value="stock_asc">Lowest stock first</option>
              <option value="stock_desc">Highest stock first</option>
              <option value="priority">Display priority</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr),360px]">
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Inventory catalog</h3>
                <p className="text-sm text-slate-500">
                  {filteredProducts.length} matching product
                  {filteredProducts.length === 1 ? "" : "s"} across your live catalog.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Live stock workspace
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-950 text-left text-sm text-white">
                  <tr>
                    <th className="px-4 py-4">Product</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Supply profile</th>
                    <th className="px-4 py-4">Commercial signals</th>
                    <th className="px-4 py-4">Stock health</th>
                    <th className="px-4 py-4">Visibility</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productsLoading && (
                    <tr>
                      <td colSpan="7" className="px-4 py-16 text-center text-sm text-slate-500">
                        Loading inventory...
                      </td>
                    </tr>
                  )}

                  {!productsLoading && productsError && (
                    <tr>
                      <td colSpan="7" className="px-4 py-16 text-center text-sm text-rose-500">
                        {productsError}
                      </td>
                    </tr>
                  )}

                  {!productsLoading &&
                    !productsError &&
                    filteredProducts.map((product) => {
                      const categoryName = getProductCategoryName(product, categoryNameById);
                      const primaryImage = getProductPrimaryImage(product);
                      const availableVarieties = getAvailableVarieties(product);
                      const priceSummary = getPriceSummary(product);
                      const varietyCount =
                        product.availableVarietyCount ?? availableVarieties.length ?? 0;
                      const topVarietyNames = availableVarieties
                        .slice(0, 2)
                        .map((variety) => variety.name)
                        .filter(Boolean);
                      const inventoryHealth = getInventoryHealth(product);

                      return (
                        <tr
                          key={product._id}
                          className="border-t border-slate-100 align-top hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-3">
                              {primaryImage ? (
                                <img
                                  src={primaryImage}
                                  alt={product.name}
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = DEFAULT_PRODUCT_IMAGE_URL;
                                  }}
                                  className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                                  <PhotoIcon className="h-6 w-6" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-900">{product.name}</p>
                                  {product.brand && (
                                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                      {product.brand}
                                    </span>
                                  )}
                                  {product.isFeatured && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      Featured
                                    </span>
                                  )}
                                  {product.isBestseller && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Bestseller
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 line-clamp-2 max-w-md text-sm text-slate-500">
                                  {product.description || "No description added yet."}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  SKU: {product.sku || "—"} • Updated{" "}
                                  {product.updatedAt
                                    ? new Date(product.updatedAt).toLocaleDateString("en-IN")
                                    : "recently"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {varietyCount} active pack option
                                  {varietyCount === 1 ? "" : "s"}
                                  {topVarietyNames.length > 0
                                    ? ` • ${topVarietyNames.join(", ")}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            <div className="font-medium text-slate-900">{categoryName}</div>
                            <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              {(product.unit || "pcs").toUpperCase()}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            <div>{product.packSizeLabel || "Pack size not set"}</div>
                            <div className="mt-1 text-slate-400">
                              Min order {product.minOrderQuantity ?? 1} {product.unit ?? "pcs"}
                            </div>
                            <div
                              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getStorageTone(
                                product.storageType || "ambient"
                              )}`}
                            >
                              {product.storageType || "ambient"}
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              Shelf life {product.shelfLifeDays ?? 0} days
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {product.stock?.trim() ? product.stock : "No stock note"}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2 text-sm text-slate-700">
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {priceSummary.startingPrice !== null
                                    ? `From ${formatCurrency(priceSummary.startingPrice)}`
                                    : "Price not set"}
                                </div>
                                {priceSummary.originalPrice !== null &&
                                  priceSummary.originalPrice >
                                  (priceSummary.startingPrice ?? 0) ? (
                                  <div className="text-xs text-slate-400 line-through">
                                    {formatCurrency(priceSummary.originalPrice)}
                                  </div>
                                ) : null}
                              </div>
                              <div className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                                <StarIcon className="h-4 w-4" />
                                {Number(product.ratingAverage ?? product.rating ?? 0).toFixed(1)}
                                <span className="text-slate-400">
                                  ({product.ratingCount ?? 0})
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                Sold {product.purchaseCount ?? 0} • Priority{" "}
                                {product.displayOrder ?? 0}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            <div className="font-semibold text-slate-900">
                              {product.stockQuantity ?? 0} {product.unit ?? "units"}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {product.availableVarietyCount ?? product.varieties?.length ?? 0} pack
                              option
                              {(product.availableVarietyCount ??
                                product.varieties?.length ??
                                0) === 1
                                ? ""
                                : "s"}
                            </div>
                            <div
                              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${inventoryHealth.tone} ${inventoryHealth.border}`}
                            >
                              {inventoryHealth.label}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <select
                              value={product.status}
                              disabled={statusLoading === product._id}
                              onChange={(e) => updateStatus(product._id, e.target.value)}
                              className={`rounded-full px-3 py-1.5 text-sm font-semibold text-white ${product.status === "available"
                                ? "bg-emerald-600"
                                : "bg-rose-600"
                                }`}
                            >
                              <option value="available">Available</option>
                              <option value="not available">Not available</option>
                            </select>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-3">
                              <button onClick={() => handleEdit(product)} title="Edit product">
                                <PencilIcon className="h-5 w-5 text-blue-600" />
                              </button>
                              <button onClick={() => handleDelete(product._id)} title="Delete product">
                                <TrashIcon className="h-5 w-5 text-rose-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {!productsLoading && !productsError && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-16 text-center text-sm text-slate-500">
                        No products match the current inventory filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-500">
                Showing page {pagination.page} of {pagination.totalPages} • {pagination.total} total
                matching product{pagination.total === 1 ? "" : "s"}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!pagination.hasPrev}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>

                {visiblePageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`min-w-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${pageNumber === pagination.page
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={!pagination.hasNext}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(pagination.totalPages || 1, page + 1)
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-semibold text-slate-900">Needs attention</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Products with immediate stock risk or missing availability.
              </p>
              <div className="mt-4 space-y-3">
                {inventoryPanels.attentionItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No urgent stock issues right now.
                  </div>
                ) : (
                  inventoryPanels.attentionItems.map((product) => {
                    const health = getInventoryHealth(product);
                    return (
                      <button
                        type="button"
                        key={product._id}
                        onClick={() => handleEdit(product)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {product.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {product.sku || "No SKU"} • {getNumericStock(product.stockQuantity)} units
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${health.tone}`}
                          >
                            {health.label}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <ArchiveBoxIcon className="h-5 w-5 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">Hidden listings</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Products not currently visible to buyers in the storefront.
              </p>
              <div className="mt-4 space-y-3">
                {inventoryPanels.hiddenItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Every product is currently published.
                  </div>
                ) : (
                  inventoryPanels.hiddenItems.map((product) => (
                    <button
                      type="button"
                      key={product._id}
                      onClick={() => handleEdit(product)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="text-sm font-semibold text-slate-900">{product.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {getProductCategoryName(product, categoryNameById)} • {product.sku || "No SKU"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <CheckBadgeIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-semibold text-slate-900">Top movers</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Best-selling products worth protecting from stockouts.
              </p>
              <div className="mt-4 space-y-3">
                {inventoryPanels.topMovers.map((product) => (
                  <button
                    type="button"
                    key={product._id}
                    onClick={() => handleEdit(product)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Sold {product.purchaseCount ?? 0} • Stock {getNumericStock(product.stockQuantity)}
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        Active
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-4">
          <div className="mx-auto flex h-full max-w-5xl items-center justify-center">
            <div className="max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Edit Product</h2>
                  <p className="text-sm text-slate-500">
                    Update wholesale product details, pricing, merchandising, and inventory data.
                  </p>
                </div>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-slate-500"
                  onClick={closeEditModal}
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleUpdate} className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 p-5">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Core details</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Product name
                        </label>
                        <input
                          name="name"
                          value={editingProduct.name}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Brand
                        </label>
                        <input
                          name="brand"
                          value={editingProduct.brand}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          SKU
                        </label>
                        <input
                          name="sku"
                          value={editingProduct.sku}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          UPC / barcode
                        </label>
                        <input
                          name="upc"
                          value={editingProduct.upc}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          HSN / SAC code
                        </label>
                        <input
                          name="hsnCode"
                          value={editingProduct.hsnCode}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={editingProduct.description || ""}
                          onChange={handleChange}
                          className={`${inputClass} min-h-28`}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Category
                        </label>
                        <select
                          name="category"
                          value={editingProduct.category}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          <option value="">Select category</option>
                          {categories.map((category) => (
                            <option key={category._id} value={category._id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          SubCategory
                        </label>
                        <select
                          name="subcategory"
                          value={editingProduct.subcategory || ""}
                          onChange={handleChange}
                          disabled={!editingProduct.category}
                          className={inputClass}
                        >
                          <option value="">
                            {editingProduct.category
                              ? "Select subcategory"
                              : "Select category first"}
                          </option>
                          {editSubCategories
                            .filter((sub) => sub.isActive !== false)
                            .map((sub) => (
                              <option key={sub._id} value={sub._id}>
                                {sub.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Status
                        </label>
                        <select
                          name="status"
                          value={editingProduct.status}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          <option value="available">Available</option>
                          <option value="not available">Not available</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Pack options</h3>
                      <button
                        type="button"
                        onClick={addVariety}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Add variety
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editingProduct.varieties.map((variety, index) => (
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
                              onClick={() => removeVariety(index)}
                              disabled={editingProduct.varieties.length === 1}
                              className="text-sm font-medium text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-4">
                            <input
                              value={variety.name}
                              placeholder="Pack option"
                              onChange={(e) =>
                                handleVarietyChange(index, "name", e.target.value)
                              }
                              className={inputClass}
                            />
                            <input
                              type="number"
                              min="0"
                              value={variety.originalPrice}
                              placeholder="Original price"
                              onChange={(e) =>
                                handleVarietyChange(index, "originalPrice", e.target.value)
                              }
                              className={inputClass}
                            />
                            <input
                              type="number"
                              min="0"
                              value={variety.discountedPrice}
                              placeholder="Discounted price"
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
                  <section className="rounded-3xl border border-slate-200 p-5">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Supply details</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Unit
                        </label>
                        <select
                          name="unit"
                          value={editingProduct.unit}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          {unitOptions.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Pack size label
                        </label>
                        <input
                          name="packSizeLabel"
                          value={editingProduct.packSizeLabel}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Min order quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          name="minOrderQuantity"
                          value={editingProduct.minOrderQuantity}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Shelf life (days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          name="shelfLifeDays"
                          value={editingProduct.shelfLifeDays}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Storage type
                        </label>
                        <select
                          name="storageType"
                          value={editingProduct.storageType}
                          onChange={handleChange}
                          className={inputClass}
                        >
                          {storageOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 p-5">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Merchandising</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            name="isFeatured"
                            checked={Boolean(editingProduct.isFeatured)}
                            onChange={handleChange}
                          />
                          Featured
                        </label>
                        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            name="isBestseller"
                            checked={Boolean(editingProduct.isBestseller)}
                            onChange={handleChange}
                          />
                          Bestseller
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Manual seed rating
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            name="seedRatingAverage"
                            value={editingProduct.seedRatingAverage}
                            onChange={handleChange}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Manual seed count
                          </label>
                          <input
                            type="number"
                            min="0"
                            name="seedRatingCount"
                            value={editingProduct.seedRatingCount}
                            onChange={handleChange}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Live user rating
                          </label>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                            {Number(editingProduct.userRatingAverage ?? 0).toFixed(1)} from{" "}
                            {editingProduct.userRatingCount ?? editingProduct.reviewCount ?? 0} reviews
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Combined storefront rating
                          </label>
                          <div className="rounded-xl border border-slate-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                            {Number(editingProduct.ratingAverage ?? editingProduct.rating ?? 0).toFixed(1)} from{" "}
                            {editingProduct.ratingCount ?? 0} total ratings
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Purchase count
                          </label>
                          <input
                            type="number"
                            min="0"
                            name="purchaseCount"
                            value={editingProduct.purchaseCount}
                            onChange={handleChange}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Display order
                          </label>
                          <input
                            type="number"
                            min="0"
                            name="displayOrder"
                            value={editingProduct.displayOrder}
                            onChange={handleChange}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Badges
                        </label>
                        <input
                          name="badgesText"
                          value={editingProduct.badgesText}
                          onChange={handleChange}
                          placeholder="Chef special, Fresh, Combo"
                          className={inputClass}
                        />
                      </div>
                      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
                        Manual seed values are editable here. Real customer review scores are read-only
                        and are merged into the storefront rating automatically.
                      </p>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Customer reviews</h3>
                        <p className="text-sm text-slate-500">
                          Moderate real review visibility without losing the underlying manual seed rating.
                        </p>
                      </div>
                      {reviewsLoading && (
                        <span className="text-sm text-slate-400">Loading reviews...</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {!reviewsLoading && productReviews.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          No customer reviews yet for this product.
                        </div>
                      )}

                      {productReviews.map((review) => (
                        <div
                          key={review._id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  {Number(review.rating ?? 0).toFixed(1)} stars
                                </span>
                                <span className="text-sm font-semibold text-slate-800">
                                  {review.reviewerNameRaw || review.reviewerName || "Verified buyer"}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${review.status === "published"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-700"
                                    }`}
                                >
                                  {review.status === "published" ? "Published" : "Hidden"}
                                </span>
                              </div>
                              <p className="text-sm leading-6 text-slate-600">
                                {review.comment?.trim() || "No written comment added."}
                              </p>
                              <p className="text-xs text-slate-400">
                                {review.createdAt
                                  ? new Date(review.createdAt).toLocaleString("en-IN")
                                  : "Recently added"}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={reviewStatusLoading === review._id}
                              onClick={() =>
                                handleReviewStatusToggle(
                                  review._id,
                                  review.status === "published" ? "hidden" : "published"
                                )
                              }
                              className={`rounded-xl px-3 py-2 text-sm font-semibold ${review.status === "published"
                                ? "bg-slate-900 text-white"
                                : "bg-emerald-600 text-white"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {reviewStatusLoading === review._id
                                ? "Updating..."
                                : review.status === "published"
                                  ? "Hide review"
                                  : "Publish review"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 p-5">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Inventory and media</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Stock quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            name="stockQuantity"
                            value={editingProduct.stockQuantity}
                            onChange={handleChange}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Stock note
                          </label>
                          <input
                            name="stock"
                            value={editingProduct.stock || ""}
                            onChange={handleChange}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Product gallery
                        </label>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageSelect}
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-700`}
                        />
                        {imageSelectionError && (
                          <p className="mt-2 text-xs font-medium text-rose-600">
                            {imageSelectionError}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-400">
                          Keep, remove, reorder, and add images in one flow. The selected primary image
                          becomes the storefront cover.
                        </p>
                      </div>

                      {(editableExistingImages.length > 0 || selectedImages.length > 0) && (
                        <div className="space-y-4">
                          {editableExistingImages.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Existing images
                              </p>
                              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                                {editableExistingImages.map((image, index) => (
                                  <div
                                    key={`${image}-${index}`}
                                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                  >
                                    <div className="relative">
                                      <img
                                        src={image}
                                        alt="product"
                                        onError={(event) => {
                                          event.currentTarget.onerror = null;
                                          event.currentTarget.src = DEFAULT_PRODUCT_IMAGE_URL;
                                        }}
                                        className="h-24 w-full object-cover ring-1 ring-slate-200"
                                      />
                                      {editingProduct.primaryImage === image && (
                                        <span className="absolute left-2 top-2 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                                          Primary
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-2 p-2">
                                      <button
                                        type="button"
                                        onClick={() => setPrimaryImage(image)}
                                        className={`w-full rounded-lg px-2 py-1 text-[11px] font-semibold ${editingProduct.primaryImage === image
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-600"
                                          }`}
                                      >
                                        {editingProduct.primaryImage === image
                                          ? "Primary"
                                          : "Set primary"}
                                      </button>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => moveExistingImage(index, -1)}
                                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            <ChevronUpIcon className="h-4 w-4" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={index === editableExistingImages.length - 1}
                                            onClick={() => moveExistingImage(index, 1)}
                                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            <ChevronDownIcon className="h-4 w-4" />
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeExistingImage(image)}
                                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-600"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                          Remove image
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedImages.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                New uploads
                              </p>
                              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                                {selectedImages.map((image, index) => (
                                  <div
                                    key={image.id}
                                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                  >
                                    <div className="relative">
                                      <img
                                        src={image.previewUrl}
                                        alt="preview"
                                        className="h-24 w-full object-cover ring-1 ring-slate-200"
                                      />
                                      {editingProduct.primaryImage === image.id && (
                                        <span className="absolute left-2 top-2 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                                          Primary
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-2 p-2">
                                      <button
                                        type="button"
                                        onClick={() => setPrimaryImage(image.id)}
                                        className={`w-full rounded-lg px-2 py-1 text-[11px] font-semibold ${editingProduct.primaryImage === image.id
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-600"
                                          }`}
                                      >
                                        {editingProduct.primaryImage === image.id
                                          ? "Primary"
                                          : "Set primary"}
                                      </button>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => moveSelectedImage(index, -1)}
                                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            <ChevronUpIcon className="h-4 w-4" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={index === selectedImages.length - 1}
                                            onClick={() => moveSelectedImage(index, 1)}
                                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            <ChevronDownIcon className="h-4 w-4" />
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeSelectedImage(image.id)}
                                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-600"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                          Remove image
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  <button
                    disabled={updateLoading}
                    className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {updateLoading ? "Updating product..." : "Update product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
