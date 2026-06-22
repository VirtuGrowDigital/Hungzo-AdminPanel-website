const normalizeBaseUrl = (value) => {
  const normalized = value?.toString().trim().replace(/\/+$/, "");
  if (normalized) return normalized;
  return "http://localhost:5000";
};

export const PUBLIC_ASSET_BASE_URL = normalizeBaseUrl(
  import.meta.env.PUBLIC_ASSET_BASE_URL || import.meta.env.VITE_PUBLIC_ASSET_BASE_URL
);

export const getPublicAssetUrl = (assetPath = "") => {
  const normalizedPath = assetPath.toString().trim().replace(/^\/+/, "");
  return `${PUBLIC_ASSET_BASE_URL}/${normalizedPath}`;
};

export const PUBLIC_PRODUCT_DEFAULT_IMAGE_URL = getPublicAssetUrl(
  "assets/logo/hungzo-product-default.png"
);
