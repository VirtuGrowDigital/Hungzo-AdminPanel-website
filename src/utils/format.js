/** Shared display formatters. Kept out of component files for fast refresh. */

export const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

export const formatShortDate = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
