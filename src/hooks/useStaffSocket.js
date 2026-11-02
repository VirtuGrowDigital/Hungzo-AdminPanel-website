import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

/**
 * Connects to the backend `/admins` namespace.
 *
 * The server puts each socket into rooms derived from the admin's scope
 * (admins:all for SUPERADMIN, otherwise wh_<id> / city_<id> / state_<id>),
 * so a city manager only receives events for their own city.
 *
 * Events: "order:new"
 */
export default function useStaffSocket({ enabled = true, onNewOrder } = {}) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onNewOrder);

  useEffect(() => {
    handlerRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    if (!enabled) return undefined;

    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const base =
      import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "https://api.hungzo.in";

    // websocket-only: long polling across multiple backend workers needs
    // sticky sessions.
    const socket = io(`${base}/admins`, {
      transports: ["websocket"],
      auth: { token },
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("order:new", (payload) => handlerRef.current?.(payload));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled]);

  return { connected };
}
