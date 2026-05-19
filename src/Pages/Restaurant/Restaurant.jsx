import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  restaurantOnlyLogged,
} from "../../Api";
import { Eye, Store, Wallet, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../Context/AuthProvider";
import { AdminHero, AdminPage, AdminPanel, AdminSearchField } from "../../Components/AdminPrimitives";

const Restaurant = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPERADMIN";

  // ================= FETCH =================
  const fetchLoggedRestaurants = async () => {
    try {
      const res = await restaurantOnlyLogged();

      const data = res?.users || res?.data?.users || [];

      //  Only RESTAURANT role
      const onlyRestaurants = data.filter(
        (user) => user.role === "RESTAURANT"
      );

      //  Sort latest first
      const sorted = [...onlyRestaurants].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setRestaurants(sorted);
    } catch {
      toast.error("Failed to load logged users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoggedRestaurants();
  }, []);


  // ================= SEARCH =================
  const filteredRestaurants = restaurants.filter((user) =>
    (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone || "").includes(searchTerm)
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
        description="Review logged-in restaurant accounts, open wallet details, and jump into user orders from one clean directory."
        icon={Store}
        meta={`${restaurants.length} users`}
      />

      <AdminSearchField
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by name or phone..."
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
            {filteredRestaurants.length > 0 ? (
              filteredRestaurants.map((res, index) => (
                <tr
                  key={res._id}
                  className={`transition-colors hover:bg-slate-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {res.name || "—"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {res.email || "—"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {res.phone || "—"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {new Date(res.createdAt).toLocaleDateString("en-IN")}
                  </td>

                  {/* Details */}
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedRestaurant(res)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                    >
                      <Eye size={18} />
                    </button>
                  </td>

                  {/* Wallet */}
                  <td className="px-6 py-4 text-center">
                    <Link
                      to={`/wallet/${res._id}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200"
                    >
                      <Wallet size={18} />
                    </Link>
                  </td>
                  {/* Orders */}
                  <td className="px-6 py-4 text-center">
                    <Link
                      to={`/orders/user/${res._id}`}
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
      {selectedRestaurant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-lg rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              onClick={() => setSelectedRestaurant(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X size={20} />
            </button>

            <h2 className="mb-4 text-2xl font-semibold text-slate-900">
              {selectedRestaurant.name || "User"}
            </h2>

            <div className="space-y-3 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Email:</span> {selectedRestaurant.email || "—"}</p>
              <p><span className="font-semibold text-slate-900">Phone:</span> {selectedRestaurant.phone || "—"}</p>
              <p><span className="font-semibold text-slate-900">Role:</span> {selectedRestaurant.role}</p>
              <p>
                <span className="font-semibold text-slate-900">Created At:</span>{" "}
                {new Date(selectedRestaurant.createdAt).toLocaleString("en-IN")}
              </p>
            </div>

            <div className="flex justify-end mt-6">
              <Link
                to={`/wallet/${selectedRestaurant._id}`}
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
