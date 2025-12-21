import { notFound } from "next/navigation";

import { AdminToastContainer } from "@/components/AdminActionFeedback";
import { AdminListingsPanel } from "@/components/AdminListingsPanel";
import { AdminToolbar } from "@/components/AdminToolbar";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export default async function AdminListingsPage() {
  if (!process.env.ADMIN_SECRET || !isAdminAuthenticated()) {
    notFound();
  }

  return (
    <AdminToastContainer>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <AdminToolbar current="listings" />
        <AdminListingsPanel />
      </main>
    </AdminToastContainer>
  );
}
