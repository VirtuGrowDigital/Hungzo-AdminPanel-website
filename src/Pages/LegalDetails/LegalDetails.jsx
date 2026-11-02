import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Landmark, Mail, MapPin, Phone } from "lucide-react";
import { getStoreSettings, updateStoreSettings } from "../../Api";

const buildInitialForm = () => ({
  legalBusinessName: "",
  tradeName: "",
  gstin: "",
  pan: "",
  sellerCode: "",
  fssaiLicenseNumber: "",
  cin: "",
  reverseChargeApplicable: false,
  authorizedSignatoryName: "",
  authorizedSignatoryDesignation: "",
  supportEmail: "",
  supportPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  invoicePrefix: "HNG",
  placeOfSupply: "",
  gstVerification: {
    enabled: false,
    provider: "cashfree",
  },
  taxConfig: {
    productGstRate: 5,
    deliveryGstRate: 5,
    platformFeeGstRate: 18,
    pricesIncludeGst: false,
  },
});

const normalizeUpper = (value) => value.toUpperCase().trim();

export default function LegalDetails() {
  const [form, setForm] = useState(buildInitialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLegalDetails();
  }, []);

  async function loadLegalDetails() {
    setLoading(true);
    const response = await getStoreSettings();

    if (!response?.success) {
      toast.error(response?.message || "Failed to fetch legal details");
      setLoading(false);
      return;
    }

    setForm({
      ...buildInitialForm(),
      ...(response.settings?.legalDetails || {}),
    });
    setLoading(false);
  }

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateTaxConfig(key, value) {
    setForm((current) => ({
      ...current,
      taxConfig: {
        ...current.taxConfig,
        [key]: value,
      },
    }));
  }

  function validateForm() {
    if (!form.legalBusinessName.trim()) {
      return "Legal business name is required";
    }

    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gstin)) {
      return "Enter a valid 15-character GSTIN";
    }

    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) {
      return "Enter a valid PAN";
    }

    if (
      form.fssaiLicenseNumber &&
      !/^[0-9]{14}$/.test(form.fssaiLicenseNumber.trim())
    ) {
      return "FSSAI license number must be 14 digits";
    }

    if (form.cin && !/^[A-Z0-9]{10,25}$/.test(form.cin.trim())) {
      return "Enter a valid CIN";
    }

    if (!form.addressLine1.trim() || !form.city.trim() || !form.state.trim()) {
      return "Business address, city, and state are required";
    }

    if (form.pincode && !/^[0-9]{6}$/.test(form.pincode.trim())) {
      return "Pincode must be 6 digits";
    }

    if (
      form.supportEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())
    ) {
      return "Enter a valid support email";
    }

    for (const [label, value] of [
      ["Product GST rate", Number(form.taxConfig.productGstRate)],
      ["Delivery GST rate", Number(form.taxConfig.deliveryGstRate)],
      ["Handling fee GST rate", Number(form.taxConfig.platformFeeGstRate)],
    ]) {
      if (Number.isNaN(value) || value < 0 || value > 100) {
        return `${label} must be between 0 and 100`;
      }
    }

    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedPayload = {
      ...form,
      legalBusinessName: form.legalBusinessName.trim(),
      tradeName: form.tradeName.trim(),
      gstin: normalizeUpper(form.gstin),
      pan: normalizeUpper(form.pan),
      sellerCode: normalizeUpper(form.sellerCode),
      fssaiLicenseNumber: form.fssaiLicenseNumber.trim(),
      cin: normalizeUpper(form.cin),
      reverseChargeApplicable: form.reverseChargeApplicable === true,
      authorizedSignatoryName: form.authorizedSignatoryName.trim(),
      authorizedSignatoryDesignation:
        form.authorizedSignatoryDesignation.trim(),
      supportEmail: form.supportEmail.trim().toLowerCase(),
      supportPhone: form.supportPhone.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      invoicePrefix: normalizeUpper(form.invoicePrefix || "HNG").replace(
        /[^A-Z0-9/-]/g,
        "",
      ),
      placeOfSupply: form.placeOfSupply.trim(),
      taxConfig: {
        productGstRate: Number(form.taxConfig.productGstRate),
        deliveryGstRate: Number(form.taxConfig.deliveryGstRate),
        platformFeeGstRate: Number(form.taxConfig.platformFeeGstRate),
        pricesIncludeGst: form.taxConfig.pricesIncludeGst === true,
      },
      gstVerification: {
        enabled: form.gstVerification?.enabled === true,
        provider:
          (form.gstVerification?.provider || "cashfree").trim().toLowerCase() ||
          "cashfree",
      },
    };

    const validationMessage = validateForm();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setSaving(true);
    const response = await updateStoreSettings({
      legalDetails: normalizedPayload,
    });

    if (!response?.success) {
      toast.error(response?.message || "Failed to update legal details");
      setSaving(false);
      return;
    }

    setForm({
      ...buildInitialForm(),
      ...(response.settings?.legalDetails || normalizedPayload),
    });
    toast.success("Legal details updated");
    setSaving(false);
  }

  const fieldClassName =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <div className="min-h-full bg-slate-50 px-6 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-200">
                Invoice Compliance
              </p>
              <h1 className="mt-2 text-3xl font-semibold">Legal Details</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-200">
                Save the seller details required on GST-compliant invoices
                generated for users and restaurant owners.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-cyan-50">
              <FileText className="h-4 w-4" />
              Used for invoice headers and statutory billing data
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"
        >
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Landmark className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Seller Identity
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  These details identify the billing entity on invoices.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Legal business name
                <input
                  value={form.legalBusinessName}
                  onChange={(event) =>
                    updateField("legalBusinessName", event.target.value)
                  }
                  className={fieldClassName}
                  placeholder="Hungzo Foods Private Limited"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Trade name
                <input
                  value={form.tradeName}
                  onChange={(event) =>
                    updateField("tradeName", event.target.value)
                  }
                  className={fieldClassName}
                  placeholder="Hungzo"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                GSTIN
                <input
                  value={form.gstin}
                  onChange={(event) =>
                    updateField("gstin", normalizeUpper(event.target.value))
                  }
                  className={fieldClassName}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                PAN
                <input
                  value={form.pan}
                  onChange={(event) =>
                    updateField("pan", normalizeUpper(event.target.value))
                  }
                  className={fieldClassName}
                  placeholder="AAAAA0000A"
                  maxLength={10}
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Seller code
                <input
                  value={form.sellerCode}
                  onChange={(event) =>
                    updateField(
                      "sellerCode",
                      normalizeUpper(event.target.value),
                    )
                  }
                  className={fieldClassName}
                  placeholder="BCPL-UP-NCR"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                FSSAI license number
                <input
                  value={form.fssaiLicenseNumber}
                  onChange={(event) =>
                    updateField("fssaiLicenseNumber", event.target.value)
                  }
                  className={fieldClassName}
                  placeholder="10018064001545"
                  maxLength={14}
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                CIN
                <input
                  value={form.cin}
                  onChange={(event) =>
                    updateField("cin", normalizeUpper(event.target.value))
                  }
                  className={fieldClassName}
                  placeholder="U74140HR2015FTC055568"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Invoice prefix
                <input
                  value={form.invoicePrefix}
                  onChange={(event) =>
                    updateField(
                      "invoicePrefix",
                      normalizeUpper(event.target.value),
                    )
                  }
                  className={fieldClassName}
                  placeholder="HNG"
                  maxLength={12}
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Place of supply
                <input
                  value={form.placeOfSupply}
                  onChange={(event) =>
                    updateField("placeOfSupply", event.target.value)
                  }
                  className={fieldClassName}
                  placeholder="Chhattisgarh"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Authorized signatory name
                <input
                  value={form.authorizedSignatoryName}
                  onChange={(event) =>
                    updateField("authorizedSignatoryName", event.target.value)
                  }
                  className={fieldClassName}
                  placeholder="Accounts Manager"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Authorized signatory designation
                <input
                  value={form.authorizedSignatoryDesignation}
                  onChange={(event) =>
                    updateField(
                      "authorizedSignatoryDesignation",
                      event.target.value,
                    )
                  }
                  className={fieldClassName}
                  placeholder="Authorized Signatory"
                  disabled={loading || saving}
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.reverseChargeApplicable === true}
                  onChange={(event) =>
                    updateField("reverseChargeApplicable", event.target.checked)
                  }
                  disabled={loading || saving}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Reverse charge applicable on invoices
              </label>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-cyan-600" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Registered Address
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This appears as the seller address on invoices.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2 text-sm font-medium text-slate-700">
                Address line 1
                <input
                  value={form.addressLine1}
                  onChange={(event) =>
                    updateField("addressLine1", event.target.value)
                  }
                  className={fieldClassName}
                  placeholder="Plot 12, Industrial Area"
                  disabled={loading || saving}
                />
              </label>

              <label className="md:col-span-2 text-sm font-medium text-slate-700">
                Address line 2
                <input
                  value={form.addressLine2}
                  onChange={(event) =>
                    updateField("addressLine2", event.target.value)
                  }
                  className={fieldClassName}
                  placeholder="Near City Center"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                City
                <input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  className={fieldClassName}
                  placeholder="Raipur"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                State
                <input
                  value={form.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  className={fieldClassName}
                  placeholder="Chhattisgarh"
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Pincode
                <input
                  value={form.pincode}
                  onChange={(event) =>
                    updateField(
                      "pincode",
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                  className={fieldClassName}
                  placeholder="492001"
                  maxLength={6}
                  disabled={loading || saving}
                />
              </label>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Landmark className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Tax Configuration
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Default GST rates used to compute invoice tax breakup for
                  orders.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Product GST rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxConfig.productGstRate}
                  onChange={(event) =>
                    updateTaxConfig("productGstRate", event.target.value)
                  }
                  className={fieldClassName}
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Delivery GST rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxConfig.deliveryGstRate}
                  onChange={(event) =>
                    updateTaxConfig("deliveryGstRate", event.target.value)
                  }
                  className={fieldClassName}
                  disabled={loading || saving}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Handling fee GST rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxConfig.platformFeeGstRate}
                  onChange={(event) =>
                    updateTaxConfig("platformFeeGstRate", event.target.value)
                  }
                  className={fieldClassName}
                  disabled={loading || saving}
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.taxConfig.pricesIncludeGst === true}
                  onChange={(event) =>
                    updateTaxConfig("pricesIncludeGst", event.target.checked)
                  }
                  disabled={loading || saving}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Product and fee prices already include GST
              </label>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-violet-600" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Support Contact
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Invoice footer support details for users.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <label className="text-sm font-medium text-slate-700">
                  Support email
                  <input
                    type="email"
                    value={form.supportEmail}
                    onChange={(event) =>
                      updateField("supportEmail", event.target.value)
                    }
                    className={fieldClassName}
                    placeholder="support@hungzo.com"
                    disabled={loading || saving}
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Support phone
                  <input
                    value={form.supportPhone}
                    onChange={(event) =>
                      updateField("supportPhone", event.target.value)
                    }
                    className={fieldClassName}
                    placeholder="+91 98765 43210"
                    disabled={loading || saving}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                What this powers
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  Admin-downloaded invoices
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                  Support contact shown on bills
                </li>
                <li className="flex gap-3">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  Seller GST and business identity for compliance
                </li>
              </ul>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading || saving}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {saving ? "Saving..." : "Save Legal Details"}
                </button>
                <button
                  type="button"
                  onClick={loadLegalDetails}
                  disabled={loading || saving}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Reload Saved Details"}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
