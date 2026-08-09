"use client";

import { useEffect, useRef } from "react";

import { useTelemetry } from "@/hooks/use-telemetry";

/**
 * Fires the existing OPEN event once per detail page access (plan T12,
 * ADR-0007; ADR-0004: no page-view events). Renders nothing.
 *
 * Privacy: only itemId + a safe source label; never media/source URLs,
 * claimant data, or raw content. StrictMode-safe via a ref guard.
 */

const DETAIL_OPEN_SOURCE = "portfolio_detail";

export function DetailOpenTelemetry({ itemId }: { itemId: string }) {
  const { open } = useTelemetry();
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    open(itemId, { source: DETAIL_OPEN_SOURCE });
  }, [itemId, open]);

  return null;
}
