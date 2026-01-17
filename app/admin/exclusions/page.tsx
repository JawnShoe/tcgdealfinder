import { permanentRedirect } from "next/navigation";

export default async function AdminExclusionsPage() {
  permanentRedirect("/rebuild/ops/exclusions");
}
