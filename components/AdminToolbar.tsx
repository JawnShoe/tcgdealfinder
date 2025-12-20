import Link from "next/link";

type AdminSection = "exclusions" | "blacklist" | "listings";

const links: Array<{ key: AdminSection; href: string; label: string }> = [
  { key: "exclusions", href: "/admin/exclusions", label: "Exclusions" },
  { key: "blacklist", href: "/admin/blacklist", label: "Blacklist" },
  { key: "listings", href: "/admin/listings", label: "Listings" },
];

export function AdminToolbar({ current }: { current: AdminSection }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">Admin tools</span>
      {links.map((link) => {
        const isActive = link.key === current;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full border px-3 py-1 font-semibold transition ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-600 hover:border-slate-400"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
