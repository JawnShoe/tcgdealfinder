import { permanentRedirect } from "next/navigation";

export default function NewestRedirectPage() {
  permanentRedirect("/discovery?sort=newest");
}
