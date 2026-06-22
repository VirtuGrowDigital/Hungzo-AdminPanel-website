import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../Context/AuthProvider";
import {
  approveOrderRefund,
  getAllOrders,
  getAdminOrders,
  downloadOrderInvoice as downloadOrderInvoiceAPI,
} from "../../Api";
import toast from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

/* ================= HELPERS ================= */
const formatDate = (iso) =>
  new Date(iso).toISOString().split("T")[0];

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-800";
    case "Cancelled":
      return "bg-red-100 text-red-800";
    case "Refunded":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "Completed":
      return "✅";
    case "Cancelled":
      return "❌";
    case "Refunded":
      return "🔄";
    default:
      return "📦";
  }
};

const getPaymentColor = (method) =>
  method === "COD" ? "text-orange-600" : "text-green-600";

const formatFulfillmentType = (type) => {
  if (!type) return "—";
  return type
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
};

const asAmount = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getAdminOrderTotal = (order) => asAmount(order?.totalAmount);

const getAdminPayableAmount = (order) =>
  Math.max(getAdminOrderTotal(order) - asAmount(order?.walletUsed), 0);

const deriveRefundMeta = (order) => {
  if (!order) {
    return {
      refundStatus: "NOT_APPLICABLE",
      refundAmount: 0,
      refundEligibleAmount: 0,
      refundDeductionAmount: 0,
      refundDeductionReason: "",
    };
  }

  if (order.refundStatus === "APPROVED") {
    return {
      refundStatus: "APPROVED",
      refundAmount: Number(order.refundAmount || 0),
      refundEligibleAmount: Number(
        order.refundEligibleAmount ?? order.refundAmount ?? 0
      ),
      refundDeductionAmount: Number(order.refundDeductionAmount || 0),
      refundDeductionReason: order.refundDeductionReason?.toString() || "",
    };
  }

  if (order.orderStatus !== "Cancelled") {
    return {
      refundStatus: "NOT_APPLICABLE",
      refundAmount: 0,
      refundEligibleAmount: 0,
      refundDeductionAmount: 0,
      refundDeductionReason: "",
    };
  }

  const paidAmount =
    order.paymentStatus === "paid" ? getAdminOrderTotal(order) : 0;
  const walletAmount =
    order.paymentStatus !== "paid" ? asAmount(order.walletUsed) : 0;
  const refundAmount = paidAmount > 0 ? paidAmount : walletAmount;

  return {
    refundStatus: refundAmount > 0 ? "PENDING" : "NOT_APPLICABLE",
    refundAmount,
    refundEligibleAmount: refundAmount,
    refundDeductionAmount: 0,
    refundDeductionReason: "",
  };
};

const hasRefundablePrepaidAmount = (order) => {
  if (!order || order.orderStatus !== "Cancelled") {
    return false;
  }

  const usedWalletAmount = asAmount(
    order.walletUsed ?? order.walletChargedAmount
  );
  const paidOnline =
    order.paymentMethod === "ONLINE" && order.paymentStatus === "paid";

  return usedWalletAmount > 0 || paidOnline;
};

/* ================= CSV EXPORT HELPERS ================= */
const convertToCSV = (data) => {
  const headers = [
    "Order ID",
    "Customer Name",
    "Customer Email",
    "Customer Phone",
    "Order Items",
    "Status",
    "Date",
    "Time",
    "Total Amount (₹)",
    "Payment Method",
    "Fulfillment Type",
    "Sub Total (₹)",
    "GST Amount (₹)",
    "Delivery Charge (₹)",
    "Order Status",
    "Payment Status",
    "Shipping Address",
    "Created At"
  ];

  const rows = data.map(order => [
    order.id,
    order.customerName || "N/A",
    order.email,
    order.phone || "N/A",
    `"${order.items.replace(/"/g, '""')}"`,
    order.status,
    order.date,
    order.time,
    order.total.replace("₹", ""),
    order.payment,
    order.fulfillmentType,
    order.raw.subTotal || 0,
    order.raw.gstAmount || 0,
    order.raw.deliveryCharge || 0,
    order.raw.orderStatus,
    order.raw.paymentStatus || "N/A",
    `"${(order.raw.shippingAddress || "N/A").replace(/"/g, '""')}"`,
    new Date(order.raw.createdAt).toLocaleString()
  ]);

  return [headers, ...rows]
    .map(row => row.join(","))
    .join("\n");
};

const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/* ================= EXCEL EXPORT ================= */
const exportToExcel = (data, filename) => {
  try {
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data.map(order => ({
      'Order ID': order.id,
      'Customer Name': order.customerName,
      'Email': order.email,
      'Phone': order.phone,
      'Items': order.items,
      'Status': order.status,
      'Date': order.date,
      'Time': order.time,
      'Amount': order.total.replace('₹', ''),
      'Payment Method': order.payment,
      'Fulfillment Type': order.fulfillmentType,
      'Sub Total': order.raw.subTotal || 0,
      'GST': order.raw.gstAmount || 0,
      'Delivery Charge': order.raw.deliveryCharge || 0
    })));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    // Generate file
    XLSX.writeFile(workbook, filename);
    return true;
  } catch (error) {
    console.error("Excel export failed:", error);
    return false;
  }
};

/* ================= FILTER CATEGORIES ================= */
const FILTER_CATEGORIES = [
  { id: 'email', label: ' Email', icon: '📧' },
  { id: 'phone', label: ' Phone', icon: '📱' },
  { id: 'status', label: ' Status', icon: '📋' },
  { id: 'payment', label: ' Payment Method', icon: '💳' },
  { id: 'date', label: ' Date Range', icon: '📅' },
  { id: 'amount', label: ' Amount Range', icon: '💰' },
];

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', icon: '✅' },
  { value: 'cancelled', label: 'Cancelled', icon: '❌' },
  { value: 'refunded', label: 'Refunded', icon: '🔄' },
  { value: 'pending', label: 'Pending', icon: '⏳' },
  { value: 'processing', label: 'Processing', icon: '⚙️' },
];

const CANCELLED_STATUS_OPTIONS = [
  { value: 'cancelled', label: 'Cancelled', icon: '❌' },
  { value: 'refunded', label: 'Refunded', icon: '🔄' },
];

const PAYMENT_OPTIONS = [
  { value: 'COD', label: 'Cash on Delivery', icon: '💵' },
  { value: 'ONLINE', label: 'Online Payment', icon: '💳' },
  { value: 'CARD', label: 'Card Payment', icon: '💳' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
];

/* ================= MAIN ================= */
const OrderHistory = ({ mode = "all" }) => {
  const { user } = useAuth();
  const userRole = user?.role;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  // Professional filter state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });

  // Ref for table container
  const tableContainerRef = useRef(null);

  // Function to scroll table to top
  const scrollTableToTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth' // This adds a smooth scrolling animation
      });
    }
  };

  const mapOrder = (o) => {
    const refundMeta = deriveRefundMeta(o);
    const customerName =
      o.userDetails?.name ||
      o.user?.restaurantId?.name ||
      o.user?.name ||
      "—";

    return ({
    id: o._id,
    items: o.items
      .map((i) => `${i.productName} (${i.varietyName}) × ${i.quantity}`)
      .join(", "),
    customerName,
    email: o.userDetails?.email || o.user?.email || "—",
    phone: o.userDetails?.phone || o.user?.phone || o.shippingAddress?.phone || "—",
    status:
      refundMeta.refundStatus === "APPROVED"
        ? "Refunded"
        : o.orderStatus === "Delivered" || o.orderStatus === "Picked by Customer"
          ? "Completed"
          : o.orderStatus,
    date: formatDate(o.createdAt),
    time: formatTime(o.createdAt),
    total: `₹${getAdminOrderTotal(o)}`,
    totalValue: getAdminOrderTotal(o),
    payment: o.paymentMethod,
    fulfillmentType: formatFulfillmentType(o.fulfillmentType),
    raw: {
      ...o,
      refundStatus: refundMeta.refundStatus,
      refundAmount: refundMeta.refundAmount,
    },
  });
  };

  const loadData = useCallback(async () => {
    if (!userRole) return;

    try {
      setLoading(true);

      let res;
      if (
        userRole === "SUPERADMIN" ||
        userRole === "SUBADMIN"
      ) {
        res = await getAllOrders();
      } else if (userRole === "ADMIN") {
        res = await getAdminOrders();
      } else {
        return;
      }

      if (!res?.ok) throw new Error();

      const mapped = res.data.orders.map(mapOrder);
      setOrders(mapped);
      setSelectedOrder((currentSelectedOrder) => {
        if (!currentSelectedOrder) return null;

        return (
          mapped.find(
            (mappedOrder) => mappedOrder.id === currentSelectedOrder.id
          ) || null
        );
      });
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  /* ================= LOAD ORDERS ================= */
  useEffect(() => {
    loadData();
  }, [loadData]);

  const baseOrders = useMemo(() => {
    if (mode !== "cancelled") {
      return orders;
    }

    return orders.filter((order) =>
      order.raw?.orderStatus === "Cancelled" || order.status === "Refunded"
    );
  }, [mode, orders]);

  // Get unique values for filters
  const uniqueEmails = useMemo(() => {
    const emails = baseOrders.map(o => o.email).filter(email => email && email !== "—");
    return [...new Set(emails)];
  }, [baseOrders]);

  const uniquePhones = useMemo(() => {
    const phones = baseOrders.map(o => o.phone).filter(phone => phone && phone !== "—");
    return [...new Set(phones)];
  }, [baseOrders]);

  const uniqueDates = useMemo(() => {
    const dates = baseOrders.map(o => o.date);
    return [...new Set(dates)].sort().reverse();
  }, [baseOrders]);

  /* ================= FILTER LOGIC ================= */
  const filteredOrders = useMemo(() => {
    return baseOrders.filter((o) => {
      // No category selected - show all
      if (!selectedCategory) return true;

      switch (selectedCategory) {
        case 'email':
          return !filterValue || o.email === filterValue;

        case 'phone':
          return !filterValue || o.phone === filterValue;

        case 'status':
          return !filterValue || o.status.toLowerCase() === filterValue.toLowerCase();

        case 'payment':
          return !filterValue || o.payment === filterValue;

        case 'date':
          if (dateRange.start && dateRange.end) {
            return o.date >= dateRange.start && o.date <= dateRange.end;
          } else if (dateRange.start) {
            return o.date >= dateRange.start;
          } else if (dateRange.end) {
            return o.date <= dateRange.end;
          }
          return true;

        case 'amount':
          if (amountRange.min && amountRange.max) {
            return o.totalValue >= Number(amountRange.min) && o.totalValue <= Number(amountRange.max);
          } else if (amountRange.min) {
            return o.totalValue >= Number(amountRange.min);
          } else if (amountRange.max) {
            return o.totalValue <= Number(amountRange.max);
          }
          return true;

        default:
          return true;
      }
    });
  }, [baseOrders, selectedCategory, filterValue, dateRange, amountRange]);

  // Scroll to top whenever filters change
  useEffect(() => {
    scrollTableToTop();
  }, [selectedCategory, filterValue, dateRange, amountRange]);

  /* ================= GROUP BY DATE ================= */
  const groupedOrders = useMemo(() => {
    return filteredOrders.reduce((acc, o) => {
      acc[o.date] = acc[o.date] || [];
      acc[o.date].push(o);
      return acc;
    }, {});
  }, [filteredOrders]);

  /* ================= ANALYTICS ================= */
  const analytics = useMemo(() => {
    const completed = baseOrders.filter((o) => o.status === "Completed");
    const revenue =
      mode === "cancelled"
        ? baseOrders.reduce((sum, o) => sum + o.totalValue, 0)
        : completed.reduce((sum, o) => sum + o.totalValue, 0);
    const filteredRevenue = filteredOrders.reduce((sum, o) => sum + o.totalValue, 0);
    const cancelled = baseOrders.filter((o) => o.raw?.orderStatus === "Cancelled");
    const refunded = baseOrders.filter((o) => o.status === "Refunded");
    const pendingRefund = cancelled.filter((o) => {
      const refundMeta = deriveRefundMeta(o.raw);
      return (
        refundMeta.refundStatus === "PENDING" &&
        refundMeta.refundEligibleAmount > 0 &&
        hasRefundablePrepaidAmount(o.raw)
      );
    });

    return {
      total: baseOrders.length,
      completed: completed.length,
      cancelled: cancelled.length,
      refunded: refunded.length,
      pendingRefund: pendingRefund.length,
      revenue,
      filteredTotal: filteredOrders.length,
      filteredRevenue,
      rate: baseOrders.length ? ((completed.length / baseOrders.length) * 100).toFixed(1) : 0,
    };
  }, [baseOrders, filteredOrders, mode]);

  /* ================= EXPORT FUNCTION ================= */
  const handleExport = async () => {
    if (filteredOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    try {
      setExportLoading(true);

      // Prepare filename
      const date = new Date().toISOString().split('T')[0];
      const filterStatus = selectedCategory ? 'filtered' : 'all';
      const filename = `${
        mode === "cancelled" ? "cancelled_orders" : "orders"
      }_${filterStatus}_${date}.xlsx`;

      // Export to Excel
      const success = exportToExcel(filteredOrders, filename);

      if (success) {
        toast.success(`Exported ${filteredOrders.length} orders successfully!`);
      } else {
        // Fallback to CSV if Excel fails
        const csvContent = convertToCSV(filteredOrders);
        downloadCSV(csvContent, filename.replace('.xlsx', '.csv'));
        toast.success(`Exported ${filteredOrders.length} orders as CSV`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export orders");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      setInvoiceLoading(true);
      const res = await downloadOrderInvoiceAPI(order.id);
      if (!res.ok) {
        throw new Error(res.message || "Failed to download invoice");
      }

      const blobUrl = window.URL.createObjectURL(res.blob);
      const anchor = document.createElement("a");
      const match = /filename=\"?([^\"]+)\"?/i.exec(
        res.contentDisposition || ""
      );
      anchor.href = blobUrl;
      anchor.download = match?.[1] || `invoice-${order.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate invoice:", error);
      toast.error(error.message || "Failed to download invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleApproveRefund = async (order, payload) => {
    try {
      setRefundLoading(true);
      const res = await approveOrderRefund(order.id, payload);

      if (!res?.ok) {
        throw new Error(res?.message || "Failed to approve refund");
      }

      toast.success(res.data?.message || "Refund approved and credited to wallet");
      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to approve refund");
    } finally {
      setRefundLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setFilterValue('');
    setDateRange({ start: '', end: '' });
    setAmountRange({ min: '', max: '' });
  };

  // Get filter options based on selected category
  const getFilterOptions = () => {
    switch (selectedCategory) {
      case 'email':
        return uniqueEmails.map(email => ({ value: email, label: email }));
      case 'phone':
        return uniquePhones.map(phone => ({ value: phone, label: phone }));
      case 'status':
        return mode === "cancelled" ? CANCELLED_STATUS_OPTIONS : STATUS_OPTIONS;
      case 'payment':
        return PAYMENT_OPTIONS;
      case 'date':
        return uniqueDates.map(date => ({ value: date, label: date }));
      default:
        return [];
    }
  };

  // Render filter input based on category
  const renderFilterInput = () => {
    switch (selectedCategory) {
      case 'date':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'amount':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={amountRange.min}
                onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={amountRange.max}
                onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="10000"
              />
            </div>
          </div>
        );

      default:
        {
          const options = getFilterOptions();
          return (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select {FILTER_CATEGORIES.find(c => c.id === selectedCategory)?.label}</option>
              {options.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.icon && `${option.icon} `}{option.label}
                </option>
              ))}
            </select>
          );
        }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-1">⏳</div>
          <p className="text-gray-500">Loading order history…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-4">
      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-1">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "cancelled" ? "❌ Order Cancelled" : "📊 Order History"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {mode === "cancelled"
                ? "Review cancelled orders and approve wallet refunds where applicable."
                : "Browse completed, cancelled, refunded, and in-progress orders."}
            </p>
          </div>

          <div className="flex gap-2">
            {selectedCategory && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition flex items-center gap-2"
              >
                🧹 Clear Filters
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={exportLoading || filteredOrders.length === 0}
              className={`px-4 py-2 rounded flex items-center gap-2 ${filteredOrders.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : exportLoading
                    ? "bg-green-500 text-white"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
            >
              {exportLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  📊 Export to Excel ({filteredOrders.length}/{baseOrders.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================= PROFESSIONAL FILTER SECTION ================= */}
        <div className="bg-gray-50 p-4 rounded-lg mb-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <span>🔍</span> Advanced Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Filter Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FILTER_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setFilterValue('');
                      setDateRange({ start: '', end: '' });
                      setAmountRange({ min: '', max: '' });
                    }}
                    className={`p-2 rounded-lg text-sm flex items-center gap-2 transition-all ${selectedCategory === category.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span>{category.icon}</span>
                    <span className="truncate">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Value Input */}
            {selectedCategory && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-4 rounded-lg border"
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {FILTER_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                </label>
                {renderFilterInput()}

                {/* Active Filter Summary */}
                {(filterValue || dateRange.start || dateRange.end || amountRange.min || amountRange.max) && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">Active Filter:</p>
                    <p className="text-sm text-blue-800">
                      {selectedCategory === 'date' && (
                        <>📅 {dateRange.start || 'Any'} to {dateRange.end || 'Any'}</>
                      )}
                      {selectedCategory === 'amount' && (
                        <>💰 ₹{amountRange.min || '0'} - ₹{amountRange.max || '∞'}</>
                      )}
                      {['email', 'phone', 'status', 'payment'].includes(selectedCategory) && filterValue && (
                        <>{FILTER_CATEGORIES.find(c => c.id === selectedCategory)?.icon} {filterValue}</>
                      )}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Stats - Conditional rendering as requested */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-1">
          {/* Always show these stats */}
          <Stat
            label={mode === "cancelled" ? "Cancelled Orders" : "Total Orders"}
            value={analytics.total}
          />

          {/* Show Filtered stat only when filter is active */}
          {selectedCategory && (
            <Stat
              label="Filtered"
              value={analytics.filteredTotal}
              subtitle={`${analytics.total > 0 ? ((analytics.filteredTotal / analytics.total) * 100).toFixed(1) : "0.0"}%`}
              blue
            />
          )}

          {mode === "cancelled" ? (
            <>
              <Stat
                label="Refunded"
                value={analytics.refunded}
                green
              />
              <Stat
                label="Pending Refund"
                value={analytics.pendingRefund}
                blue
              />
            </>
          ) : (
            <Stat
              label="Completed"
              value={analytics.completed}
              green
            />
          )}

          {/* Conditional Revenue Stats - Exactly as you requested */}
          {selectedCategory ? (
            // When filter is active - show only Filtered Revenue
            <Stat
              label={mode === "cancelled" ? "Filtered Value" : "Filtered Revenue"}
              value={`₹${analytics.filteredRevenue.toFixed(2)}`}
              subtitle={`${analytics.revenue > 0 ? ((analytics.filteredRevenue / analytics.revenue) * 100).toFixed(1) : "0.0"}%`}
              blue
            />
          ) : (
            // When no filter - show only Total Revenue
            <Stat
              label={mode === "cancelled" ? "Total Cancelled Value" : "Total Revenue"}
              value={`₹${analytics.revenue.toFixed(2)}`}
            />
          )}
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl shadow mb-1 overflow-hidden">
        <div
          ref={tableContainerRef}
          className="max-h-[70vh] overflow-auto"
        >
          <table className="w-full min-w-[980px]">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fulfillment Type</th>
            </tr>
          </thead>
            <tbody>
              {Object.entries(groupedOrders).map(([date, list]) => (
                <React.Fragment key={date}>
                  <tr className="bg-gray-100">
                    <td colSpan="8" className="px-4 py-2 font-semibold">
                      📅 {date} <span className="text-gray-600 font-normal">({list.length} orders, ₹{list.reduce((sum, o) => sum + o.totalValue, 0).toFixed(2)})</span>
                    </td>
                  </tr>
                
                  {list.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="hover:bg-blue-50 cursor-pointer border-b transition-colors"
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-sm">{o.id.slice(-8)}</p>
                        <p className="text-xs text-gray-500 max-w-[220px] whitespace-normal break-words" title={o.items}>
                          {o.items}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm font-medium">{o.customerName}</p>
                        <p className="text-xs text-gray-500 break-all">{o.email}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm">{o.phone}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm">{o.date}</p>
                        <p className="text-xs text-gray-500">{o.time}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-bold text-sm">{o.total}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(o.status)}`}>
                          {getStatusIcon(o.status)} {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`text-xs font-medium ${getPaymentColor(o.payment)}`}>
                          {o.payment === 'COD' ? '💵' : '💳'} {o.payment}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="text-sm">{o.fulfillmentType}</span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 text-lg">
              {mode === "cancelled" ? "No cancelled orders found" : "No orders found"}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {mode === "cancelled"
                ? "Cancelled and refunded orders will appear here."
                : "Try adjusting your filters"}
            </p>
            {selectedCategory && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL ================= */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onDownloadInvoice={handleDownloadInvoice}
            onApproveRefund={handleApproveRefund}
            invoiceLoading={invoiceLoading}
            refundLoading={refundLoading}
            mode={mode}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ================= MODAL ================= */
const OrderModal = ({
  order,
  onClose,
  onDownloadInvoice,
  onApproveRefund,
  invoiceLoading,
  refundLoading,
  mode,
}) => {
  const ref = useRef();
  const {
    refundStatus,
    refundAmount,
    refundEligibleAmount,
    refundDeductionAmount,
    refundDeductionReason,
  } = deriveRefundMeta(order.raw);
  const showApproveRefundButton =
    order.raw.orderStatus === "Cancelled" &&
    refundStatus === "PENDING" &&
    refundEligibleAmount > 0;
  const [customRefundAmount, setCustomRefundAmount] = useState(
    refundEligibleAmount > 0 ? refundEligibleAmount.toFixed(2) : ""
  );
  const [deductionReasonInput, setDeductionReasonInput] = useState("");

  useEffect(() => {
    setCustomRefundAmount(
      refundEligibleAmount > 0 ? refundEligibleAmount.toFixed(2) : ""
    );
    setDeductionReasonInput("");
  }, [order.id, refundEligibleAmount]);

  const parsedCustomRefundAmount = Number(customRefundAmount || 0);
  const customAmountIsValid = Number.isFinite(parsedCustomRefundAmount);
  const liveDeductionAmount = customAmountIsValid
    ? Math.max(refundEligibleAmount - parsedCustomRefundAmount, 0)
    : 0;

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    const outside = (e) =>
      ref.current && !ref.current.contains(e.target) && onClose();

    document.addEventListener("keydown", esc);
    document.addEventListener("mousedown", outside);
    return () => {
      document.removeEventListener("keydown", esc);
      document.removeEventListener("mousedown", outside);
    };
  }, [onClose]);

  const submitCustomRefund = () => {
    if (!customRefundAmount.trim()) {
      toast.error("Enter the refund amount to approve.");
      return;
    }

    if (!customAmountIsValid) {
      toast.error("Enter a valid refund amount.");
      return;
    }

    if (parsedCustomRefundAmount <= 0) {
      toast.error("Refund amount must be greater than zero.");
      return;
    }

    if (parsedCustomRefundAmount > refundEligibleAmount) {
      toast.error("Refund amount cannot exceed the maximum refundable amount.");
      return;
    }

    if (liveDeductionAmount > 0 && deductionReasonInput.trim().length < 3) {
      toast.error("Add a short reason for the deduction.");
      return;
    }

    onApproveRefund(order, {
      refundAmount: parsedCustomRefundAmount,
      deductionReason: liveDeductionAmount > 0 ? deductionReasonInput.trim() : "",
    });
  };

  return (
      <motion.div
        className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
      <motion.div
        ref={ref}
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative mx-auto my-8 w-full max-w-3xl rounded-xl bg-white p-5 md:p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-xl hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ✕
        </button>

        <h3 className="text-lg font-bold mb-4">
          {mode === "cancelled" ? "❌ Cancelled Order Details" : "🧾 Order Details"}
        </h3>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 text-sm">
          <DetailRow label="Order ID" value={order.id} />
          <DetailRow label="Customer" value={order.customerName} />
          <DetailRow label="Email" value={order.email} />
          <DetailRow label="Phone" value={order.phone} />
          <DetailRow label="Date & Time" value={`${order.date} ${order.time}`} />
          <DetailRow
            label="Status"
            value={
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)} {order.status}
              </span>
            }
          />
          <DetailRow
            label="Payment"
            value={<span className={getPaymentColor(order.payment)}>{order.payment}</span>}
          />
          <DetailRow
            label="Fulfillment Type"
            value={formatFulfillmentType(order.raw.fulfillmentType)}
          />
          <DetailRow label="Total" value={<span className="font-bold">{order.total}</span>} />
          <DetailRow
            label="Wallet Used"
            value={<span>₹{asAmount(order.raw.walletUsed).toFixed(2)}</span>}
          />
          <DetailRow
            label="Payable Amount"
            value={<span>₹{getAdminPayableAmount(order.raw).toFixed(2)}</span>}
          />
          <DetailRow
            label="Refund"
            value={
              refundStatus === "APPROVED"
                ? `Approved • ₹${refundAmount.toFixed(2)}`
                : refundStatus === "PENDING"
                  ? `Pending approval • ₹${refundAmount.toFixed(2)}`
                  : "Not applicable"
            }
          />
          {(refundStatus === "PENDING" || refundStatus === "APPROVED") && (
            <DetailRow
              label="Eligible Refund"
              value={<span>₹{refundEligibleAmount.toFixed(2)}</span>}
            />
          )}
          {refundStatus === "APPROVED" && refundDeductionAmount > 0 && (
            <>
              <DetailRow
                label="Deducted Amount"
                value={<span>₹{refundDeductionAmount.toFixed(2)}</span>}
              />
              <DetailRow
                label="Deduction Reason"
                value={refundDeductionReason || "—"}
              />
            </>
          )}

          <div className="mt-4">
            <p className="font-semibold mb-2">Order Items:</p>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
              {order.raw.items.map((item, index) => (
                <div key={index} className="flex justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <span className="font-medium">{item.productName}</span>
                    {item.varietyName && (
                      <span className="text-gray-600 text-xs block">({item.varietyName})</span>
                    )}
                  </div>
                  <div className="text-right min-w-[100px]">
                    <span className="text-gray-600 text-sm">×{item.quantity}</span>
                    <span className="ml-2 font-medium">₹{item.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(refundStatus === "PENDING" || refundStatus === "APPROVED") && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                Cancelled order refund
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {refundStatus === "APPROVED"
                  ? `₹${refundAmount.toFixed(2)} has been credited to the user's wallet.`
                  : `Up to ₹${refundEligibleAmount.toFixed(2)} can be credited to the user's wallet after approval.`}
              </p>
              {refundStatus === "APPROVED" && refundDeductionAmount > 0 && (
                <p className="mt-2 text-sm text-amber-900">
                  ₹{refundDeductionAmount.toFixed(2)} was deducted. Reason:{" "}
                  {refundDeductionReason}
                </p>
              )}
            </div>
          )}

          {showApproveRefundButton && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Approve custom wallet refund
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Max refundable amount: ₹{refundEligibleAmount.toFixed(2)}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Cancelled order
                </span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Refund Amount
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={refundEligibleAmount}
                    value={customRefundAmount}
                    onChange={(e) => setCustomRefundAmount(e.target.value)}
                    disabled={refundLoading || invoiceLoading}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-gray-100"
                    placeholder="Enter refund amount"
                  />
                </label>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amount Deducted
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    ₹{liveDeductionAmount.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Deduction applies when approved refund is lower than the eligible refund.
                  </p>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Reason For Amount Cut
                </span>
                <textarea
                  rows={3}
                  value={deductionReasonInput}
                  onChange={(e) => setDeductionReasonInput(e.target.value)}
                  disabled={refundLoading || invoiceLoading}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-gray-100"
                  placeholder="Required when you approve less than the maximum refundable amount"
                />
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          {showApproveRefundButton && (
            <button
              onClick={submitCustomRefund}
              disabled={refundLoading || invoiceLoading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {refundLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Approving...
                </>
              ) : (
                <>Approve Refund to Wallet</>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition font-medium"
            disabled={invoiceLoading || refundLoading}
          >
            Close
          </button>
          <button
            onClick={() => onDownloadInvoice(order)}
            disabled={invoiceLoading || refundLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {invoiceLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Generating...
              </>
            ) : (
              <>
                📥 Download Invoice
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ================= DETAIL ROW ================= */
const DetailRow = ({ label, value }) => (
  <div className="grid grid-cols-1 gap-1 border-b border-gray-100 pb-2 sm:grid-cols-3 sm:gap-2">
    <span className="font-semibold text-gray-600">{label}:</span>
    <span className="break-words sm:col-span-2">{value}</span>
  </div>
);

/* ================= STAT ================= */
const Stat = ({ label, value, green, blue, subtitle }) => (
  <div className="bg-white border rounded-lg px-3 py-2 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${green ? "text-green-600" : blue ? "text-blue-600" : ""}`}>
        {value}
      </p>
    </div>
    {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
  </div>
);

export default OrderHistory;
