import React, { useState } from "react";
import { Fingerprint, LogIn, ShieldCheck } from "lucide-react";
import DriversVerifi from "../Drivers/DriversPendding";
import OnlyLoggedUser from "../Restaurant/OnlyLoggedUser";
import { AdminHero, AdminPage, AdminPanel, AdminTabs } from "../../Components/AdminPrimitives";

const Verifications = () => {
  const [activeSection, setActiveSection] = useState("driver");

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Access Review"
        title="Verifications"
        description="Handle approval queues and inspect login-only access with the same clean workflow."
        icon={ShieldCheck}
        meta={activeSection === "driver" ? "Driver queue open" : "Login-only view open"}
        accent="amber"
      />

      <AdminTabs
        tabs={[
          { id: "driver", label: "Driver Verification", icon: Fingerprint },
          { id: "login", label: "Login Only", icon: LogIn },
        ]}
        activeKey={activeSection}
        onChange={setActiveSection}
      />

      <AdminPanel className="p-3">
        {activeSection === "driver" && <DriversVerifi />}
        {activeSection === "login" && <OnlyLoggedUser />}
      </AdminPanel>
    </AdminPage>
  );
};

export default Verifications;
