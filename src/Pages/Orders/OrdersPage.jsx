import React, { useState } from "react";
import { BellRing, History, ListOrdered, PackageSearch } from "lucide-react";
import LiveOrder from "./LiveOrder";
import OrderHistory from "./OrderHistory";
import { useAuth } from "../../Context/AuthProvider";
import { AdminHero, AdminPage, AdminPanel, AdminTabs } from "../../Components/AdminPrimitives";

/* 🔔 Sound */
const playNewOrderSound = () => {
  const audio = new Audio("/sounds/new-order.mp3");
  audio.volume = 0.7;
  audio.play().catch(() => {});
};

const OrdersPage = () => {
  const { user } = useAuth();

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState("live");

  if (!user) {
    return (
      <AdminPage>
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-500 shadow-sm">
          Loading user permissions...
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Order Center"
        title="Orders"
        description="Monitor live activity, review completed orders, and inspect cancellations from one consistent workspace."
        icon={PackageSearch}
        meta={soundEnabled ? "Order alerts enabled" : "Order alerts muted"}
        action={
          <button
            type="button"
            onClick={() => {
              setSoundEnabled((prev) => !prev);
              playNewOrderSound();
            }}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              soundEnabled
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-white/15 bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            <BellRing className="h-4 w-4" />
            Sound {soundEnabled ? "On" : "Off"}
          </button>
        }
      />

      <AdminTabs
        tabs={[
          { id: "live", label: "Live Orders", icon: PackageSearch },
          { id: "history", label: "Order History", icon: History },
          { id: "cancelled", label: "Cancelled", icon: ListOrdered },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      <AdminPanel className="p-2 sm:p-3">
        {activeTab === "live" && <LiveOrder soundEnabled={soundEnabled} />}
        {activeTab === "history" && <OrderHistory />}
        {activeTab === "cancelled" && <OrderHistory mode="cancelled" />}
      </AdminPanel>
    </AdminPage>
  );
};

export default OrdersPage;
