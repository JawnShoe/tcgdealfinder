import { REBUILD_COMPLIANCE_DISCLOSURE_COPY } from "@/lib/rebuild/compliance/disclosure";

type ComplianceDisclosureProps = {
  className?: string;
};

export default function ComplianceDisclosure({
  className,
}: ComplianceDisclosureProps) {
  return (
    <p className={`text-xs text-slate-600 ${className ?? ""}`}>
      {REBUILD_COMPLIANCE_DISCLOSURE_COPY}
    </p>
  );
}
