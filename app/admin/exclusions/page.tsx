import { notFound, redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/adminAuth";

export default async function AdminExclusionsPage() {
  if (!process.env.ADMIN_SECRET || !isAdminAuthenticated()) {
    notFound();
  }

  redirect("/admin?tab=exclusions");
}
