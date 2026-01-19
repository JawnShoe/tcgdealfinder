import { permanentRedirect } from "next/navigation";
import { buildDiscoveryUrl } from "@/lib/rebuild/urls";

export default function EndingSoonRedirectPage() {
  permanentRedirect(buildDiscoveryUrl({ preset: "endingSoon" }));
}
