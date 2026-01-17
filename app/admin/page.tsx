import { permanentRedirect } from "next/navigation";

export default function AdminHubPage() {
  permanentRedirect("/rebuild/ops");
}
