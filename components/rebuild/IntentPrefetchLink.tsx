"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import type { ReactNode } from "react";

type IntentPrefetchLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  prefetchEnabled?: boolean;
};

export default function IntentPrefetchLink({
  href,
  children,
  className,
  prefetchEnabled = true,
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const prefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (!prefetchEnabled || prefetchedRef.current) {
      return;
    }

    prefetchedRef.current = true;
    router.prefetch(href);
  }, [href, prefetchEnabled, router]);

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {children}
    </Link>
  );
}
