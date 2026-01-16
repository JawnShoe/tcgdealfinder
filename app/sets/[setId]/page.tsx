import { permanentRedirect } from "next/navigation";

export default function SetDetailRedirectPage() {
  permanentRedirect("/rebuild/discovery");
}
