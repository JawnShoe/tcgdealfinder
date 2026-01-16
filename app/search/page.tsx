import { permanentRedirect } from "next/navigation";

export default function SearchRedirectPage() {
  permanentRedirect("/rebuild/discovery");
}
