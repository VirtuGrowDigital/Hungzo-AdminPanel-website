import React, { useState } from "react";
import { BadgePercent, Bike, ScrollText } from "lucide-react";
import CommissionsTsC from "./CommissionsTsC";
import RestaurantTandC from "./RestaurantTandC";
import DeliveryFeesRules from "./DeliveryFeesRules";
import { AdminHero, AdminPage, AdminPanel, AdminTabs } from "../../Components/AdminPrimitives";

const Rules = () => {
  const [activeTab, setActiveTab] = useState("commission");

  const tabs = [
    { id: "commission", label: "Commission", icon: BadgePercent, component: <CommissionsTsC /> },
    { id: "restaurant", label: "Restaurant", icon: ScrollText, component: <RestaurantTandC /> },
    { id: "delivery", label: "Delivery Fee", icon: Bike, component: <DeliveryFeesRules /> },
  ];

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Rules Engine"
        title="Terms & Rules"
        description="Manage commissions, partner-facing terms, and delivery fee logic with one consistent publishing surface."
        icon={ScrollText}
        meta={`${tabs.length} rule groups`}
      />

      <AdminTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      <AdminPanel className="p-5">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </AdminPanel>
    </AdminPage>
  );
};

export default Rules;
