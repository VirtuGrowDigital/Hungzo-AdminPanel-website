import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../Api/index";

const AuthContext = createContext(null);

const STORAGE_KEY = "ecom_admin_auth";
const TOKEN_KEY = "token";

// ⏰  TIME → 2days
const EXPIRY_TIME = 42 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const navigate = useNavigate();

  /* ----------------------------------------
     LOAD AUTH ON APP START
  ---------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsHydrated(true);
      return;
    }

    try {
      const data = JSON.parse(stored);

      // ❌ expired on refresh
      if (Date.now() > data.expiresAt) {
        clearAuth();
        setIsHydrated(true);
        return;
      }

      setUser(data);
    } catch {
      clearAuth();
    } finally {
      setIsHydrated(true);
    }
  }, []);

  /* ----------------------------------------
     LIVE AUTO LOGOUT (CHECK EVERY SECOND)
  ---------------------------------------- */
  useEffect(() => {
    if (!user?.expiresAt) return;

    const interval = setInterval(() => {
      if (Date.now() > user.expiresAt) {
        logout("Session expired");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  /* ----------------------------------------
     LOGIN
  ---------------------------------------- */
  const login = async ({ username, password }) => {
    try {
      const res = await API.post("auth/admin/login", {
        username,
        password,
      });
      console.log(res);

      const payload = {
        username,
        role: res.data.admin.role,
        AdminID: res.data.admin.id,
        token: res.data.accessToken,
        expiresAt: Date.now() + EXPIRY_TIME,
      };

      localStorage.setItem(TOKEN_KEY, res.data.accessToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      setUser(payload);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err.response?.data?.message || "Login failed",
      };
    }
  };

  /* ----------------------------------------
     LOGOUT
  ---------------------------------------- */
  const logout = (reason) => {
    clearAuth();
    navigate("/login", { replace: true });

    if (reason) {
      console.warn(reason);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isHydrated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
