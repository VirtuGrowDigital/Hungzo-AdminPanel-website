import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthProvider";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
