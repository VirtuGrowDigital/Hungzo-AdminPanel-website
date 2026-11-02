import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./Components/ProtectedRoute";
import { PERMISSIONS } from "./Config/permissions";
import LogoutPage from "./Pages/auth/LogoutPage";
import NotFound from "./Pages/auth/NotFound";
import OrdersPage from "./Pages/Orders/OrdersPage";
import Dashboard from "./Pages/Dashboard/Dashboard";
import Sidebar from "./Components/Sidebar";
import Login from "./Pages/auth/Login";
import Verifications from "./Pages/verification/Verifications";
import Suppliers from "./Pages/Suppliers/Suppliers";
import Driver from "./Pages/Drivers/Drivers";
import AddAdminPage from "./Pages/Admin/AddAdminPage";
import AdminListPage from "./Pages/Admin/AdminListPage";
import ProductsList from "./Pages/Product/ProductsList";
import AddProduct from "./Pages/Product/AddProduct";
import BulkProductImages from "./Pages/Product/BulkProductImages";
import CategoryManagement from "./Pages/Product/CategoryManagement";
import SubCategoryManagement from "./Pages/Product/SubCategoryManagement";
import Banner from "./Pages/Banner/Banner";
import RestaurantsWallet from "./Pages/Wallet/RestaurantsWallet";
import WalletsDetails from "./Pages/Wallet/WalletsDetails";
import Notification from "./Pages/notification/Notification";
import Rules from "./Pages/Rules/Rules";
import Restaurant from "./Pages/Restaurant/Restaurant";
import DriverOrder from "./Pages/Drivers/DriverOrder";
import Warehouse from "./Pages/Warehouse/Warehouse";
import UserOrders from "./Pages/Orders/UserOrders";
import BusinessHours from "./Pages/BusinessHours/BusinessHours";
import WalletOffers from "./Pages/Offers/WalletOffers";
import LegalDetails from "./Pages/LegalDetails/LegalDetails";
import BuyerGST from "./Pages/BuyerGST/BuyerGST";
import DeletionRequests from "./Pages/Users/DeletionRequests";
import AppConfiguration from "./Pages/AppConfiguration/AppConfiguration";
import Policies from "./Pages/Policies/Policies";
import CitiesStates from "./Pages/Locations/CitiesStates";
import Zones from "./Pages/Locations/Zones";
import WarehouseSettings from "./Pages/Locations/WarehouseSettings";
import ServiceabilityCheck from "./Pages/Locations/ServiceabilityCheck";
import Waitlist from "./Pages/Locations/Waitlist";
import InventoryGrid from "./Pages/Inventory/InventoryGrid";
import AdminScope from "./Pages/Admin/AdminScope";
import CityOrders from "./Pages/Orders/CityOrders";

export default function App() {
  const location = useLocation();

  const noSidebar = location.pathname === "/login";
  // Hide sidebar + header on login page

  return (
    <div className="h-screen w-full flex overflow-hidden bg-gray-100">
      <Toaster position="top-center" />

      {/* Sidebar visible only when logged in */}
      {!noSidebar && <Sidebar />}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* REMOVE PADDING → full area */}
        <main className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden">
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/Terms" element={<Rules />} />

            {/* Protected */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* <Route path="/payment" element={<ProtectedRoute><Transaction /></ProtectedRoute>} /> */}
            <Route
              path="/walletDetails"
              element={
                <ProtectedRoute>
                  <WalletsDetails />
                </ProtectedRoute>
              }
            />
            {/* was unprotected: reachable without logging in */}
            <Route
              path="/wallet/:userId"
              element={
                <ProtectedRoute permission={PERMISSIONS.CUSTOMERS.MANAGE_WALLET}>
                  <RestaurantsWallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/user/:userId"
              element={
                <ProtectedRoute permission={PERMISSIONS.ORDERS.VIEW}>
                  <UserOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logout"
              element={
                <ProtectedRoute>
                  <LogoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notification"
              element={
                <ProtectedRoute>
                  <Notification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/restaurants"
              element={<Navigate to="/users/profiles" replace />}
            />
            <Route
              path="/users/profiles"
              element={
                <ProtectedRoute>
                  <Restaurant />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/buyer-gst"
              element={
                <ProtectedRoute>
                  <BuyerGST />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/deletion-requests"
              element={
                <ProtectedRoute>
                  <DeletionRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification"
              element={
                <ProtectedRoute>
                  <Verifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drivers"
              element={
                <ProtectedRoute>
                  <Driver />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-admin"
              element={
                <ProtectedRoute>
                  <AddAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product"
              element={<Navigate to="/product/inventory" replace />}
            />
            <Route
              path="/product/inventory"
              element={
                <ProtectedRoute>
                  <ProductsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product/add"
              element={
                <ProtectedRoute>
                  <AddProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product/bulk-images"
              element={
                <ProtectedRoute>
                  <BulkProductImages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product/categories"
              element={
                <ProtectedRoute>
                  <CategoryManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product/subcategories"
              element={
                <ProtectedRoute>
                  <SubCategoryManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/banner"
              element={
                <ProtectedRoute>
                  <Banner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse"
              element={
                <ProtectedRoute>
                  <Warehouse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business-hours"
              element={
                <ProtectedRoute>
                  <BusinessHours />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app-configuration"
              element={
                <ProtectedRoute>
                  <AppConfiguration />
                </ProtectedRoute>
              }
            />
            {/* ---------------- Multi-city ---------------- */}
            <Route
              path="/locations/cities"
              element={
                <ProtectedRoute>
                  <CitiesStates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations/zones"
              element={
                <ProtectedRoute>
                  <Zones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations/warehouses"
              element={
                <ProtectedRoute>
                  <WarehouseSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations/serviceability"
              element={
                <ProtectedRoute>
                  <ServiceabilityCheck />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations/waitlist"
              element={
                <ProtectedRoute>
                  <Waitlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/cities"
              element={
                <ProtectedRoute>
                  <CityOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <InventoryGrid />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/scope"
              element={
                <ProtectedRoute>
                  <AdminScope />
                </ProtectedRoute>
              }
            />

            <Route
              path="/policies"
              element={
                <ProtectedRoute>
                  <Policies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/legal-details"
              element={
                <ProtectedRoute>
                  <LegalDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/offers/wallet"
              element={
                <ProtectedRoute>
                  <WalletOffers />
                </ProtectedRoute>
              }
            />
            {/* was unprotected: reachable without logging in */}
            <Route
              path="/driver-orders/:driverId"
              element={
                <ProtectedRoute permission={PERMISSIONS.DRIVERS.VIEW}>
                  <DriverOrder />
                </ProtectedRoute>
              }
            />
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
