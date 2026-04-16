import type { ReactNode } from "react";

// Workaround para bug de Next DevTools en Windows/OneDrive (dev only).
// Mantiene exportaciones esperadas por Next sin lógica de segment explorer.
export function SegmentViewNode({ children }: { children?: ReactNode }) {
  return <>{children ?? null}</>;
}

export function SegmentViewStateNode({ children }: { children?: ReactNode }) {
  return <>{children ?? null}</>;
}

