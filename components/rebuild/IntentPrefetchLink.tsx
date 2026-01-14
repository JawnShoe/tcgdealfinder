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

declare global {
  interface Window {
    __rebuildIntentPrefetches?: string[];
  }
}

export default function IntentPrefetchLink({
  href,
  children,
  className,
  prefetchEnabled = true,
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const prefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (!prefetchEnabled) {
      return;
    }

    window.__rebuildIntentPrefetches ??= [];
    if (!window.__rebuildIntentPrefetches.includes(href)) {
      window.__rebuildIntentPrefetches.push(href);
    }

    if (prefetchedRef.current) {
      return;
    }

    prefetchedRef.current = true;
    try {
      router.prefetch(href);
    } catch {}
  }, [href, prefetchEnabled, router]);

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      data-intent-prefetch="true"
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {children}
    </Link>
  );
}
