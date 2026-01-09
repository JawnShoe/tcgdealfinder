"use client";

import { useEffect, useRef, useState } from "react";

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadline) => void;

type IdleOptions = {
  timeout: number;
};

type PriorityHydrationProps = {
  fallback: React.ReactNode;
  children: React.ReactNode;
  timeoutMs?: number;
};

export default function PriorityHydration({
  fallback,
  children,
  timeoutMs = 1200,
}: PriorityHydrationProps) {
  const [ready, setReady] = useState(false);
  const idleIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setReadyIfAlive = () => {
      if (!cancelled) {
        setReady(true);
      }
    };

    const win = window as Window & {
      requestIdleCallback?: (cb: IdleCallback, options?: IdleOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (win.requestIdleCallback) {
      idleIdRef.current = win.requestIdleCallback(setReadyIfAlive, {
        timeout: timeoutMs,
      });

      return () => {
        cancelled = true;
        if (idleIdRef.current !== null && win.cancelIdleCallback) {
          win.cancelIdleCallback(idleIdRef.current);
        }
      };
    }

    timeoutIdRef.current = window.setTimeout(setReadyIfAlive, timeoutMs);

    return () => {
      cancelled = true;
      if (timeoutIdRef.current !== null) {
        window.clearTimeout(timeoutIdRef.current);
      }
    };
  }, [timeoutMs]);

  return <>{ready ? children : fallback}</>;
}
