import { permanentRedirect } from "next/navigation";

// =============================================================================
// /debug/exclusions
// DEPRECATED: Redirects to /rebuild/ops/exclusions (Stage 2 MIGRATE)
// =============================================================================

export default function ExclusionsQuarantinePage() {
  permanentRedirect("/rebuild/ops/exclusions");
}
