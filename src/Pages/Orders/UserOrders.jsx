import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getOrdersByUser } from "../../Api";

const getStatusColor = (status) => {
    switch (status) {
        case "Delivered":
            return "bg-green-100 text-green-700";
        case "Pending":
            return "bg-yellow-100 text-yellow-700";
        case "Cancelled":
            return "bg-red-100 text-red-700";
        default:
            return "bg-gray-100 text-gray-700";
    }
};

const asAmount = (value) => {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric : 0;
};

const getAdminOrderTotal = (order) =>
    Math.max(asAmount(order?.totalAmount) - asAmount(order?.gstAmount), 0);

const UserOrders = () => {
    const { userId } = useParams();
    const [orders, setOrders] = useState([]);

    const fetchOrders = async () => {
        const res = await getOrdersByUser(userId);
        if (res.ok) setOrders(res.data.orders || []);
    };

    useEffect(() => {
        fetchOrders();
    }, [userId]);

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

            {/* HEADER */}
            <h1 className="text-2xl font-bold mb-4">
                📦 User Orders ({orders.length})
            </h1>

            {/* LIST */}
            <div className="space-y-4">

                {orders.length > 0 ? (
                    orders.map((order) => (
                        <div
                            key={order._id}
                            className="bg-white rounded-xl shadow border p-4"
                        >

                            {/* TOP BAR */}
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        Order #{order._id.slice(-6)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(order.createdAt).toLocaleString("en-IN")}
                                    </p>
                                </div>

                                <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(order.orderStatus)}`}>
                                    {order.orderStatus}
                                </span>
                            </div>

                            <div className="mb-3 border rounded-lg p-3 bg-blue-50">
                                <p className="font-semibold text-sm mb-2">👤 Customer Details</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <p><b>Name:</b> {order.userDetails?.name || order.user?.name || "—"}</p>

                                    <p><b>Phone:</b> {order.userDetails?.phone || order.user?.phone || "—"}</p>

                                    <p><b>Email:</b> {order.userDetails?.email || order.user?.email || "—"}</p>

                                    <p>
                                        <b>Address:</b>{" "}
                                        {order.userDetails
                                            ? `${order.userDetails.area}, ${order.userDetails.city}, ${order.userDetails.state} - ${order.userDetails.pincode}`
                                            : order.shippingAddress}
                                    </p>
                                </div>
                            </div>


                            {/* ITEMS */}
                            <div className="border rounded-lg p-3 bg-gray-50 mb-3">
                                <p className="font-semibold text-sm mb-2">Items</p>

                                {order.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm mb-1">
                                        <span>
                                            {item.productName} ({item.varietyName}) × {item.quantity}
                                        </span>
                                        <span>₹{item.total}</span>
                                    </div>
                                ))}
                            </div>

                            {/* PAYMENT + AMOUNT */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                                <p><b>Total:</b> ₹{getAdminOrderTotal(order)}</p>
                                <p><b>Payment:</b> {order.paymentMethod}</p>
                                <p><b>Status:</b> {order.paymentStatus}</p>
                                <p><b>Type:</b> {order.fulfillmentType}</p>
                            </div>

                            {/* ADDRESS */}
                            <div className="text-sm mb-3">
                                <p className="font-semibold">📍 Address</p>
                                <p className="text-gray-600">
                                    {order.userDetails?.address || order.shippingAddress}
                                </p>
                            </div>

                            {/* TIMELINE */}
                            <div className="text-xs text-gray-500 space-y-1 border-t pt-2">
                                <p>🕒 Placed: {order.createdAt && new Date(order.createdAt).toLocaleTimeString()}</p>
                                {order.adminAcceptedAt && <p>✅ Accepted: {new Date(order.adminAcceptedAt).toLocaleTimeString()}</p>}
                                {order.packedAt && <p>📦 Packed: {new Date(order.packedAt).toLocaleTimeString()}</p>}
                                {order.pickedAt && <p>🚚 Picked: {new Date(order.pickedAt).toLocaleTimeString()}</p>}
                                {order.deliveredAt && <p>🎉 Delivered: {new Date(order.deliveredAt).toLocaleTimeString()}</p>}
                                {order.cancelledAt && <p>❌ Cancelled: {new Date(order.cancelledAt).toLocaleTimeString()}</p>}
                            </div>

                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 mt-10">
                        No orders found
                    </p>
                )}

            </div>
        </div>
    );
};

export default UserOrders;
