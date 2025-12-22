import { notFound } from "next/navigation";

import { AdminLoginClient } from "../../../components/AdminLoginClient";

export default function AdminLoginPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Admin login</h1>
        <p className="text-sm text-slate-500">
          Dev-only helper. Not available in production.
        </p>
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <AdminLoginClient />
      </div>
    </main>
  );
}
