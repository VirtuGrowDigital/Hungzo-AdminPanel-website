import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getUserProfiles,
} from "../../Api";
import { Eye, Store, Wallet, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../Context/AuthProvider";
import { AdminHero, AdminPage, AdminPanel, AdminSearchField } from "../../Components/AdminPrimitives";

const Restaurant = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPERADMIN";

  // ================= FETCH =================
  const fetchUserProfiles = async () => {
    try {
      const res = await getUserProfiles();
      const data = res?.users || res?.data?.users || [];
      setUsers(data);
    } catch {
      toast.error("Failed to load user profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfiles();
  }, []);


  // ================= SEARCH =================
  const filteredUsers = users.filter((user) =>
    (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone || "").includes(searchTerm) ||
    (user.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminPage>
        <AdminPanel className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500" />
            <p className="mt-4 text-sm text-slate-500">Loading users...</p>
          </div>
        </AdminPanel>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="User Directory"
        title="Users"
        description="Review production user profiles, open wallet details, and jump into customer orders from one clean directory."
        icon={Store}
        meta={`${users.length} users`}
      />

      <AdminSearchField
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by name, phone, or email..."
      />

      <AdminPanel className="h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b bg-slate-50">
            <tr className="text-xs uppercase tracking-wide text-slate-600">
              <th className="px-6 py-4 text-left">Name</th>
              <th className="px-6 py-4 text-left">Email</th>
              <th className="px-6 py-4 text-left">Phone</th>
              <th className="px-6 py-4 text-left">Joined On</th>
              <th className="px-6 py-4 text-center">Details</th>
              <th className="px-6 py-4 text-center">Wallet</th>
              <th className="px-6 py-4 text-center">Orders</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((userProfile, index) => (
                <tr
                  key={userProfile._id}
                  className={`transition-colors hover:bg-slate-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {userProfile.name || "—"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {userProfile.email || "—"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {userProfile.phone || "—"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {new Date(userProfile.createdAt).toLocaleDateString("en-IN")}
                  </td>

                  {/* Details */}
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedUser(userProfile)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                    >
                      <Eye size={18} />
                    </button>
                  </td>

                  {/* Wallet */}
                  <td className="px-6 py-4 text-center">
                    <Link
                      to={`/wallet/${userProfile._id}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200"
                    >
                      <Wallet size={18} />
                    </Link>
                  </td>
                  {/* Orders */}
                  <td className="px-6 py-4 text-center">
                    <Link
                      to={`/orders/user/${userProfile._id}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
                      title="View Orders"
                    >
                      📦
                    </Link>
                  </td>

                  {/* Optional Action */}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={isSuperAdmin ? 8 : 7}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminPanel>

      {/* ================= MODAL ================= */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-lg rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X size={20} />
            </button>

            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              {selectedUser.name || "User"}
            </h2>

            <div className="space-y-3 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Email:</span> {selectedUser.email || "—"}</p>
              <p><span className="font-semibold text-slate-900">Phone:</span> {selectedUser.phone || "—"}</p>
              <p><span className="font-semibold text-slate-900">Role:</span> {selectedUser.role}</p>
              <p><span className="font-semibold text-slate-900">Status:</span> {selectedUser.accountStatus || "ACTIVE"}</p>
              <p>
                <span className="font-semibold text-slate-900">Created At:</span>{" "}
                {new Date(selectedUser.createdAt).toLocaleString("en-IN")}
              </p>
            </div>

            <div className="flex justify-end mt-6">
              <Link
                to={`/wallet/${selectedUser._id}`}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                View Wallet
              </Link>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
};

export default Restaurant;
