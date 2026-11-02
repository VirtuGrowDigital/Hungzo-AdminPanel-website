
import React, { useState } from "react";
import { useAuth } from "../../Context/AuthProvider";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function LogoutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);

  const handleConfirm = async (confirm) => {
    if (!confirm) {
      navigate(-1);
      return;
    }

    // logout() revokes the refresh token on the server, then clears locally
    // and redirects to /login.
    setBusy(true);
    await logout();
    toast.success("Logged out");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h1 className="text-xl font-semibold mb-4 text-gray-800">
        Are you sure you want to logout?
      </h1>
      <div className="space-x-4">
        <button
          onClick={() => handleConfirm(true)}
          disabled={busy}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300"
        >
          {busy ? "Logging out..." : "Yes, Logout"}
        </button>
        <button
          onClick={() => handleConfirm(false)}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
