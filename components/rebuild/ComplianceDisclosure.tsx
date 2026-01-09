type ComplianceDisclosureProps = {
  className?: string;
};

export default function ComplianceDisclosure({
  className,
}: ComplianceDisclosureProps) {
  return (
    <p className={`text-xs text-slate-600 ${className ?? ""}`}>
      We may earn a commission from qualifying purchases.
    </p>
  );
}
