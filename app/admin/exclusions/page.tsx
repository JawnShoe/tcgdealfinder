import { notFound } from "next/navigation";

import { AdminExclusionsPanel } from "@/components/AdminExclusionsPanel";
import { AdminToolbar } from "@/components/AdminToolbar";
import { isAdminAuthenticated } from "@/lib/adminAuth";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminExclusionsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  if (!process.env.ADMIN_SECRET || !isAdminAuthenticated()) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <AdminToolbar current="exclusions" />
      <AdminExclusionsPanel searchParams={searchParams} />
    </main>
  );
}
