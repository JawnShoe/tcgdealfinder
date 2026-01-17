import { permanentRedirect } from "next/navigation";

export default async function AdminBlacklistPage() {
  permanentRedirect("/rebuild/ops/blacklist");
}
