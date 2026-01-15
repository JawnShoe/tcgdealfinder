import { permanentRedirect } from "next/navigation";

export default function TopDealsRedirectPage() {
  permanentRedirect("/discovery?sort=biggest-discount");
}
