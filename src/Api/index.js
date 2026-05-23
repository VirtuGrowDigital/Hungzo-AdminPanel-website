import axios from "axios";

// const API_BASE = "https://api.hungzo.in";
const API_BASE = "http://10.94.85.219:4000";
// const API_BASE = "https://hungzo-backend.onrender.com";


const API = axios.create({
  baseURL: API_BASE,
});

  // Attach token automatically
  API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

// ================= create ADMINS ================
export async function createAdmin(formData) {
  try {
    const res = await API.post("/admin/create", formData);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to create admin",
    };
  }
}

// ================= WAREHOUSE ==================
export async function getWarehouses() {
  try {
    const res = await API.get("/warehouses");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message: error.response?.data?.message || "Failed to fetch warehouses",
    };
  }
}

export async function createWarehouse(formData) {
  try {
    const res = await API.post("/warehouses/create", formData);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message: error.response?.data?.message || "Failed to create warehouse",
    };
  }
}

export async function updateWarehouse(id, formData) {
  try {
    const res = await API.put(`/warehouses/update/${id}`, formData);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message: error.response?.data?.message || "Failed to update warehouse",
    };
  }
}

export async function deleteWarehouse(id) {
  try {
    const res = await API.delete(`/warehouses/delete/${id}`);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message: error.response?.data?.message || "Failed to delete warehouse",
    };
  }
}

// ================= DELETE ADMIN ==================
export async function deleteAdmin(id) {
  try {
    const res = await API.delete(`${API_BASE}/admin/delete/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting admin:", error.response?.data || error.message);
    return {
      ok: false,
      message: error.response?.data?.message || "Failed to delete admin",
    };
  }
}
// ================= ADMIN List ==================
export async function AdminList() {
  try {
    const res = await API.get(`${API_BASE}/admin/list`);
    return res.data;
  } catch (error) {
    console.error("Error fetching admin list:", error.response?.data || error.message);
    return {
      ok: false,
      message: error.response?.data?.message || "Failed to fetch admin list",
    };
  }
}

// ================= RESTAURANT ==================


// ================= RESTAURANTLIST =================

export async function restaurantprofile() {
  try {
    const res = await API.get("/restaurants/profile");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch restaurant list",
    };
  }
}
// ================= Only Logged User RESTAURANTLIST ==================

export async function restaurantOnlyLogged() {
  try {
    const res = await API.get("/admin/dashboard/pending-users");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch restaurant list",
    };
  }
}

export async function getUserProfiles() {
  try {
    const res = await API.get("/admin/dashboard/users/profiles");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch user profiles",
    };
  }
}

export async function getStoreSettings() {
  try {
    const res = await API.get("/admin/store-settings");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch store settings",
    };
  }
}

export async function updateStoreSettings(payload) {
  try {
    const res = await API.put("/admin/store-settings", payload);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to update store settings",
    };
  }
}

export async function getPolicyDocuments() {
  try {
    const res = await API.get("/admin/policies");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch policy documents",
    };
  }
}

export async function updatePolicyDocuments(policies) {
  try {
    const res = await API.put("/admin/policies", { policies });
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to update policy documents",
    };
  }
}

export async function getBuyerGstRequests() {
  try {
    const res = await API.get("/admin/buyer-gst");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch buyer GST requests",
    };
  }
}

export async function approveBuyerGstRequest(userId) {
  try {
    const res = await API.post(`/admin/buyer-gst/${userId}/approve`);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to approve buyer GST request",
    };
  }
}

export async function rejectBuyerGstRequest(userId, rejectionReason = "") {
  try {
    const res = await API.post(`/admin/buyer-gst/${userId}/reject`, {
      rejectionReason,
    });
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to reject buyer GST request",
    };
  }
}

export async function getAccountDeletionRequests(params = {}) {
  try {
    const res = await API.get("/admin/account-deletion-requests", {
      params,
    });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch account deletion requests",
    };
  }
}

export async function getAccountDeletionRequestById(requestId) {
  try {
    const res = await API.get(`/admin/account-deletion-requests/${requestId}`);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch account deletion request details",
    };
  }
}

export async function getNotificationCampaigns(limit = 50) {
  try {
    const res = await API.get("/admin/notifications/campaigns", {
      params: { limit },
    });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch notification campaigns",
    };
  }
}

export async function createNotificationCampaign(payload) {
  try {
    const res = await API.post("/admin/notifications/campaigns", payload);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to send notification campaign",
    };
  }
}

export async function approveAccountDeletionRequest(
  requestId,
  reviewNotes = "",
) {
  try {
    const res = await API.post(
      `/admin/account-deletion-requests/${requestId}/approve`,
      { reviewNotes },
    );
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to approve account deletion request",
      error: error.response?.data,
    };
  }
}

export async function rejectAccountDeletionRequest(
  requestId,
  reviewReason,
  reviewNotes = "",
) {
  try {
    const res = await API.post(
      `/admin/account-deletion-requests/${requestId}/reject`,
      { reviewReason, reviewNotes },
    );
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to reject account deletion request",
      error: error.response?.data,
    };
  }
}

// ================= RESTAURANT PENDING LIST ==================
export async function restaurantList() {
  try {
    const res = await API.get("/admin/dashboard/restaurants/pending");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch restaurant list",
    };
  }
}
// ================= RESTAURANT rejected LIST ==================
export async function restaurantRejected() {
  try {
    const res = await API.get("/admin/dashboard/restaurants/rejected");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch restaurant list",
    };
  }
}
// =================  APPROVEd RESTAURANT LIST ==================
export async function restaurantApproved() {
  try {
    const res = await API.get("/admin/dashboard/restaurants/verified");
    // console.log(res);

    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch restaurant list",
    };
  }
}


// ================= RESTAURANT APPROVE =================
export async function approveRestaurantReq(id) {
  try {
    const res = await API.post(
      `${API_BASE}/admin/restaurants/approve/${id}`
    );
    return res.data;
  } catch (error) {
    console.error(
      `restaurants/approve/${id}`,
      error.response?.data || error.message
    );
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to approve restaurant",
    };
  }
}

// ================= RESTAURANT REJECT =================
export async function rejectRestaurantReq(id) {
  try {
    const res = await API.post(
      `${API_BASE}/admin/restaurants/reject/${id}`
    );
    return res.data;
  } catch (error) {
    console.error(
      `restaurants/reject/${id}`,
      error.response?.data || error.message
    );
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to reject restaurant",
    };
  }
}


// ================= Drivers ==================


// ================= Drivers Penddind LIST ==================

export async function DriversList() {
  try {
    const res = await API.get("/admin/dashboard/drivers/pending");
    // console.log(res.data);
    return res.data;
  }
  catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch Driver list",
    };
  }
}


// =================  rejected Driver LIST ==================
export async function DriverRejected() {
  try {
    const res = await API.get("/admin/dashboard/drivers/rejected");
    console.log(res.data);

    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch restaurant list",
    };
  }
}
// =================  APPROVED Driver LIST ==================
export async function DriverApproved() {
  try {
    const res = await API.get("admin/dashboard/drivers/verified");
    // console.log(res);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch restaurant list",
    };
  }
}
// ================= Driver APPROVE =================
export async function approveDriverReq(id) {
  try {
    const res = await API.post(
      `${API_BASE}/admin/drivers/approve/${id}`
    );
    return res.data;
  } catch (error) {
    console.error(
      `drivers/approve/${id}`,
      error.response?.data || error.message
    );
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to approve  dreivers",
    };
  }
}

// ================= Driver REJECT =================
export async function rejectDriverReq(id) {
  try {
    const res = await API.post(
      `${API_BASE}/admin/drivers/reject/${id}`
    );
    return res.data;
  } catch (error) {
    console.error(
      `drivers/reject/${id}`,
      error.response?.data || error.message
    );
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to reject driver",
    };
  }
}

export async function blockDriverReq(id, payload) {
  try {
    const res = await API.post(`/admin/drivers/${id}/block`, payload);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to block driver",
    };
  }
}

export async function unblockDriverReq(id, payload = {}) {
  try {
    const res = await API.post(`/admin/drivers/${id}/unblock`, payload);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to unblock driver",
    };
  }
}

export async function fetchDriverRestrictionHistory(driverId) {
  try {
    const res = await API.get(`/admin/dashboard/drivers/${driverId}/restrictions`);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch restriction history",
    };
  }
}

// ////////////////// Driver Order ////////
export async function DriverOrder(driverId) {
  try {
    const res = await API.get(`/admin/dashboard/drivers/${driverId}/orders`);
    console.log(res);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch driver orders",
    };
  }
}
// =================  =================

/* ================= FETCH CATEGORIES ================= */
export async function fetchCategories() {
  try {
    const res = await API.get("/categories/all");
    return {
      ok: true,
      categories: res.data.categories,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch categories",
    };
  }
}

export async function createCategory(formData) {
  try {
    const res = await API.post("/categories/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to create category",
    };
  }
}

export async function updateCategory(id, formData) {
  try {
    const res = await API.put(`/categories/update/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to update category",
    };
  }
}

export async function deleteCategory(id) {
  try {
    const res = await API.delete(`/categories/delete/${id}`);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to delete category",
    };
  }
}

/* ================= CREATE PRODUCT ================= */
export async function createProduct(formData) {
  try {
    const res = await API.post("/products/create", formData);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to create product",
    };
  }
}

export async function bulkImportProducts(payload) {
  try {
    const res = await API.post("/products/bulk-import", payload);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to bulk import products",
      data: error.response?.data,
    };
  }
}



/* ================= GET ALL ACTIVE PRODUCTS (PUBLIC) ================= */
export async function getActiveProducts() {
  try {
    const res = await API.get("/products");
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch products",
    };
  }
}

/* ================= GET PRODUCT BY ID (PUBLIC) ================= */
export async function getProductById(id) {
  try {
    const res = await API.get(`/products/${id}`);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch product",
    };
  }
}

/* ================= MY PRODUCTS (ADMIN) ================= */
export async function myProducts(params = {}) {
  try {
    const res = await API.get("/products/admin/my", { params });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch my products",
    };
  }
}

/* ================= UPDATE PRODUCT (ADMIN) ================= */
export async function updateProduct(id, formData) {
  try {
    const res = await API.put(`/products/update/${id}`, formData);
    return { ok: true, data: res.data };
  } catch (error) {
    console.error("Update Product Error:", error.response?.data || error.message);
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to update product",
    };
  }
}

/* ================= DELETE PRODUCT (ADMIN) ================= */
export async function deleteProduct(id) {
  try {
    const res = await API.delete(`/products/delete/${id}`);
    return { ok: true, data: res.data };
  } catch (error) {
    console.error("Delete Product Error:", error.response?.data || error.message);
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to delete product",
    };
  }
}

export async function fetchProductReviewsAdmin(productId) {
  try {
    const res = await API.get(`/reviews/product/${productId}/admin`);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch product reviews",
    };
  }
}

export async function updateProductReviewStatus(reviewId, status) {
  try {
    const res = await API.patch(`/reviews/${reviewId}/status`, { status });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to update review status",
    };
  }
}

export async function fetchDriverReviewsAdmin(driverId) {
  try {
    const res = await API.get(`/reviews/driver/${driverId}/admin`);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch driver reviews",
    };
  }
}


/* =================  ORDERS API ================= */

/* ================= GET ADMIN ORDERS ================= */
export async function getAdminOrders() {
  try {
    const res = await API.get("/orders/admin");
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message || "Failed to fetch admin orders",
    };
  }
}


/* ================= GET ALL ORDERS (SUPERADMIN) ================= */
export async function getAllOrders() {
  try {
    const res = await API.get("/orders/all");
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message || "Failed to fetch all orders",
    };
  }
}

/* ================= GET ORDERS BY USER ================= */
export async function getOrdersByUser(userId) {
  try {
    const res = await API.get(`/orders/admin/user/${userId}`);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch user orders",
    };
  }
}


/* ================= UPDATE ORDER STATUS ================= */
export async function updateOrderStatus(orderId, status) {
  try {
    const res = await API.put(`/orders/status/${orderId}`, { orderStatus: status });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message || "Failed to update order status",
    };
  }
}

export async function approveOrderRefund(orderId, payload = {}) {
  try {
    const res = await API.post(`/orders/${orderId}/refund/approve`, payload);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to approve order refund",
    };
  }
}

export async function assignWarehouseToOrder(orderId, warehouseId) {
  try {
    const res = await API.put(`/orders/warehouse/${orderId}`, { warehouseId });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message || "Failed to assign warehouse",
    };
  }
}

export async function verifyPickupOtp(orderId, otp) {
  try {
    const res = await API.post(`/orders/pickup-verify/${orderId}`, { otp });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message || "Failed to verify pickup OTP",
    };
  }
}


/* ================= GET SINGLE ORDER ================= */
export async function getOrderById(orderId) {
  try {
    const res = await API.get(`/orders/${orderId}`);
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message: error.response?.data?.message || "Failed to fetch order",
    };
  }
}

export async function downloadOrderInvoice(orderId) {
  try {
    const res = await API.get(`/orders/${orderId}/invoice`, {
      responseType: "blob",
    });
    return {
      ok: true,
      blob: res.data,
      contentDisposition: res.headers["content-disposition"] || "",
    };
  } catch (error) {
    let message = "Failed to download invoice";
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        message = parsed?.message || message;
      } catch (_) {
        // Keep fallback message.
      }
    } else {
      message = error.response?.data?.message || message;
    }

    return {
      ok: false,
      message,
    };
  }
}


/* ================= GET ADMIN RETURN ORDERS ================= */
export async function getReturnOrders() {
  try {
    const res = await API.get("/returns/admin/all");
    console.log(res);

    return { ok: true, data: res.data };
  } catch (error) {
    console.error(
      "Error fetching return orders:",
      error.response?.data || error.message
    );

    return {
      ok: false,
      error: error.response?.data || {
        message: "Failed to fetch return orders",
      },
    };
  }
}

/* ================= APPROVE / REJECT RETURN REQUEST ================= */
export async function updateReturnStatus(returnId, status, adminRemark = "") {
  try {
    const res = await API.put(`/returns/${returnId}`, {
      status,
      adminRemark,
    });

    return { ok: true, data: res.data };
  } catch (error) {
    console.error(
      "Update Return Status Error:",
      error.response?.data || error.message
    );

    return {
      ok: false,
      error: error.response?.data || {
        message: "Failed to update return status",
      },
    };
  }
}



// ================= Banner ==================
// ================= create Banner ==================
export async function createBanner(formData) {
  try {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    const res = await API.post("/banners/create", formData, config);
    return { ok: true, data: res.data };
  } catch (error) {
    console.error("Create banner error:", error);
    console.error("Error response:", error.response?.data);

    return {
      ok: false,
      message: error.response?.data?.message || error.response?.data?.error || "Failed to create banner",
      error: error.response?.data,
    };
  }
}
// =================get  BannerLIST ==================

export async function BannersList() {
  try {
    const res = await API.get("/banners/all");
    return { ok: true, data: res.data };
  }
  catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch banners",
    };
  }
}
/* ================= DELETE Banner ================= */
export async function DeleteBanner(id) {
  try {
    const res = await API.delete(`/banners/delete/${id}`);
    return { ok: true, data: res.data };
  } catch (error) {
    console.error("Delete Product Error:", error.response?.data || error.message);
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to delete product",
    };
  }
}

/* ================= UPDATE Banner ================= */

export async function updateBanner(id, formData) {
  try {
    const res = await API.put(
      `/banners/update/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return { ok: true, data: res.data };
  } catch (error) {
    console.error(
      "Update Banner Error:",
      error.response?.data || error.message
    );

    return {
      ok: false,
      message: error.response?.data?.message || "Failed to update banner",
    };
  }
}


//  ////////// Wallet 
// =================get  Wallet LIST ==================

export async function WalletList() {
  try {
    const res = await API.get("/wallet/admin/all");

    return res.data;
  }
  catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message ||
        "Failed to fetch Wallet list",
    };
  }
}


// ================= ADMIN WALLET CREDIT ==================
export async function creditWallet(data) {
  try {
    const res = await API.post("/wallet/admin/credit", data);
    return { ok: true, data: res.data };
  } catch (error) {
    console.error("Credit Wallet Error:", error.response?.data || error.message);
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to credit wallet",
    };
  }
}

// ================= ADMIN WALLET DEBIT ==================
export async function debitWallet(data) {
  try {
    const res = await API.post("/wallet/admin/debit", data);
    return { ok: true, data: res.data };
  } catch (error) {
    console.error("Debit Wallet Error:", error.response?.data || error.message);
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to debit wallet",
    };
  }
}

// ================= USER TRANSACTIONS WITH PAGINATION ==================
export async function getUserTransactions(userId, page = 1, limit = 20) {
  try {
    const res = await API.get(`/wallet/admin/user/${userId}/transactions`, {
      params: {
        page,
        limit
      }
    });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch user transactions",
    };
  }
}

// ================= ALTERNATIVE VERSION WITH FLEXIBLE PARAMS ==================
export async function getUserTransactionsWithParams(userId, params = {}) {
  try {
    const res = await API.get(`/wallet/admin/user/${userId}/transactions`, {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        ...params
      }
    });
    return { ok: true, data: res.data };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.message || "Failed to fetch user transactions",
    };
  }
}

// ================= WALLET OFFERS ==================
export async function getWalletOffers() {
  try {
    const res = await API.get("/offers/admin/wallet");
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch wallet offers",
    };
  }
}

export async function createWalletOffer(data) {
  try {
    const res = await API.post("/offers/admin/wallet", data);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to create wallet offer",
    };
  }
}

export async function updateWalletOffer(id, data) {
  try {
    const res = await API.put(`/offers/admin/wallet/${id}`, data);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to update wallet offer",
    };
  }
}

export async function toggleWalletOffer(id) {
  try {
    const res = await API.patch(`/offers/admin/wallet/${id}/toggle`);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to toggle wallet offer",
    };
  }
}

export async function deleteWalletOffer(id) {
  try {
    const res = await API.delete(`/offers/admin/wallet/${id}`);
    return res.data;
  } catch (error) {
    return {
      ok: false,
      success: false,
      message:
        error.response?.data?.message || "Failed to delete wallet offer",
    };
  }
}
