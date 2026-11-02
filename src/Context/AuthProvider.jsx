import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import API from "../Api/index";
import { hasPermission as checkPermission } from "../Config/permissions";

const AuthContext = createContext(null);

const STORAGE_KEY = "ecom_admin_auth";
const TOKEN_KEY = "token";
const REFRESH_KEY = "refreshToken";
const EXPIRY_TIME = 42 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [scope, setScope] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const navigate = useNavigate();
  const logoutRef = useRef(null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setPermissions([]);
    setScope(null);
  }, []);

  /**
   * Revoke the refresh token server-side, then clear locally. The local clear
   * runs even if the API call fails, so a network error can never leave
   * someone stuck signed in.
   */
  const logout = useCallback(
    async (reason) => {
      try {
        // The server can only revoke the session if it gets the refresh token.
        await API.post("/auth/logout", {
          refreshToken: localStorage.getItem(REFRESH_KEY) || undefined,
        });
      } catch {
        /* ignore — clearing locally is what matters */
      }
      clearAuth();
      navigate("/login", { replace: true });
      if (reason) console.warn(reason);
    },
    [clearAuth, navigate],
  );

  logoutRef.current = logout;

  /**
   * Role, scope and permissions come from the API — never from the role
   * stored in localStorage, which a user can edit.
   */
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await API.get("/admin/me");
      const admin = res.data?.admin;
      const loaded = res.data?.permissions || [];
      setPermissions(loaded);
      setScope(admin?.scope || null);

      if (admin) {
        setUser((current) => {
          const next = {
            ...(current || {}),
            role: admin.role,
            username: admin.username,
            AdminID: admin.id,
          };
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ ...JSON.parse(stored), ...next }),
              );
            } catch {
              /* ignore */
            }
          }
          return next;
        });
      }
      // Return the permissions too: a caller that just awaited this still
      // has the OLD `permissions` in its own render scope (stale closure).
      return { ok: true, permissions: loaded, admin };
    } catch (error) {
      // A disabled or deleted admin must not keep a usable session.
      if ([401, 403].includes(error?.response?.status)) {
        logoutRef.current?.("Session is no longer valid");
      }
      return { ok: false, permissions: [] };
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsHydrated(true);
      return;
    }

    try {
      const data = JSON.parse(stored);
      if (Date.now() > data.expiresAt) {
        clearAuth();
        setIsHydrated(true);
        return;
      }
      setUser(data);
      loadProfile().finally(() => setIsHydrated(true));
    } catch {
      clearAuth();
      setIsHydrated(true);
    }
  }, [clearAuth, loadProfile]);

  useEffect(() => {
    if (!user?.expiresAt) return undefined;
    const interval = setInterval(() => {
      if (Date.now() > user.expiresAt) logoutRef.current?.("Session expired");
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  /* Any 401 from the API ends the session (token revoked, admin disabled). */
  useEffect(() => {
    const id = API.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const url = String(error?.config?.url || "");
        if (status === 401 && !url.includes("/auth/")) {
          logoutRef.current?.("Session expired");
        }
        return Promise.reject(error);
      },
    );
    return () => API.interceptors.response.eject(id);
  }, []);

  const login = async ({ username, password }) => {
    try {
      const res = await API.post("auth/admin/login", { username, password });

      const payload = {
        username,
        role: res.data.admin.role,
        AdminID: res.data.admin.id,
        token: res.data.accessToken,
        expiresAt: Date.now() + EXPIRY_TIME,
      };

      localStorage.setItem(TOKEN_KEY, res.data.accessToken);
      if (res.data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setUser(payload);

      const profile = await loadProfile();
      // Hand the permissions back so the caller can route immediately.
      return { ok: true, permissions: profile.permissions || [] };
    } catch (err) {
      return {
        ok: false,
        message: err.response?.data?.message || "Login failed",
      };
    }
  };

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      permissions,
      scope,
      login,
      logout,
      refreshProfile: loadProfile,
      isAuthenticated: !!user,
      isHydrated,
      profileLoading,
      /** any-of check, matching the backend guard */
      can: (...required) => checkPermission(permissions, required.flat()),
      isSuperAdmin: user?.role === "SUPERADMIN",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, permissions, scope, isHydrated, profileLoading, logout, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
