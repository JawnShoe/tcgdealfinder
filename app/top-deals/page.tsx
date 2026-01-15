import { permanentRedirect } from "next/navigation";

export default function TopDealsRedirectPage() {
  permanentRedirect("/rebuild/discovery?sort=biggest-discount");
}
