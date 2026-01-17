import { permanentRedirect } from "next/navigation";

export default async function AdminListingsPage() {
  permanentRedirect("/rebuild/ops/listings");
}
