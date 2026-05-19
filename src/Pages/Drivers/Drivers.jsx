import React, { useState } from "react";
import DriverList from "./DriverList";
import DriverRejected from "./DriverRejected";
import DriversVerifi from "./DriversPendding";
import { AlertCircle, CarFront, CheckCircle, HandCoinsIcon, XCircle } from "lucide-react";
import DriverEarnings from "./DriverEarnings";
import { AdminHero, AdminPage, AdminPanel, AdminTabs } from "../../Components/AdminPrimitives";

const TABS = [
  {
    id: "approved",
    label: "Approved Drivers",
    icon: CheckCircle,
  },
  {
    id: "pending",
    label: "Pending Drivers",
    icon: AlertCircle,
  },
  {
    id: "rejected",
    label: "Rejected Drivers",
    icon: XCircle,
  },
  {
    id: "DriverEarnings",
    label: "Driver Earnings",
    icon: HandCoinsIcon,
  },
];

const Drivers = () => {
  const [activeTab, setActiveTab] = useState("approved");

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Fleet Operations"
        title="Driver Management"
        description="Approve new riders, review rejected applications, and keep payout visibility close to the workflow."
        icon={CarFront}
        meta="One workflow, four driver states"
        accent="cyan"
      />

      <AdminTabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

      <AdminPanel className="p-3">
        <div className="min-h-[420px]">
          {activeTab === "approved" && <DriverList />}
          {activeTab === "pending" && <DriversVerifi />}
          {activeTab === "rejected" && <DriverRejected />}
          {activeTab === "DriverEarnings" && <DriverEarnings />}
        </div>
      </AdminPanel>
    </AdminPage>
  );
};

export default Drivers;
