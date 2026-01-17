import { redirect } from "next/navigation";

export default async function AdminExclusionsPage() {
  redirect("/rebuild/ops/exclusions");
}
