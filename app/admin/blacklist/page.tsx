import { notFound } from "next/navigation";

import { AdminToastContainer } from "@/components/AdminActionFeedback";
import { AdminBlacklistPanel } from "@/components/AdminBlacklistPanel";
import { AdminToolbar } from "@/components/AdminToolbar";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export default async function AdminBlacklistPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!process.env.ADMIN_SECRET || !isAdminAuthenticated()) {
    notFound();
  }

  const sellerFilterRaw = Array.isArray(searchParams?.seller)
    ? searchParams?.seller[0]
    : searchParams?.seller;
  const sellerFilter = sellerFilterRaw?.trim().toLowerCase() || null;

  return (
    <AdminToastContainer>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <AdminToolbar current="blacklist" />
        <AdminBlacklistPanel sellerFilter={sellerFilter} />
      </main>
    </AdminToastContainer>
  );
}
