import { permanentRedirect } from "next/navigation";

export default function SetsRedirectPage() {
  permanentRedirect("/rebuild/discovery");
}
