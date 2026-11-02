import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { PERMISSION_LABELS } from "../Config/permissions";

export default function NoAccess({ role, required = [] }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
        <ShieldAlert className="h-7 w-7 text-rose-600" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900">You don't have access to this screen</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Your role{role ? ` (${role.replace(/_/g, " ")})` : ""} doesn't include
        {required.length
          ? ` ${required.map((p) => PERMISSION_LABELS[p] || p).join(" or ")}`
          : " this permission"}
        . Ask a super admin to change your role or scope.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
