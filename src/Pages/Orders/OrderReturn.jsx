import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Download,
  Filter,
  Search,
  AlertCircle,
  User,
  Package,
  DollarSign,
  Calendar,
  X,
  Image as ImageIcon,
  Hash,
  FileText,
  MessageSquare,
  Tag,
  Phone,
  Mail,
  ShoppingBag,
  ArrowLeft,
  ShoppingCart,
  Receipt,
  Info,
  ExternalLink
} from "lucide-react";
import { getReturnOrders, updateReturnStatus } from "../../Api/index";

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

const OrderReturn = () => {
  const [returns, setReturns] = useState([]);
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remark, setRemark] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusConfig = {
    REQUESTED: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Requested" },
    APPROVED: { color: "bg-green-100 text-green-800 border-green-200", label: "Approved" },
    REJECTED: { color: "bg-red-100 text-red-800 border-red-200", label: "Rejected" },
    PROCESSED: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Processed" },
    COMPLETED: { color: "bg-purple-100 text-purple-800 border-purple-200", label: "Completed" }
  };

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await getReturnOrders();
      console.log("API Response:", res); // Debug log
      if (res?.ok) {
        const returnsData = res.data?.returns || [];
        console.log("Returns Data:", returnsData); // Debug log
        setReturns(returnsData);
        setFilteredReturns(returnsData);
      } else {
        showNotification(res?.error?.message || "Failed to fetch return orders", "error");
      }
    } catch (err) {
      console.error("Fetch Returns Error:", err);
      showNotification("Something went wrong while fetching return orders", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    let filtered = returns;

    if (statusFilter !== "ALL") {
      filtered = filtered.filter(ret => ret.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ret =>
        ret.user?.name?.toLowerCase().includes(term) ||
        ret.user?.email?.toLowerCase().includes(term) ||
        ret.product?.name?.toLowerCase().includes(term) ||
        ret.reason?.toLowerCase().includes(term) ||
        ret._id?.toLowerCase().includes(term) ||
        ret.order?._id?.toLowerCase().includes(term)
      );
    }

    setFilteredReturns(filtered);
  }, [statusFilter, searchTerm, returns]);

  const handleUpdateStatus = async (id, status) => {
    if (!id) return;

    if (status === "REJECTED" && !remark.trim()) {
      showNotification("Please enter remark before rejecting", "warning");
      return;
    }

    try {
      const res = await updateReturnStatus(id, status, remark);
      if (res?.ok) {
        showNotification(res.data?.message || "Status updated successfully", "success");
        setRemark("");
        setSelectedId(null);
        fetchReturns();
        if (isModalOpen && selectedReturn?._id === id) {
          // Refresh modal data
          const updatedReturn = returns.find(r => r._id === id);
          if (updatedReturn) {
            setSelectedReturn(updatedReturn);
          }
        }
      } else {
        console.log("Update Return Failed:", res);
        showNotification(res?.error?.message || "Failed to update status", "error");
      }
    } catch (err) {
      console.error("Update Return Error:", err);
      showNotification("Something went wrong while updating return status", "error");
    }
  };

  const showNotification = (message, type) => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium transform transition-all duration-300 z-[9999] ${type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
        'bg-yellow-500'
      }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800 border-gray-200", label: status };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(returns, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `return-orders-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showNotification("Data exported successfully", "success");
  };

  const getStats = () => {
    return {
      total: returns.length,
      pending: returns.filter(r => r.status === 'REQUESTED').length,
      approved: returns.filter(r => r.status === 'APPROVED').length,
      rejected: returns.filter(r => r.status === 'REJECTED').length,
    };
  };

  const openModal = (ret) => {
    setSelectedReturn(ret);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReturn(null);
    setSelectedId(null);
    setRemark("");
    document.body.style.overflow = 'auto';
  };

  const stats = getStats();

  return (
    <div className="min-h-full bg-gray-50 pb-4">
      {/* Header */}
      <div className=" ">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
          <div>
            <h1 className="text-2xl md:text-2xl font-bold text-gray-900">Return Orders Management</h1>
            <p className="text-gray-600 mt-1 text-sm">Manage and process customer return requests</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchReturns}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mb-0">
          <div className="bg-white rounded-md p-2 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-gray-600">Total Returns</p>
                <p className="text-sm font-bold text-gray-900 mt-0">{stats.total}</p>
              </div>
              <div className="p-0.5 bg-blue-50 rounded">
                <RefreshCw size={12} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md p-2 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-gray-600">Pending</p>
                <p className="text-sm font-bold text-gray-900 mt-0">{stats.pending}</p>
              </div>
              <div className="p-0.5 bg-yellow-50 rounded">
                <AlertCircle size={12} className="text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md p-2 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-gray-600">Approved</p>
                <p className="text-sm font-bold text-gray-900 mt-0">{stats.approved}</p>
              </div>
              <div className="p-0.5 bg-green-50 rounded">
                <CheckCircle size={12} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md p-2 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-gray-600">Rejected</p>
                <p className="text-sm font-bold text-gray-900 mt-0">{stats.rejected}</p>
              </div>
              <div className="p-0.5 bg-red-50 rounded">
                <XCircle size={12} className="text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 mb-1">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by customer, product, order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-7 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PROCESSED">Processed</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw size={32} className="text-blue-600 animate-spin mb-3" />
            <p className="text-gray-600 text-sm">Loading return requests...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5">
            <Package size={48} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No return requests found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="overflow-x-auto h-[62vh] overflow-y-auto ">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</span>
                  </th>
                  <th className="py-3 px-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</span>
                  </th>
                  <th className="py-3 px-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Fulfillment Type</span>
                  </th>
                  <th className="py-3 px-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReturns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Hash size={14} className="text-gray-400" />
                          <span className="font-mono text-sm font-medium text-gray-900">
                            #{ret._id?.substring(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{formatDate(ret.createdAt)}</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Amount: </span>
                          <span className="text-green-600 font-semibold">₹{ret.refundAmount}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {ret.user?.name?.charAt(0) || ret.user?.email?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{ret.user?.name || ret.user?.email?.split('@')[0] || 'Customer'}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[120px]">{ret.user?.email || ''}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatFulfillmentType(ret.order?.fulfillmentType || ret.fulfillmentType)}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={ret.status} />
                        {ret.adminRemark && (
                          <div className="mt-1">
                            <span className="text-xs text-gray-500">Remark:</span>
                            <p className="text-xs text-gray-700 line-clamp-1">{ret.adminRemark}</p>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openModal(ret)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Eye size={14} />
                          View Details
                        </button>

                        {ret.status === "REQUESTED" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(ret._id, "APPROVED")}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle size={12} />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedId(ret._id);
                                openModal(ret);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle size={12} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Summary */}
   

      {/* Modal */}
      {isModalOpen && selectedReturn && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeModal}
          />

          {/* Modal Container */}
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Modal Content */}
            <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeModal}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X size={20} />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Return Order Details</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-sm text-gray-600">#{selectedReturn._id?.substring(0, 12)}...</span>
                        <StatusBadge status={selectedReturn.status} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar size={14} />
                      <span>{formatDate(selectedReturn.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="max-h-[70vh] overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <ShoppingBag size={18} />
                        Order Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-600">Return ID</span>
                          <p className="text-sm font-mono font-medium mt-1">{selectedReturn._id}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-600">Order ID</span>
                          <p className="text-sm font-mono font-medium mt-1">{selectedReturn.order?._id || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-600">Refund Amount</span>
                          <p className="text-2xl font-bold text-green-600">₹{selectedReturn.refundAmount}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-600">Quantity</span>
                          <p className="text-lg font-semibold text-gray-900">{selectedReturn.quantity}</p>
                        </div>
                        {selectedReturn.order?.totalAmount && (
                          <div className="col-span-2 space-y-1">
                            <span className="text-xs text-gray-600">Original Order Amount</span>
                            <p className="text-lg font-semibold text-gray-900">₹{getAdminOrderTotal(selectedReturn.order)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User size={18} />
                        Customer Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {selectedReturn.user?.name?.charAt(0) || selectedReturn.user?.email?.charAt(0) || 'C'}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{selectedReturn.user?.name || selectedReturn.user?.email?.split('@')[0] || 'Customer'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Mail size={14} className="text-gray-400" />
                              <p className="text-sm text-gray-600">{selectedReturn.user?.email || 'N/A'}</p>
                            </div>
                            {selectedReturn.user?.phone && (
                              <div className="flex items-center gap-2 mt-1">
                                <Phone size={14} className="text-gray-400" />
                                <p className="text-sm text-gray-600">{selectedReturn.user?.phone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <span className="text-xs text-gray-600">Customer ID</span>
                            <p className="text-sm font-mono font-medium mt-1">{selectedReturn.user?._id?.substring(0, 10)}...</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Request Date</span>
                            <p className="text-sm font-medium mt-1">{formatDate(selectedReturn.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Return Details */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageSquare size={18} />
                        Return Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Return Reason</span>
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Important</span>
                          </div>
                          <p className="text-sm font-medium mt-1 bg-white p-3 rounded-lg border border-gray-200">
                            {selectedReturn.reason || 'No reason provided'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Description</span>
                          <p className="text-sm text-gray-700 mt-1 bg-white p-3 rounded-lg border border-gray-200 min-h-[80px]">
                            {selectedReturn.description || 'No description provided'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Info size={14} className="text-gray-400" />
                            <span className="text-gray-600">Status:</span>
                          </div>
                          <StatusBadge status={selectedReturn.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Product Information */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Package size={18} />
                        Product Information
                      </h3>
                      <div className="flex gap-4">
                        <img
                          src={selectedReturn.product?.images?.[0] || "https://via.placeholder.com/100?text=No+Image"}
                          alt={selectedReturn.product?.name}
                          className="w-24 h-24 rounded-xl object-cover border border-gray-300"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/100?text=No+Image";
                          }}
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg">{selectedReturn.product?.name || 'N/A'}</h4>
                          <div className="mt-3 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Product ID:</span>
                              <span className="text-sm font-medium font-mono">{selectedReturn.product?._id?.substring(0, 10)}...</span>
                            </div>



                          </div>
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">Return Qty:</span>
                              <span className="text-lg font-bold text-red-600">{selectedReturn.quantity} units</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Return Images */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <ImageIcon size={18} />
                        Return Images
                      </h3>
                      {selectedReturn.images && selectedReturn.images.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                          {selectedReturn.images.map((img, index) => (
                            <a
                              key={index}
                              href={img}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative block rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all"
                            >
                              <img
                                src={img}
                                alt={`Return ${index + 1}`}
                                className="w-full h-28 object-cover"
                                onError={(e) => {
                                  e.target.src = "https://via.placeholder.com/150?text=Error";
                                }}
                              />

                              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                {index + 1}
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <ImageIcon size={48} className="text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">No images provided by customer</p>
                        </div>
                      )}
                    </div>

                    {/* Admin Actions */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Admin Actions</h3>

                      {/* Show existing remark if status is not REQUESTED */}
                      {selectedReturn.status !== "REQUESTED" && selectedReturn.adminRemark && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag size={16} className="text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Admin Remark:</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-gray-300">
                            <p className="text-sm text-gray-700">{selectedReturn.adminRemark}</p>
                          </div>
                        </div>
                      )}

                      {/* Action buttons for REQUESTED status */}
                      {selectedReturn.status === "REQUESTED" && (
                        <div className="space-y-4">
                          {selectedId === selectedReturn._id ? (
                            // Rejection remark input
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  <span className="text-red-600">*</span> Rejection Remark (Required)
                                </label>
                                <textarea
                                  placeholder="Enter detailed reason for rejection. This will be shared with the customer..."
                                  value={remark}
                                  onChange={(e) => setRemark(e.target.value)}
                                  rows="3"
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm"
                                />
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    setSelectedId(null);
                                    setRemark("");
                                  }}
                                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(selectedReturn._id, "REJECTED")}
                                  disabled={!remark.trim()}
                                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                                >
                                  Confirm Rejection
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Default action buttons
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => handleUpdateStatus(selectedReturn._id, "APPROVED")}
                                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-medium"
                              >
                                <CheckCircle size={18} />
                                Approve Return
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedId(selectedReturn._id);
                                  setRemark("");
                                }}
                                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl font-medium"
                              >
                                <XCircle size={18} />
                                Reject Return
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status message for non-REQUESTED */}
                      {selectedReturn.status !== "REQUESTED" && !selectedId && (
                        <div className="text-center py-4">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${selectedReturn.status === 'APPROVED' ? 'bg-green-100 text-green-800' : selectedReturn.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                            {selectedReturn.status === 'APPROVED' ? <CheckCircle size={16} className="text-green-600" /> :
                              selectedReturn.status === 'REJECTED' ? <XCircle size={16} className="text-red-600" /> :
                                <Info size={16} className="text-blue-600" />}
                            <span className="text-sm">
                              This return has been {selectedReturn.status.toLowerCase()}
                              {selectedReturn.adminRemark ? ' with remark' : ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={closeModal}
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition"
                  >
                    <ArrowLeft size={16} />
                    Back to List
                  </button>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div>
                      <span className="text-gray-400">Last updated: </span>
                      <span className="font-medium">{formatDate(selectedReturn.updatedAt || selectedReturn.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderReturn;
