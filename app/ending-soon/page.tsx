import { permanentRedirect } from "next/navigation";

export default function EndingSoonRedirectPage() {
  permanentRedirect("/discovery?sort=endingSoon");
}
