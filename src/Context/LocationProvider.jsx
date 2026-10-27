import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  listCities,
  listStates,
  listWarehouses,
  idOf,
} from "../Api/multicity";
import { useAuth } from "./AuthProvider";

/**
 * Shared State -> City -> Warehouse hierarchy.
 * Loaded once and reused by every multi-city screen (pickers, filters,
 * targeting), instead of each page refetching the same three lists.
 */
const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError("");

    const [stateRes, cityRes, warehouseRes] = await Promise.all([
      listStates(),
      listCities(),
      listWarehouses(),
    ]);

    if (stateRes.ok) setStates(stateRes.data?.states || []);
    if (cityRes.ok) setCities(cityRes.data?.cities || []);
    if (warehouseRes.ok) {
      setWarehouses(
        warehouseRes.data?.warehouses || warehouseRes.data?.data || [],
      );
    }

    const firstError = [stateRes, cityRes, warehouseRes].find((r) => !r.ok);
    if (firstError) setError(firstError.message);
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const stateById = new Map(states.map((s) => [idOf(s._id), s]));
    const cityById = new Map(cities.map((c) => [idOf(c._id), c]));
    const warehouseById = new Map(warehouses.map((w) => [idOf(w._id), w]));

    return {
      states,
      cities,
      warehouses,
      loading,
      error,
      refresh,
      stateById,
      cityById,
      warehouseById,
      stateName: (id) => stateById.get(idOf(id))?.name || "—",
      cityName: (id) => cityById.get(idOf(id))?.name || "—",
      warehouseName: (id) => warehouseById.get(idOf(id))?.name || "—",
      citiesOfState: (stateId) =>
        cities.filter((c) => idOf(c.stateId?._id || c.stateId) === idOf(stateId)),
      warehousesOfCity: (cityId) =>
        warehouses.filter(
          (w) => idOf(w.cityId?._id || w.cityId) === idOf(cityId),
        ),
    };
  }, [states, cities, warehouses, loading, error, refresh]);

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocations() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocations must be used inside <LocationProvider>");
  }
  return ctx;
}
