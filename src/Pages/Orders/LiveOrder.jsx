import React, { useEffect, useRef, useState } from "react";
import {
  getAllOrders,
  getAdminOrders,
  updateOrderStatus as updateOrderStatusAPI,
  assignWarehouseToOrder as assignWarehouseToOrderAPI,
  verifyPickupOtp as verifyPickupOtpAPI,
  getWarehouses,
  downloadOrderInvoice as downloadOrderInvoiceAPI,
} from "../../Api";
import toast from "react-hot-toast";
import { useAuth } from "../../Context/AuthProvider";

/* ================= UTILS ================= */
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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

const getAdminOrderTotal = (order) =>
  Math.max(asAmount(order?.totalAmount) - asAmount(order?.gstAmount), 0);

const POLL_INTERVAL = 60000;

const DELIVERY_ORDER_STATUS_OPTIONS = [
  "Pending",
  "Accepted",
  "Packed",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const SELF_PICKUP_ORDER_STATUS_OPTIONS = ["Pending", "Accepted", "Packed"];

const SELF_PICKUP_SUPERADMIN_STATUS_OPTIONS = [
  ...SELF_PICKUP_ORDER_STATUS_OPTIONS,
  "Picked by Customer",
];

const getOrderStatusOptions = (order, role) => {
  if (order.fulfillmentType !== "SELF_PICKUP") {
    return DELIVERY_ORDER_STATUS_OPTIONS;
  }
  return role === "SUPERADMIN"
    ? SELF_PICKUP_SUPERADMIN_STATUS_OPTIONS
    : SELF_PICKUP_ORDER_STATUS_OPTIONS;
};

/* ================= 🔔 NOTIFICATION SOUND ================= */
const playNewOrderSound = () => {
  const audio = new Audio("/Alert.wav");
  audio.volume = 1;
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

/* ================= 🪟 NEW ORDER POPUP ================= */
const NewOrderPopup = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-96 rounded-lg p-5 shadow-xl">
        <h2 className="text-lg font-bold text-green-600">
          🛎 New Order Received
        </h2>

        <div className="mt-3 text-sm space-y-1">
          <p>
            <b>Order:</b> {order._id.substring(0, 8)}
          </p>
          <p>
            <b>Total:</b> ₹{getAdminOrderTotal(order)}
          </p>
          <p>
            <b>Customer:</b>{" "}
            {order.userDetails?.phone || order.userDetails?.email}
          </p>
          <p>
            <b>Time:</b> {formatTime(order.createdAt)}
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-green-600 text-white py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

/* ================= MAIN COMPONENT ================= */
const LiveOrderTable = () => {
  const { user } = useAuth();
  const userRole = user?.role;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseDrafts, setWarehouseDrafts] = useState({});
  const [assigningWarehouseId, setAssigningWarehouseId] = useState(null);
  const [pickupOtpDrafts, setPickupOtpDrafts] = useState({});
  const [pickupPaymentModeDrafts, setPickupPaymentModeDrafts] = useState({});
  const [verifyingPickupOrderId, setVerifyingPickupOrderId] = useState(null);
  // console.log(orders);

  /* 🔔 notification state */
  const [popupOrder, setPopupOrder] = useState(null);
  const lastOrderIdRef = useRef(null);

  /* ================= LOAD ORDERS ================= */
  const loadOrders = async () => {
    try {
      let res;

      if (userRole === "SUPERADMIN" || userRole === "SUBADMIN") {
        res = await getAllOrders();
      } else if (userRole === "ADMIN") {
        res = await getAdminOrders();
      } else {
        return;
      }

      if (!res?.ok) throw new Error();

      const fetchedOrders = res.data.orders || [];
      setOrders(fetchedOrders);
      setStatusDrafts((prev) => {
        const next = { ...prev };
        fetchedOrders.forEach((order) => {
          next[order._id] = next[order._id] || order.orderStatus;
        });
        return next;
      });
      setWarehouseDrafts((prev) => {
        const next = { ...prev };
        fetchedOrders.forEach((order) => {
          next[order._id] =
            next[order._id] || order.warehouseAssignment?.warehouseId || "";
        });
        return next;
      });
      setPickupOtpDrafts((prev) => {
        const next = { ...prev };
        fetchedOrders.forEach((order) => {
          next[order._id] = next[order._id] || "";
        });
        return next;
      });

      /* 🔔 NEW ORDER DETECTION */
      if (
        fetchedOrders.length &&
        lastOrderIdRef.current &&
        fetchedOrders[0]._id !== lastOrderIdRef.current
      ) {
        playNewOrderSound();
        setPopupOrder(fetchedOrders[0]);
      }

      if (fetchedOrders.length) {
        lastOrderIdRef.current = fetchedOrders[0]._id;
      }
    } catch (err) {
      console.error("Load orders failed", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  /* ================= POLLING ================= */
  useEffect(() => {
    if (!userRole) return;

    loadOrders();
    const timer = setInterval(loadOrders, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [userRole]);

  useEffect(() => {
    const loadWarehouseOptions = async () => {
      const res = await getWarehouses();
      if (res?.ok === false) {
        toast.error(res.message || "Failed to load warehouses");
        return;
      }

      const options = (res?.warehouses || res?.data?.warehouses || []).filter(
        (warehouse) => warehouse.status === "open",
      );
      setWarehouses(options);
    };

    loadWarehouseOptions();
  }, []);

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (orderId, newStatus) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) {
      toast.error("Order not found");
      return;
    }

    if (!getOrderStatusOptions(order, userRole).includes(newStatus)) {
      toast.error(`Invalid status: ${newStatus}`);
      return;
    }

    if (order.orderStatus === newStatus) {
      toast.error("Order is already in that status");
      return;
    }

    if (
      order.fulfillmentType === "SELF_PICKUP" &&
      newStatus === "Picked by Customer" &&
      !order.pickupOtpVerifiedAt
    ) {
      const confirmed = window.confirm(
        "Mark this pickup as collected without OTP verification?",
      );
      if (!confirmed) return;
    }

    const previous = orders;

    setOrders((prev) =>
      prev.map((o) =>
        o._id === orderId ? { ...o, orderStatus: newStatus } : o,
      ),
    );

    const res = await updateOrderStatusAPI(orderId, newStatus);

    if (!res.ok) {
      toast.error(res.message || "Failed to update");
      setOrders(previous);
      setStatusDrafts((prev) => ({
        ...prev,
        [orderId]: order.orderStatus,
      }));
      return;
    }

    setStatusDrafts((prev) => ({
      ...prev,
      [orderId]: newStatus,
    }));
    toast.success(`Status updated to ${newStatus}`);
  };

  /* ================= PRINT INVOICE ================= */
  const handlePrintInvoice = (order) => {
    downloadOrderInvoiceAPI(order._id).then((res) => {
      if (!res.ok) {
        toast.error(res.message || "Failed to download invoice");
        return;
      }

      const blobUrl = window.URL.createObjectURL(res.blob);
      const anchor = document.createElement("a");
      const match = /filename="?([^"]+)"?/i.exec(res.contentDisposition || "");
      anchor.href = blobUrl;
      anchor.download = match?.[1] || `invoice-${order._id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    });
  };

  const assignWarehouse = async (orderId) => {
    const warehouseId = warehouseDrafts[orderId];
    if (!warehouseId) {
      toast.error("Select a warehouse first");
      return;
    }

    try {
      setAssigningWarehouseId(orderId);
      const res = await assignWarehouseToOrderAPI(orderId, warehouseId);

      if (!res.ok) {
        toast.error(res.message || "Failed to assign warehouse");
        return;
      }

      const updatedOrder = res.data?.order;
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? updatedOrder : order)),
      );
      setSelectedOrder((current) =>
        current?._id === orderId ? updatedOrder : current,
      );
      toast.success("Warehouse assigned successfully");
    } finally {
      setAssigningWarehouseId(null);
    }
  };

  const verifyPickupOtp = async (order, { bypass = false } = {}) => {
    const orderId = order._id;
    const otp = (pickupOtpDrafts[orderId] || "").trim();

    if (!bypass && !otp) {
      toast.error("Enter the pickup OTP first");
      return;
    }

    let bypassReason = "";
    if (bypass) {
      bypassReason = window.prompt(
        "Reason for completing this pickup without OTP:",
        "Customer did not receive OTP",
      );
      if (!bypassReason || bypassReason.trim().length < 3) {
        toast.error("A reason is required to skip OTP verification");
        return;
      }
    }

    const requiresPaymentCollection =
      order.paymentStatus !== "paid" && order.paymentMethod === "COD";
    const paymentMode = requiresPaymentCollection
      ? pickupPaymentModeDrafts[orderId] || "CASH"
      : undefined;

    try {
      setVerifyingPickupOrderId(orderId);
      const res = await verifyPickupOtpAPI(
        orderId,
        bypass ? "" : otp,
        paymentMode,
        bypass ? { bypassOtp: true, bypassReason: bypassReason.trim() } : {},
      );
      if (!res.ok) {
        toast.error(res.message || "Failed to verify pickup OTP");
        return;
      }

      const updatedOrder = res.data?.order;
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? updatedOrder : order)),
      );
      setSelectedOrder((current) =>
        current?._id === orderId ? updatedOrder : current,
      );
      setPickupOtpDrafts((prev) => ({
        ...prev,
        [orderId]: "",
      }));
      setPickupPaymentModeDrafts((prev) => ({
        ...prev,
        [orderId]: "CASH",
      }));
      setStatusDrafts((prev) => ({
        ...prev,
        [orderId]: updatedOrder?.orderStatus || "Picked by Customer",
      }));
      toast.success("Pickup OTP verified successfully");
    } finally {
      setVerifyingPickupOrderId(null);
    }
  };

  /* ================= STATUS BADGE ================= */
  const badge = (status) => {
    const base = "px-2 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case "Pending":
        return `${base} bg-yellow-100 text-yellow-800`;
      case "Accepted":
        return `${base} bg-purple-100 text-purple-800`;
      case "Packed":
        return `${base} bg-blue-100 text-blue-800`;
      case "Out for Delivery":
        return `${base} bg-orange-100 text-orange-800`;
      case "Delivered":
        return `${base} bg-green-100 text-green-800`;
      case "Picked by Customer":
        return `${base} bg-emerald-100 text-emerald-800`;
      case "Cancelled":
        return `${base} bg-red-100 text-red-800`;
      default:
        return base;
    }
  };

  /* ================= ✅ UI FILTER (ONLY CHANGE) ================= */
  const visibleOrders = orders.filter(
    (order) =>
      order.orderStatus !== "Picked by Customer" &&
      order.orderStatus !== "Delivered" &&
      order.orderStatus !== "Cancelled",
  );

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading orders...</div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">Live Orders</h2>
          <p className="text-sm text-gray-500">
            Logged in as <strong>{user?.role}</strong>
          </p>
        </div>

        <div className="overflow-y-auto h-[74vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Order ID</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-center">Total</th>
                <th className="p-3 text-center">Fulfillment Type</th>
                <th className="p-3 text-center">Warehouse</th>
                <th className="p-3">Time</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {visibleOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No active orders
                  </td>
                </tr>
              )}

              {visibleOrders.map((order) => {
                const selectedStatus =
                  statusDrafts[order._id] ?? order.orderStatus;
                const availableStatusOptions = getOrderStatusOptions(
                  order,
                  userRole,
                );
                const disableUpdate = selectedStatus === order.orderStatus;
                const showPickupVerification =
                  order.fulfillmentType === "SELF_PICKUP" &&
                  order.warehouseAssignment &&
                  order.pickupOtpGeneratedAt &&
                  !order.pickupOtpVerifiedAt &&
                  order.orderStatus !== "Cancelled";
                const requiresPickupPaymentCollection =
                  showPickupVerification &&
                  order.paymentStatus !== "paid" &&
                  order.paymentMethod === "COD";

                return (
                  <tr
                    key={order._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="p-3 font-medium">
                      {order._id.substring(0, 8)}...
                    </td>
                    <td className="p-3">
                      {order.userDetails?.phone || order.userDetails?.email}
                    </td>
                    <td className="p-3 font-semibold text-center">
                      ₹{getAdminOrderTotal(order)}
                    </td>
                    <td className="p-3 text-sm text-center">
                      {formatFulfillmentType(order.fulfillmentType)}
                    </td>
                    <td
                      className="p-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {order.fulfillmentType === "SELF_PICKUP" ? (
                        <div className="space-y-1">
                          <select
                            value={warehouseDrafts[order._id] ?? ""}
                            onChange={(e) =>
                              setWarehouseDrafts((prev) => ({
                                ...prev,
                                [order._id]: e.target.value,
                              }))
                            }
                            className="block w-full rounded border border-gray-300 px-2 py-1 text-xs"
                          >
                            <option value="">Select warehouse</option>
                            {warehouses.map((warehouse) => (
                              <option key={warehouse._id} value={warehouse._id}>
                                {warehouse.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => assignWarehouse(order._id)}
                            disabled={assigningWarehouseId === order._id}
                            className={`block w-full rounded py-1 text-xs text-white ${
                              assigningWarehouseId === order._id
                                ? "cursor-not-allowed bg-gray-300"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {assigningWarehouseId === order._id
                              ? "Assigning..."
                              : order.warehouseAssignment
                                ? "Reassign"
                                : "Assign"}
                          </button>
                          <div className="text-[11px] text-gray-500">
                            {order.warehouseAssignment?.name || "Not assigned"}
                          </div>
                          {showPickupVerification ? (
                            <div className="space-y-1 pt-1">
                              {requiresPickupPaymentCollection ? (
                                <>
                                  <select
                                    value={
                                      pickupPaymentModeDrafts[order._id] ??
                                      "CASH"
                                    }
                                    onChange={(e) =>
                                      setPickupPaymentModeDrafts((prev) => ({
                                        ...prev,
                                        [order._id]: e.target.value,
                                      }))
                                    }
                                    className="block w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                  >
                                    <option value="CASH">
                                      Mark cash as collected
                                    </option>
                                  </select>
                                  <div className="text-[11px] text-amber-600">
                                    Verifying this OTP will also capture the
                                    remaining COD amount at pickup.
                                  </div>
                                </>
                              ) : null}
                              <input
                                type="text"
                                value={pickupOtpDrafts[order._id] ?? ""}
                                onChange={(e) =>
                                  setPickupOtpDrafts((prev) => ({
                                    ...prev,
                                    [order._id]: e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 4),
                                  }))
                                }
                                placeholder="Enter OTP"
                                className="block w-full rounded border border-gray-300 px-2 py-1 text-xs"
                              />
                              <button
                                onClick={() => verifyPickupOtp(order)}
                                disabled={verifyingPickupOrderId === order._id}
                                className={`block w-full rounded py-1 text-xs text-white ${
                                  verifyingPickupOrderId === order._id
                                    ? "cursor-not-allowed bg-gray-300"
                                    : "bg-indigo-600 hover:bg-indigo-700"
                                }`}
                              >
                                {verifyingPickupOrderId === order._id
                                  ? "Verifying..."
                                  : "Verify OTP"}
                              </button>
                              {userRole === "SUPERADMIN" ? (
                                <button
                                  onClick={() =>
                                    verifyPickupOtp(order, { bypass: true })
                                  }
                                  disabled={
                                    verifyingPickupOrderId === order._id
                                  }
                                  className={`block w-full rounded py-1 text-xs text-white ${
                                    verifyingPickupOrderId === order._id
                                      ? "cursor-not-allowed bg-gray-300"
                                      : "bg-rose-600 hover:bg-rose-700"
                                  }`}
                                >
                                  Complete without OTP
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500 text-center">
                      {formatTime(order.createdAt)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={badge(order.orderStatus)}>
                        {order.orderStatus}
                      </span>
                    </td>

                    <td
                      className="p-3 space-y-1 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={selectedStatus}
                        onChange={(e) =>
                          setStatusDrafts((prev) => ({
                            ...prev,
                            [order._id]: e.target.value,
                          }))
                        }
                        className="block w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      >
                        {availableStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => updateStatus(order._id, selectedStatus)}
                        disabled={disableUpdate}
                        className={`block w-full text-white text-xs py-1 rounded ${
                          disableUpdate
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-slate-700 hover:bg-slate-800"
                        }`}
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPrintInvoice={handlePrintInvoice}
        />
      )}

      <NewOrderPopup order={popupOrder} onClose={() => setPopupOrder(null)} />
    </>
  );
};

/* ================= MODAL ================= */
const OrderDetailsModal = ({ order, onClose, onPrintInvoice }) => (
  <div className="fixed inset-0 z-50 bg-black/70 p-3 sm:p-4" onClick={onClose}>
    <div
      className="mx-auto flex h-full max-h-[calc(100vh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-32px)]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-bold text-lg sm:text-xl">
            Order #{order._id.substring(0, 8)}
          </h2>
          <p className="text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => onPrintInvoice(order)}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Download Invoice
          </button>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* CUSTOMER + ORDER INFO */}
        <div className="grid grid-cols-1 gap-4 border-b p-4 text-sm sm:grid-cols-2 sm:p-5">
          <div className="space-y-2 rounded-xl bg-slate-50 p-4">
            <p className="break-words">
              <strong>Status:</strong> {order.orderStatus}
            </p>
            <p className="break-words">
              <strong>Payment:</strong> {order.paymentMethod} (
              {order.paymentStatus})
            </p>
            {order.fulfillmentType === "SELF_PICKUP" &&
            order.pickupPaymentMethod &&
            order.pickupPaymentMethod !== "NONE" ? (
              <p className="break-words">
                <strong>Pickup Payment:</strong> {order.pickupPaymentMethod} (
                {order.paymentModeAtPickup || "PAID"})
              </p>
            ) : null}
            <p className="break-words">
              <strong>Razorpay ID:</strong> {order.razorpayOrderId || "N/A"}
            </p>
          </div>

          <div className="space-y-2 rounded-xl bg-slate-50 p-4">
            <p className="break-words">
              <strong>Customer:</strong>{" "}
              {order.userDetails?.name ||
                order.user?.restaurantId?.ownerName ||
                order.user?.name ||
                "******"}
            </p>
            <p className="break-words">
              <strong>Restaurant Name:</strong>{" "}
              {order.user?.restaurantId?.name || "N/A"}
            </p>
            <p className="break-words">
              <strong>Customer Num.:</strong>{" "}
              {order.userDetails?.phone || "N/A"}
            </p>
            <p className="break-words">
              <strong>Address:</strong> {order.shippingAddress}
            </p>
            {order.fulfillmentType === "SELF_PICKUP" ? (
              <p className="break-words">
                <strong>Assigned Warehouse:</strong>{" "}
                {order.warehouseAssignment?.name || "Not assigned"}
              </p>
            ) : null}
            {order.fulfillmentType === "SELF_PICKUP" &&
            order.pickupOtpGeneratedAt &&
            !order.pickupOtpVerifiedAt ? (
              <p className="break-words">
                <strong>Pickup OTP:</strong> Awaiting admin verification
              </p>
            ) : null}
          </div>
        </div>

        {order.fulfillmentType === "SELF_PICKUP" &&
        order.warehouseAssignment ? (
          <div className="border-b p-4 sm:p-5">
            <h3 className="mb-3 font-semibold">Self Pickup Warehouse</h3>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="break-words">
                <strong>Name:</strong> {order.warehouseAssignment.name}
              </p>
              <p className="break-words">
                <strong>Address:</strong>{" "}
                {order.warehouseAssignment.fullAddress}
              </p>
              {order.pickupOtpGeneratedAt ? (
                <p className="break-words">
                  <strong>Pickup OTP:</strong>{" "}
                  {order.pickupOtpVerifiedAt
                    ? "Verified"
                    : "Pending verification"}
                </p>
              ) : null}
              {order.warehouseAssignment.mapLink ? (
                <a
                  href={order.warehouseAssignment.mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-blue-600 hover:text-blue-700"
                >
                  Open Google Maps Link
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ITEMS */}
        <div className="border-b p-4 sm:p-5">
          <h3 className="mb-3 font-semibold">Order Items</h3>

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {order.items.map((item) => (
              <div
                key={item._id}
                className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <img
                  src={item.product?.images?.[0]}
                  alt={item.productName}
                  className="h-20 w-20 rounded border object-cover"
                />

                <div className="flex-1 space-y-1 text-sm">
                  <p className="text-base font-semibold break-words">
                    {item.productName}
                  </p>
                  <p className="break-words text-gray-500">
                    Variety: {item.varietyName}
                  </p>
                  <p className="text-gray-500">Price: ₹{item.price}</p>
                  <p className="text-gray-500">Quantity: {item.quantity}</p>
                </div>

                <div className="text-right font-semibold sm:min-w-20">
                  ₹{item.total}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BILL SUMMARY */}
        <div className="p-4 text-sm sm:p-5">
          <div className="space-y-2 rounded-xl bg-slate-50 p-4">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <span>₹{order.subTotal}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Handling fee</span>
              <span>₹{order.platformFee}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Delivery</span>
              <span>₹{order.deliveryCharge}</span>
            </div>

            <div className="mt-2 flex justify-between gap-4 border-t pt-3 text-base font-bold">
              <span>Total</span>
              <span>₹{getAdminOrderTotal(order)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default LiveOrderTable;

// import React, { useEffect, useRef, useState } from "react";
// import {
//   getAllOrders,
//   getAdminOrders,
//   updateOrderStatus as updateOrderStatusAPI,
// } from "../../Api";
// import toast from "react-hot-toast";
// import { generateInvoice } from "./generateInvoice";
// import { useAuth } from "../../Context/AuthProvider";

// /* ================= UTILS ================= */
// const formatTime = (iso) =>
//   new Date(iso).toLocaleTimeString([], {
//     hour: "2-digit",
//     minute: "2-digit",
//   });

// const POLL_INTERVAL = 60000;

// /* ================= 🔔 NOTIFICATION SOUND ================= */
// const playNewOrderSound = () => {
//   const audio = new Audio("/Alert.wav");
//   audio.volume = 1;
//   audio.currentTime = 0;
//   audio.play().catch(() => { });
// };

// /* ================= 🪟 NEW ORDER POPUP ================= */
// const NewOrderPopup = ({ order, onClose }) => {
//   if (!order) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//       <div className="bg-white w-96 rounded-lg p-5 shadow-xl">
//         <h2 className="text-lg font-bold text-green-600">
//           🛎 New Order Received
//         </h2>

//         <div className="mt-3 text-sm space-y-1">
//           <p>
//             <b>Order:</b> {order._id?.substring(0, 8)}
//           </p>
//           <p>
//             <b>Total:</b> ₹{order.totalAmount}
//           </p>
//           <p>
//             <b>Customer:</b>{" "}
//             {order.userDetails?.phone || order.userDetails?.email}
//           </p>
//           <p>
//             <b>Time:</b> {formatTime(order.createdAt)}
//           </p>
//         </div>

//         <button
//           onClick={onClose}
//           className="mt-4 w-full bg-green-600 text-white py-2 rounded"
//         >
//           Close
//         </button>
//       </div>
//     </div>
//   );
// };

// /* ================= MAIN COMPONENT ================= */
// const LiveOrderTable = () => {
//   const { user } = useAuth();

//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   console.log("Orders:", orders);

//   /* 🔔 notification state */
//   const [popupOrder, setPopupOrder] = useState(null);
//   const lastOrderIdRef = useRef(null);

//   /* ================= LOAD ORDERS ================= */
//   const loadOrders = async () => {
//     try {
//       let res;

//       if (user?.role === "SUPERADMIN") {
//         res = await getAllOrders();
//       } else if (user?.role === "ADMIN") {
//         res = await getAdminOrders();
//       } else {
//         return;
//       }

//       if (!res?.ok) throw new Error("API response not ok");
//       let fetchedOrders = [];

//       if (Array.isArray(res.data)) {
//         // Case 1: API returns array directly
//         fetchedOrders = res.data;
//       } else if (Array.isArray(res.data?.orders)) {
//         // Case 2: API returns { orders: [...] }
//         fetchedOrders = res.data.orders;
//       } else if (res.data && typeof res.data === 'object') {
//         // Case 3: API returns object with numeric keys (like your data example)
//         // Check if it has numeric keys
//         const keys = Object.keys(res.data);
//         const hasNumericKeys = keys.some(key => !isNaN(key) && key !== "__v");

//         if (hasNumericKeys) {
//           // Convert object with numeric keys to array
//           fetchedOrders = Object.values(res.data).filter(item =>
//             item && typeof item === 'object' && item._id
//           );
//         } else if (res.data.orders && typeof res.data.orders === 'object') {
//           const ordersObj = res.data.orders;
//           fetchedOrders = Object.values(ordersObj).filter(item =>
//             item && typeof item === 'object' && item._id
//           );
//         }
//       }

//       if (fetchedOrders.length > 0) {
//         // Log statuses for debugging
//         fetchedOrders.forEach((order, index) => {
//           // console.log(`Order ${index}: ID=${order._id?.substring(0, 8)}, Status=${order.orderStatus}, Time=${order.createdAt}`);
//         });
//       }

//       setOrders(fetchedOrders);

//       /* 🔔 NEW ORDER DETECTION */
//       if (
//         fetchedOrders.length &&
//         lastOrderIdRef.current &&
//         fetchedOrders[0]._id !== lastOrderIdRef.current
//       ) {
//         playNewOrderSound();
//         setPopupOrder(fetchedOrders[0]);
//       }

//       if (fetchedOrders.length) {
//         lastOrderIdRef.current = fetchedOrders[0]._id;
//       }
//     } catch (err) {
//       console.error("Load orders failed", err);
//       toast.error("Failed to load orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= POLLING ================= */
//   useEffect(() => {
//     if (!user?.role) return;

//     loadOrders();
//     const timer = setInterval(loadOrders, POLL_INTERVAL);

//     return () => clearInterval(timer);
//   }, [user]);

//   /* ================= UPDATE STATUS ================= */
//   const updateStatus = async (orderId, newStatus) => {
//     // ✅ Check if order is already "Out for Delivery"
//     const order = orders.find(o => o._id === orderId);

//     if (order?.orderStatus === "Out for Delivery") {
//       toast.error("Cannot update status once order is out for delivery");
//       return;
//     }

//     const previous = orders;

//     // Optimistically update UI
//     setOrders((prev) =>
//       prev.map((o) =>
//         o._id === orderId ? { ...o, orderStatus: newStatus } : o
//       )
//     );

//     // Call API
//     const res = await updateOrderStatusAPI(orderId, newStatus);

//     if (!res.ok) {
//       toast.error(res.message || "Failed to update");
//       setOrders(previous);
//       return;
//     }

//     toast.success(`Status updated to ${newStatus}`);

//     // Optionally refresh orders
//     setTimeout(() => {
//       loadOrders();
//     }, 1000);
//   };

//   /* ================= PRINT INVOICE ================= */
//   const handlePrintInvoice = (order) => {
//     try {
//       generateInvoice(order);
//     } catch {
//       toast.error("Failed to generate invoice");
//     }
//   };

//   /* ================= STATUS BADGE ================= */
//   const badge = (status) => {
//     const base = "px-2 py-1 rounded-full text-xs font-semibold";

//     // Normalize status string
//     const normalizedStatus = status?.trim() || "Pending";

//     console.log("Badge for status:", status, "Normalized:", normalizedStatus);

//     switch (normalizedStatus) {
//       case "Pending":
//         return `${base} bg-yellow-100 text-yellow-800`;
//       case "Accepted":
//         return `${base} bg-purple-100 text-purple-800`;
//       case "Preparing":
//         return `${base} bg-blue-100 text-blue-800`;
//       case "Out for Delivery":
//       case "Out for delivery": // Handle case variations
//         return `${base} bg-orange-100 text-orange-800`;
//       case "Delivered":
//         return `${base} bg-green-100 text-green-800`;
//       case "Cancelled":
//         return `${base} bg-red-100 text-red-800`;
//       default:
//         return `${base} bg-gray-100 text-gray-800`;
//     }
//   };

//   /* ================= ✅ UI FILTER (ONLY CHANGE) ================= */
//   // Show orders that are NOT Delivered or Cancelled
//   const visibleOrders = orders.filter(
//     (order) => {
//       const status = order.orderStatus?.trim();
//       return status !== "Delivered" && status !== "Cancelled";
//     }
//   );

//   // Debug: Log visible orders
//   console.log("Visible orders count:", visibleOrders.length);
//   visibleOrders.forEach((order, index) => {
//     console.log(`Visible ${index}: ID=${order._id?.substring(0, 8)}, Status="${order.orderStatus}"`);
//   });

//   if (loading) {
//     return (
//       <div className="p-6 text-center text-gray-500">
//         Loading orders...
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="bg-white rounded-lg shadow border overflow-hidden">
//         <div className="p-4 border-b">
//           <h2 className="font-bold text-lg">Live Orders</h2>
//           <p className="text-sm text-gray-500">
//             Logged in as <strong>{user?.role}</strong>
//           </p>
//           {/* Debug info - you can remove this later */}
//           <div className="text-xs text-gray-400 mt-1">
//             Total: {orders.length} orders | Showing: {visibleOrders.length} active orders
//           </div>
//         </div>

//         <div className="overflow-y-auto h-[74vh]">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-3 text-left">Order ID</th>
//                 <th className="p-3 text-left">Customer</th>
//                 <th className="p-3 text-center">Total</th>
//                 <th className="p-3">Time</th>
//                 <th className="p-3">Status</th>
//                 <th className="p-3 text-center">Actions</th>
//               </tr>
//             </thead>

//             <tbody className="divide-y">
//               {visibleOrders.length === 0 && (
//                 <tr>
//                   <td colSpan="6" className="p-6 text-center text-gray-500">
//                     No active orders
//                   </td>
//                 </tr>
//               )}

//               {visibleOrders.map((order) => {

//                 const normalizedStatus = order.orderStatus?.trim();
//                 const isOutForDelivery = normalizedStatus === "Out for Delivery" || normalizedStatus === "Out for delivery";

//                 const canUpdate = !isOutForDelivery;

//                 const canCancel =
//                   (normalizedStatus === "Pending" ||
//                     normalizedStatus === "Accepted") && canUpdate;

//                 return (
//                   <tr
//                     key={order._id}
//                     className="hover:bg-gray-50 cursor-pointer"
//                     onClick={() => setSelectedOrder(order)}
//                   >
//                     <td className="p-3 font-medium">
//                       {order._id?.substring(0, 8)}...
//                     </td>
//                     <td className="p-3">
//                       {order.userDetails?.phone ||
//                         order.userDetails?.email}
//                     </td>
//                     <td className="p-3 font-semibold text-center">
//                       ₹{order.totalAmount}
//                     </td>
//                     <td className="p-3 text-xs text-gray-500 text-center">
//                       {formatTime(order.createdAt)}
//                     </td>
//                     <td className="p-3 text-center">
//                       <span className={badge(order.orderStatus)}>
//                         {order.orderStatus}
//                       </span>
//                     </td>

//                     <td
//                       className="p-3 space-y-1 text-center"
//                       onClick={(e) => e.stopPropagation()}
//                     >
//                       {/* ✅ "Out for Delivery" orders show no action buttons */}
//                       {isOutForDelivery ? (
//                         <div className="text-xs text-gray-500 py-1">
//                           Status Locked
//                         </div>
//                       ) : (
//                         <>
//                           {normalizedStatus === "Pending" && (
//                             <button
//                               onClick={() =>
//                                 updateStatus(order._id, "Accepted")
//                               }
//                               className="block w-full bg-yellow-500 text-white text-xs py-1 rounded"
//                             >
//                               Accept
//                             </button>
//                           )}

//                           {normalizedStatus === "Accepted" && (
//                             <button
//                               onClick={() =>
//                                 updateStatus(order._id, "Preparing")
//                               }
//                               className="block w-full bg-blue-500 text-white text-xs py-1 rounded"
//                             >
//                               Prepare
//                             </button>
//                           )}

//                           {normalizedStatus === "Preparing" && (
//                             <button
//                               onClick={() =>
//                                 updateStatus(
//                                   order._id,
//                                   "Out for Delivery"
//                                 )
//                               }
//                               className="block w-full bg-orange-500 text-white text-xs py-1 rounded"
//                             >
//                               Dispatch
//                             </button>
//                           )}

//                           {canCancel && (
//                             <button
//                               onClick={() => {
//                                 if (
//                                   !window.confirm("Cancel this order?")
//                                 )
//                                   return;
//                                 updateStatus(order._id, "Cancelled");
//                               }}
//                               className="block w-full bg-red-500 text-white text-xs py-1 rounded"
//                             >
//                               Cancel
//                             </button>
//                           )}
//                         </>
//                       )}
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {selectedOrder && (
//         <OrderDetailsModal
//           order={selectedOrder}
//           onClose={() => setSelectedOrder(null)}
//           onPrintInvoice={handlePrintInvoice}
//         />
//       )}

//       <NewOrderPopup
//         order={popupOrder}
//         onClose={() => setPopupOrder(null)}
//       />
//     </>
//   );
// };

// /* ================= MODAL ================= */
// const OrderDetailsModal = ({ order, onClose, onPrintInvoice }) => (
//   <div
//     className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
//     onClick={onClose}
//   >
//     <div
//       className="bg-white/90 w-full max-w-4xl rounded-lg shadow-lg overflow-hidden"
//       onClick={(e) => e.stopPropagation()}
//     >
//       {/* HEADER */}
//       <div className="flex justify-between items-center p-4 border-b">
//         <div>
//           <h2 className="font-bold text-lg">
//             Order #{order._id?.substring(0, 8)}
//           </h2>
//           <p className="text-xs text-gray-500">
//             {new Date(order.createdAt).toLocaleString()}
//           </p>
//         </div>

//         <div className="flex gap-2">
//           <button
//             onClick={() => onPrintInvoice(order)}
//             className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
//           >
//             Print Invoice
//           </button>
//           <button onClick={onClose}>✕</button>
//         </div>
//       </div>

//       {/* CUSTOMER + ORDER INFO */}
//       <div className="p-4 grid grid-cols-2 gap-4 text-sm border-b">
//         <div className="space-y-1">
//           <p>
//             <strong>Status:</strong> {order.orderStatus}
//           </p>
//           <p>
//             <strong>Payment:</strong> {order.paymentMethod} (
//             {order.paymentStatus})
//           </p>
//           <p>
//             <strong>Razorpay ID:</strong> {order.razorpayOrderId || "N/A"}
//           </p>
//         </div>

//         <div className="space-y-1">
//           <p>
//             <strong>Customer Phone:</strong>{" "}
//             {order.userDetails?.phone || "N/A"}
//           </p>
//           <p>
//             <strong>Customer Name:</strong>{" "}
//             {order.userDetails?.name || "******"}
//           </p>
//           <p>
//             <strong>Address:</strong> {order.shippingAddress}
//           </p>
//         </div>
//       </div>

//       {/* ITEMS */}
//       <div className="p-3 border-b">
//         <h3 className="font-semibold mb-3">Order Items</h3>

//         <div className="space-y-1 h-43 overflow-y-auto">
//           {order.items?.map((item) => (
//             <div
//               key={item._id}
//               className="flex gap-4 border rounded-lg p-3"
//             >
//               {/* IMAGE */}
//               <img
//                 src={item.product?.images?.[0]}
//                 alt={item.productName}
//                 className="w-20 h-20 object-cover rounded border"
//               />

//               {/* DETAILS */}
//               <div className="flex-1 text-sm space-y-1">
//                 <p className="font-semibold text-base">
//                   {item.productName}
//                 </p>
//                 <p className="text-gray-500">
//                   Variety: {item.varietyName}
//                 </p>
//                 <p className="text-gray-500">
//                   Price: ₹{item.price}
//                 </p>
//                 <p className="text-gray-500">
//                   Quantity: {item.quantity}
//                 </p>
//               </div>

//               <div className="font-semibold text-right">
//                 ₹{item.total}
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* BILL SUMMARY */}
//       <div className="p-4 text-sm space-y-1">
//         <div className="flex justify-between">
//           <span>Subtotal</span>
//           <span>₹{order.subTotal}</span>
//         </div>
//         <div className="flex justify-between">
//           <span>GST</span>
//           <span>₹{order.gstAmount}</span>

//         </div>
//         <div className="flex justify-between">
//           <span>Delivery</span>
//           <span>₹{order.deliveryCharge}</span>
//         </div>

//         <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
//           <span>Total</span>
//           <span>₹{order.totalAmount}</span>
//         </div>
//       </div>
//     </div>
//   </div>
// );

// export default LiveOrderTable;
