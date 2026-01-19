import { permanentRedirect } from "next/navigation";
import { buildDiscoveryUrl } from "@/lib/rebuild/urls";

export default function NewestRedirectPage() {
  permanentRedirect(
    buildDiscoveryUrl({ preset: "newest", includeDefaultPreset: true })
  );
}
