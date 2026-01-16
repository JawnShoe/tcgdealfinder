import { permanentRedirect } from "next/navigation";

export default function AlertsRedirectPage() {
  permanentRedirect("/rebuild/alerts");
}
