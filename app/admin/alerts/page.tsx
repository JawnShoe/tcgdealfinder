import { permanentRedirect } from "next/navigation";

export default async function AdminAlertsPage() {
  permanentRedirect("/rebuild/ops/alerts");
}
