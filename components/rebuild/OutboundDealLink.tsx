"use client";

import { useMemo, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

const AFFILIATE_PARAMS = new Set([
  "mkevt",
  "mkcid",
  "mkrid",
  "campid",
  "customid",
  "toolid",
  "siteid",
]);

const CLICK_GUARD_MS = 750;

type OutboundDealLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  listingId?: string;
};

function hasAffiliateParams(href: string): boolean {
  try {
    const url = new URL(href);
    for (const key of AFFILIATE_PARAMS) {
      if (url.searchParams.has(key)) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export default function OutboundDealLink({
  href,
  children,
  className,
  listingId,
}: OutboundDealLinkProps) {
  const lastClickAtRef = useRef(0);
  const isAffiliate = useMemo(() => hasAffiliateParams(href), [href]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const now = Date.now();
    if (now - lastClickAtRef.current < CLICK_GUARD_MS) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    lastClickAtRef.current = now;

    const payload = JSON.stringify({
      url: href,
      listingId: listingId ?? null,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/rebuild/outbound-click", blob);
      return;
    }

    void fetch("/api/rebuild/outbound-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className={className}
        onClick={handleClick}
      >
        {children}
      </a>
      {isAffiliate ? (
        <span className="text-xs text-slate-500">Affiliate link</span>
      ) : null}
    </span>
  );
}
