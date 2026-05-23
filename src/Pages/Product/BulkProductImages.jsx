import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, FileArchive, ImageUp, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { bulkUploadProductImages } from "../../Api";

const cardClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";
const buttonClass =
  "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const formatBytes = (value) => {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const normalized = value / 1024 ** power;
  return `${normalized.toFixed(normalized >= 10 || power === 0 ? 0 : 1)} ${units[power]}`;
};

const statusBadgeClass = (status) => {
  if (status === "ready") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "missing") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
};

export default function BulkProductImages() {
  const [archiveFile, setArchiveFile] = useState(null);
  const [mode, setMode] = useState("replace");
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);

  const resetPreview = () => {
    setPreview(null);
  };

  const handleArchiveChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setArchiveFile(file);
    resetPreview();

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please choose a .zip archive");
      setArchiveFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > 150 * 1024 * 1024) {
      toast.error("ZIP archive must be 150MB or smaller");
      setArchiveFile(null);
      event.target.value = "";
    }
  };

  const buildFormData = (dryRun) => {
    const formData = new FormData();
    formData.append("archive", archiveFile);
    formData.append("dryRun", String(dryRun));
    formData.append("mode", mode);
    return formData;
  };

  const runPreview = async () => {
    if (!archiveFile) {
      toast.error("Select a ZIP archive first");
      return;
    }

    setLoadingPreview(true);
    const response = await bulkUploadProductImages(buildFormData(true));
    setLoadingPreview(false);

    if (!response.ok) {
      setPreview(response.data ?? null);
      toast.error(response.message);
      return;
    }

    setPreview(response.data);
    toast.success("Preview generated");
  };

  const applyBulkUpload = async () => {
    if (!archiveFile) {
      toast.error("Select a ZIP archive first");
      return;
    }

    setApplying(true);
    const response = await bulkUploadProductImages(buildFormData(false));
    setApplying(false);

    if (!response.ok) {
      setPreview(response.data ?? preview);
      toast.error(response.message);
      return;
    }

    setPreview(null);
    setArchiveFile(null);
    toast.success(response.data?.message || "Bulk image upload completed");
  };

  const rows = preview?.rows ?? [];
  const archiveErrors = preview?.archiveErrors ?? [];
  const readyRows = rows.filter((row) => (row.errors?.length ?? 0) === 0);
  const hasBlockingErrors = archiveErrors.length > 0 || readyRows.length === 0;

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className={`${cardClass} overflow-hidden`}>
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_42%),linear-gradient(135deg,#0f172a_0%,#111827_100%)] px-6 py-8 text-white md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  <ImageUp className="h-3.5 w-3.5" />
                  Bulk Product Images
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    Upload product images by SKU with one ZIP
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-200">
                    Name files like <span className="font-semibold text-white">SKU123.jpg</span> or{" "}
                    <span className="font-semibold text-white">SKU123_2.png</span>. We validate file
                    size, image dimensions, supported formats, and missing SKUs before anything is saved.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-slate-100">
                <p>Per image: JPG, PNG, WEBP up to 5MB</p>
                <p>Minimum size: 600 x 600</p>
                <p>Archive size: up to 150MB</p>
                <p>Max images per SKU: 5</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.4fr_1fr] md:px-8">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">ZIP archive</label>
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-emerald-400 hover:bg-emerald-50/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <FileArchive className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {archiveFile ? archiveFile.name : "Choose product image ZIP"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {archiveFile ? formatBytes(archiveFile.size) : "One ZIP containing SKU-mapped images"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                    Browse
                  </span>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    onChange={handleArchiveChange}
                  />
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Update mode</label>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("replace");
                      resetPreview();
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      mode === "replace"
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">Replace existing images</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Existing product images are removed and the first uploaded image becomes primary.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("append");
                      resetPreview();
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      mode === "append"
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">Append new images</p>
                    <p className="mt-1 text-xs text-slate-500">
                      New images are added after current ones. Existing primary image is kept.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={runPreview}
                  disabled={!archiveFile || loadingPreview || applying}
                  className={`${buttonClass} bg-slate-900 text-white hover:bg-slate-800`}
                >
                  {loadingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Preview upload
                </button>
                <button
                  type="button"
                  onClick={applyBulkUpload}
                  disabled={!preview || hasBlockingErrors || loadingPreview || applying}
                  className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-500`}
                >
                  {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Apply valid images
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Filename rules</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>`SKU.jpg` sets the first image for that product.</p>
                <p>`SKU_2.jpg`, `SKU_3.png` add more images in order.</p>
                <p>Only image files are read from the ZIP. Hidden system files are ignored.</p>
                <p>Preview first so unmatched SKUs, oversize files, and small images are caught safely.</p>
              </div>
            </div>
          </div>
        </section>

        {preview ? (
          <section className={`${cardClass} p-6 md:p-8`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Preview results</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review each SKU before applying the archive.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total SKUs</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{preview.summary?.totalSkus ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Ready</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-900">{preview.summary?.validSkus ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Missing</p>
                  <p className="mt-1 text-xl font-semibold text-amber-900">{preview.summary?.missingSkus ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Errors</p>
                  <p className="mt-1 text-xl font-semibold text-rose-900">{preview.summary?.failedSkus ?? 0}</p>
                </div>
              </div>
            </div>

            {archiveErrors.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  Archive issues
                </div>
                <div className="mt-3 space-y-2 text-sm text-rose-700">
                  {archiveErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {archiveErrors.length === 0 && rows.some((row) => (row.errors?.length ?? 0) > 0) ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Some SKUs will be skipped
                </div>
                <p className="mt-2 text-sm text-amber-800">
                  {readyRows.length} valid SKU image sets can be uploaded now.{" "}
                  {rows.length - readyRows.length} SKU rows have errors and will be skipped automatically.
                </p>
              </div>
            ) : null}

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Counts</th>
                      <th className="px-4 py-3 font-semibold">Files</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => (
                      <tr key={row.sku} className="align-top">
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-900">{row.sku}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.action === "append" ? "Append" : "Replace"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-slate-800">
                            {row.productName || "No matching product"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <p>Existing: {row.existingImageCount}</p>
                          <p>Incoming: {row.incomingImageCount}</p>
                          <p>Final: {row.finalImageCount}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            {row.files?.length ? (
                              row.files.map((file) => (
                                <div key={`${row.sku}-${file.fileName}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                  <p className="font-semibold text-slate-800">{file.fileName}</p>
                                  <p>
                                    {formatBytes(file.sizeBytes)} • {file.width} x {file.height}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-400">No valid images found</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-3">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}>
                              {row.status === "ready" ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />}
                              {row.status}
                            </span>
                            {row.errors?.length ? (
                              <div className="space-y-2 text-xs text-rose-700">
                                {row.errors.map((error) => (
                                  <p key={`${row.sku}-${error}`}>{error}</p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-emerald-700">Ready to apply</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
