import React, { useEffect, useState } from "react";
import { AdminList, deleteAdmin } from "../../Api/index";
import { UserCircle2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

const AdminListPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch admins
  const fetchAdmins = async () => {
    try {
      const res = await AdminList();
      if (res?.ok !== false) {
        // Backend now returns { success, admins }; keep array support for
        // older deployments.
        const payload = res.data ?? res;
        setAdmins(Array.isArray(payload) ? payload : payload?.admins || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Delete admin
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this admin?"
    );
    if (!confirmDelete) return;

    const res = await deleteAdmin(id);

    if (res?.ok === false) {
      alert(res.message);
      return;
    }

    // Update UI immediately
    setAdmins((prev) => prev.filter((admin) => admin._id !== id));
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Admin Management
        </h1>

        <Link
          to="/add-admin"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Admin
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr className="text-gray-600 uppercase text-xs">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Created At</th>
              <th className="px-6 py-3">User ID</th>
              <th className="px-6 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="6"
                  className="text-center py-6 text-gray-500"
                >
                  Loading admins...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="text-center py-6 text-gray-500"
                >
                  No admins found
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr
                  key={admin._id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {admin.username}
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      {admin.role || "Admin"}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-gray-500">
                    {admin._id}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(admin._id)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminListPage;
