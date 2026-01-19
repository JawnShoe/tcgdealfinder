import { permanentRedirect } from "next/navigation";
import { buildDiscoveryUrl } from "@/lib/rebuild/urls";

export default function TopDealsRedirectPage() {
  permanentRedirect(buildDiscoveryUrl({ preset: "biggest-discount" }));
}
