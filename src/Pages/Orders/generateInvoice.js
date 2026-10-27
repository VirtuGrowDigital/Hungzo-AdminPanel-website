import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getStoreSettings } from "../../Api";

const asNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const money = (value) => `Rs. ${asNumber(value).toFixed(2)}`;

const clean = (value) => value?.toString?.().trim?.() ?? "";
const escapeHtml = (value) =>
  clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildAddress = (parts = []) => parts.filter(Boolean).join(", ");

const getInvoiceNumber = (order, legalDetails) =>
  order.invoiceNumber ||
  `${legalDetails.invoicePrefix || "HNG"}-${order._id
    .substring(order._id.length - 8)
    .toUpperCase()}`;

const findTaxLine = (taxLines, item) => {
  const matchId =
    item.lineItemId ||
    item.productId ||
    item.product?._id?.toString?.() ||
    item.product?.toString?.() ||
    "";
  return (
    taxLines.find(
      (line) => line.itemType === "PRODUCT" && line.itemId === matchId,
    ) || null
  );
};

const buildChargeRows = (order, taxDetails, taxSummary) => {
  const lines = Array.isArray(taxDetails.lines) ? taxDetails.lines : [];
  const deliveryLine =
    lines.find((line) => line.itemType === "DELIVERY_FEE") || null;
  const platformLine =
    lines.find((line) => line.itemType === "PLATFORM_FEE") || null;

  return [
    {
      label:
        order.fulfillmentType === "SELF_PICKUP"
          ? "Pickup / handling charge"
          : "Delivery and other charges",
      line: deliveryLine,
      taxableValue: asNumber(
        deliveryLine?.taxableValue,
        taxSummary.deliveryTaxableValue ?? order.deliveryCharge,
      ),
    },
    {
      label: "Handling fee",
      line: platformLine,
      taxableValue: asNumber(
        platformLine?.taxableValue,
        taxSummary.platformFeeTaxableValue ?? order.platformFee,
      ),
    },
  ].filter((row) => row.taxableValue > 0);
};

const buildItemRows = (orderItems, taxLines) =>
  orderItems.map((item, index) => {
    const taxLine = findTaxLine(taxLines, item);
    const originalPrice = asNumber(item.originalPrice);
    const discountedPrice = asNumber(
      item.discountedPrice,
      asNumber(item.price),
    );
    const qty = asNumber(item.quantity, asNumber(item.qty, 0));
    const discountAmount = asNumber(
      item.discountAmount,
      Math.max(0, (originalPrice - discountedPrice) * qty),
    );

    return {
      srNo: index + 1,
      upc: escapeHtml(item.upc || item.sku || "—"),
      description: `${escapeHtml(item.productName || item.name)}${
        clean(item.varietyName) ? ` (${escapeHtml(item.varietyName)})` : ""
      }`,
      hsnCode: escapeHtml(item.hsnCode || taxLine?.hsnCode || "—"),
      mrp: asNumber(originalPrice * qty),
      discountAmount,
      quantity: qty,
      taxableValue: asNumber(
        taxLine?.taxableValue,
        item.taxableValue ?? item.total ?? 0,
      ),
      cgstRate: asNumber(taxLine?.cgstRate),
      cgstAmount: asNumber(taxLine?.cgstAmount),
      sgstRate: asNumber(taxLine?.sgstRate),
      sgstAmount: asNumber(taxLine?.sgstAmount),
      igstRate: asNumber(taxLine?.igstRate),
      igstAmount: asNumber(taxLine?.igstAmount),
      cessRate: asNumber(taxLine?.cessRate),
      cessAmount: asNumber(
        taxLine?.cessAmount,
        asNumber(taxLine?.additionalCessAmount),
      ),
      totalAmount: asNumber(
        taxLine?.grossAmount,
        item.grossAmount ?? item.lineTotal ?? item.total ?? 0,
      ),
    };
  });

const buildInvoiceHtml = ({
  order,
  legalDetails,
  taxDetails,
  taxSummary,
  invoiceNumber,
  sellerAddress,
  placeOfSupply,
  orderDate,
}) => {
  const taxLines = Array.isArray(taxDetails.lines) ? taxDetails.lines : [];
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const itemRows = buildItemRows(orderItems, taxLines);
  const chargeRows = buildChargeRows(order, taxDetails, taxSummary);
  const taxationType = taxDetails.taxationType || "INTRASTATE";
  const amountInWords =
    escapeHtml(taxSummary.amountInWords) ||
    escapeHtml(`${money(order.totalAmount)} Only`);
  const safeSellerAddress = escapeHtml(sellerAddress || "—");
  const safePlaceOfSupply = escapeHtml(placeOfSupply || "—");
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safeOrderId = escapeHtml(order._id);

  const itemsTableRows = itemRows
    .map(
      (row) => `
        <tr>
          <td>${row.srNo}</td>
          <td>${row.upc || "—"}</td>
          <td>
            <div>${row.description}</div>
            <div class="subtle">(HSN/SAC: ${row.hsnCode || "—"})</div>
          </td>
          <td class="num">${row.mrp.toFixed(2)}</td>
          <td class="num">${row.discountAmount.toFixed(2)}</td>
          <td class="num">${row.quantity}</td>
          <td class="num">${row.taxableValue.toFixed(2)}</td>
          <td class="num">${row.cgstRate.toFixed(2)}</td>
          <td class="num">${row.cgstAmount.toFixed(2)}</td>
          <td class="num">${
            taxationType === "INTERSTATE"
              ? row.igstRate.toFixed(2)
              : row.sgstRate.toFixed(2)
          }</td>
          <td class="num">${
            taxationType === "INTERSTATE"
              ? row.igstAmount.toFixed(2)
              : row.sgstAmount.toFixed(2)
          }</td>
          <td class="num">${row.cessRate.toFixed(2)}</td>
          <td class="num">${row.cessAmount.toFixed(2)}</td>
          <td class="num">${row.totalAmount.toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");

  const annexureRows = chargeRows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.label)}</td>
          <td class="num">${asNumber(row.line?.gstRate).toFixed(2)}</td>
          <td class="num">${asNumber(row.line?.cessRate).toFixed(2)}</td>
          <td class="num">${row.taxableValue.toFixed(2)}</td>
          <td class="num">${asNumber(row.line?.cgstAmount).toFixed(2)}</td>
          <td class="num">${asNumber(row.line?.sgstAmount).toFixed(2)}</td>
          <td class="num">${asNumber(row.line?.igstAmount).toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <style>
      #invoice-content {
        width: 1120px;
        color: #111827;
        background: #ffffff;
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.35;
        padding: 24px;
      }
      .title {
        font-size: 28px;
        font-weight: 800;
        margin: 0 0 10px 0;
      }
      .grid-two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }
      .section {
        margin-top: 18px;
      }
      .section-title {
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        margin: 0 0 8px 0;
        color: #0f172a;
      }
      .box {
        border: 1px solid #cbd5e1;
        padding: 12px;
      }
      .muted {
        color: #475569;
      }
      .subtle {
        color: #64748b;
        font-size: 11px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #cbd5e1;
        padding: 6px 7px;
        vertical-align: top;
      }
      th {
        background: #eff6ff;
        font-size: 11px;
        text-align: left;
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      .summary {
        width: 360px;
        margin-left: auto;
      }
      .summary td {
        padding: 5px 8px;
      }
      .summary .grand {
        background: #dbeafe;
        font-weight: 700;
      }
      ol {
        margin: 8px 0 0 18px;
        padding: 0;
      }
      li {
        margin: 0 0 4px 0;
      }
    </style>

    <div id="invoice-content">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
        <div>
          <div class="title">Tax Invoice</div>
          <div class="muted">Sold By / Seller</div>
          <div style="font-weight:700;font-size:16px;">${escapeHtml(
            legalDetails.legalBusinessName || "Hungzo",
          )}</div>
          ${
            clean(legalDetails.tradeName)
              ? `<div class="muted">${escapeHtml(legalDetails.tradeName)}</div>`
              : ""
          }
          ${
            clean(legalDetails.sellerCode)
              ? `<div class="muted">${escapeHtml(legalDetails.sellerCode)}</div>`
              : ""
          }
          <div>${safeSellerAddress}</div>
          ${
            clean(legalDetails.gstin)
              ? `<div><strong>GSTIN:</strong> ${escapeHtml(legalDetails.gstin)}</div>`
              : ""
          }
          ${
            clean(legalDetails.fssaiLicenseNumber)
              ? `<div><strong>FSSAI License Number:</strong> ${escapeHtml(
                  legalDetails.fssaiLicenseNumber,
                )}</div>`
              : ""
          }
          ${
            clean(legalDetails.cin)
              ? `<div><strong>CIN:</strong> ${escapeHtml(legalDetails.cin)}</div>`
              : ""
          }
          ${
            clean(legalDetails.pan)
              ? `<div><strong>PAN:</strong> ${escapeHtml(legalDetails.pan)}</div>`
              : ""
          }
        </div>

        <div class="box" style="min-width:320px;">
          <div><strong>Invoice Number:</strong> ${safeInvoiceNumber}</div>
          <div><strong>Order ID:</strong> ${safeOrderId}</div>
          <div><strong>Invoice Date:</strong> ${orderDate.toLocaleDateString(
            "en-IN",
            { day: "2-digit", month: "short", year: "numeric" },
          )}</div>
          <div><strong>Place of Supply:</strong> ${safePlaceOfSupply}</div>
          <div><strong>Reverse Charge:</strong> ${
            legalDetails.reverseChargeApplicable ? "Yes" : "No"
          }</div>
          <div><strong>Payment Method:</strong> ${escapeHtml(
            order.paymentMethod || "N/A",
          )}</div>
        </div>
      </div>

      <div class="grid-two section">
        <div class="box">
          <div class="section-title">Invoice To</div>
          <div><strong>Name:</strong> ${escapeHtml(
            order.userDetails?.gstLegalName ||
              order.userDetails?.name ||
              order.user?.email ||
              "N/A",
          )}</div>
          ${
            clean(order.userDetails?.gstTradeName)
              ? `<div><strong>Trade Name:</strong> ${escapeHtml(
                  order.userDetails.gstTradeName,
                )}</div>`
              : ""
          }
          ${
            clean(order.userDetails?.gstPrincipalPlaceAddress) ||
            clean(order.userDetails?.gstAddressLine1) ||
            clean(order.userDetails?.address)
              ? `<div><strong>Address:</strong> ${escapeHtml(
                  order.userDetails?.gstPrincipalPlaceAddress ||
                    [
                      clean(order.userDetails?.gstAddressLine1),
                      clean(order.userDetails?.gstAddressLine2),
                      clean(order.userDetails?.gstCity),
                      clean(order.userDetails?.gstState),
                      clean(order.userDetails?.gstPincode),
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                    order.userDetails?.address,
                )}</div>`
              : ""
          }
          ${
            clean(order.userDetails?.gstPincode || order.userDetails?.pincode)
              ? `<div><strong>Pin code:</strong> ${escapeHtml(
                  order.userDetails?.gstPincode || order.userDetails?.pincode,
                )}</div>`
              : ""
          }
          ${
            clean(order.userDetails?.gstState || order.userDetails?.state)
              ? `<div><strong>State:</strong> ${escapeHtml(
                  order.userDetails?.gstState || order.userDetails?.state,
                )}</div>`
              : ""
          }
          ${
            clean(order.userDetails?.phone)
              ? `<div><strong>Phone:</strong> ${escapeHtml(order.userDetails.phone)}</div>`
              : ""
          }
          ${
            clean(order.userDetails?.gstNumber)
              ? `<div><strong>GSTIN:</strong> ${escapeHtml(
                  order.userDetails.gstNumber,
                )}</div>`
              : ""
          }
        </div>

        <div class="box">
          <div class="section-title">Seller Legal Details</div>
          <div><strong>Business:</strong> ${escapeHtml(
            legalDetails.legalBusinessName || "Hungzo",
          )}</div>
          ${
            clean(legalDetails.authorizedSignatoryName)
              ? `<div><strong>Authorised Signatory:</strong> ${escapeHtml(
                  legalDetails.authorizedSignatoryName,
                )}</div>`
              : ""
          }
          ${
            clean(legalDetails.authorizedSignatoryDesignation)
              ? `<div><strong>Designation:</strong> ${escapeHtml(
                  legalDetails.authorizedSignatoryDesignation,
                )}</div>`
              : ""
          }
          ${
            clean(legalDetails.supportEmail)
              ? `<div><strong>Support Email:</strong> ${escapeHtml(
                  legalDetails.supportEmail,
                )}</div>`
              : ""
          }
          ${
            clean(legalDetails.supportPhone)
              ? `<div><strong>Support Phone:</strong> ${escapeHtml(
                  legalDetails.supportPhone,
                )}</div>`
              : ""
          }
        </div>
      </div>

      <div class="section">
        <div class="section-title">Items</div>
        <table>
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>UPC</th>
              <th>Item Description</th>
              <th class="num">MRP</th>
              <th class="num">Discount</th>
              <th class="num">Qty</th>
              <th class="num">Taxable Value</th>
              <th class="num">CGST (%)</th>
              <th class="num">CGST (INR)</th>
              <th class="num">${
                taxationType === "INTERSTATE" ? "IGST (%)" : "SGST (%)"
              }</th>
              <th class="num">${
                taxationType === "INTERSTATE" ? "IGST (INR)" : "SGST (INR)"
              }</th>
              <th class="num">Cess (%)</th>
              <th class="num">Additional Cess</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTableRows}
          </tbody>
        </table>
      </div>

      ${
        chargeRows.length > 0
          ? `
            <div class="section">
              <div class="section-title">Annexure</div>
              <table>
                <thead>
                  <tr>
                    <th>S. No.</th>
                    <th>Nature of charge</th>
                    <th class="num">Tax Rate</th>
                    <th class="num">Cess Rate</th>
                    <th class="num">Taxable Value</th>
                    <th class="num">CGST</th>
                    <th class="num">SGST</th>
                    <th class="num">IGST</th>
                  </tr>
                </thead>
                <tbody>
                  ${annexureRows}
                </tbody>
              </table>
            </div>
          `
          : ""
      }

      <div class="section">
        <div><strong>Amount in Words:</strong> ${amountInWords}</div>
      </div>

      <div class="section">
        <table class="summary">
          <tbody>
            <tr>
              <td>Taxable Value</td>
              <td class="num">${money(
                taxSummary.productsTaxableValue ?? order.subTotal,
              )}</td>
            </tr>
            <tr>
              <td>${
                order.fulfillmentType === "SELF_PICKUP"
                  ? "Pickup / handling"
                  : "Delivery charges"
              }</td>
              <td class="num">${money(
                taxSummary.deliveryTaxableValue ?? order.deliveryCharge,
              )}</td>
            </tr>
            <tr>
              <td>Handling fee</td>
              <td class="num">${money(
                taxSummary.platformFeeTaxableValue ?? order.platformFee,
              )}</td>
            </tr>
            ${
              taxationType === "INTERSTATE"
                ? `
                  <tr>
                    <td>IGST</td>
                    <td class="num">${money(taxSummary.igstAmount)}</td>
                  </tr>
                `
                : `
                  <tr>
                    <td>CGST</td>
                    <td class="num">${money(taxSummary.cgstAmount)}</td>
                  </tr>
                  <tr>
                    <td>SGST</td>
                    <td class="num">${money(taxSummary.sgstAmount)}</td>
                  </tr>
                `
            }
            <tr>
              <td>Total GST</td>
              <td class="num">${money(
                taxSummary.totalTaxAmount ?? order.gstAmount,
              )}</td>
            </tr>
            <tr class="grand">
              <td>Grand Total</td>
              <td class="num">${money(order.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Terms &amp; Conditions</div>
        <ol class="muted">
          <li>Please contact support for any invoice or order issue.</li>
          <li>This is a computer-generated tax invoice.</li>
          <li>Delivery and platform charges are ancillary to the principal supply wherever applicable.</li>
        </ol>
      </div>
    </div>
  `;
};

export const generateInvoice = async (order) => {
  try {
    const settingsResponse = await getStoreSettings();
    const fallbackLegalDetails = settingsResponse?.success
      ? settingsResponse.settings?.legalDetails || {}
      : {};
    const legalDetails = order.sellerDetailsSnapshot || fallbackLegalDetails;
    const taxDetails = order.taxDetails || {};
    const taxSummary = taxDetails.summary || {};
    const invoiceNumber = getInvoiceNumber(order, fallbackLegalDetails);
    const sellerAddress = buildAddress([
      clean(legalDetails.addressLine1),
      clean(legalDetails.addressLine2),
      clean(legalDetails.city),
      clean(legalDetails.state),
      clean(legalDetails.pincode),
    ]);
    const placeOfSupply =
      clean(taxDetails.placeOfSupplyState) ||
      clean(order.userDetails?.state) ||
      clean(legalDetails.state) ||
      "N/A";
    const orderDate = new Date(order.createdAt);

    const invoiceContainer = document.createElement("div");
    invoiceContainer.style.position = "absolute";
    invoiceContainer.style.left = "-99999px";
    invoiceContainer.style.top = "0";
    invoiceContainer.style.background = "#fff";
    invoiceContainer.innerHTML = buildInvoiceHtml({
      order,
      legalDetails,
      taxDetails,
      taxSummary,
      invoiceNumber,
      sellerAddress,
      placeOfSupply,
      orderDate,
    });

    document.body.appendChild(invoiceContainer);

    const canvas = await html2canvas(
      invoiceContainer.querySelector("#invoice-content"),
      {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 1120,
        windowWidth: 1120,
      },
    );

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const availableWidth = pageWidth - 14;
    const availableHeight = pageHeight - 14;
    const imageWidth = canvas.width;
    const imageHeight = canvas.height;
    const scale = Math.min(
      availableWidth / imageWidth,
      availableHeight / imageHeight,
    );
    const renderWidth = imageWidth * scale;
    const renderHeight = imageHeight * scale;
    const offsetX = (pageWidth - renderWidth) / 2;
    const offsetY = (pageHeight - renderHeight) / 2;

    pdf.addImage(canvas, "PNG", offsetX, offsetY, renderWidth, renderHeight);

    const filename = `Invoice_${invoiceNumber.replace(/[^A-Z0-9/-]/gi, "_")}.pdf`;
    pdf.save(filename);
    document.body.removeChild(invoiceContainer);
  } catch (error) {
    console.error("Error generating invoice:", error);
    throw error;
  }
};

export default generateInvoice;
