"use client";

import { useConcierge } from "./ConciergeProvider";

/** A button that opens the concierge, usable from server components. */
export default function ConciergeButton({
  children,
  className,
  prefill,
}: {
  children: React.ReactNode;
  className?: string;
  prefill?: string;
}) {
  const concierge = useConcierge();
  return (
    <button type="button" onClick={() => concierge.open(prefill)} className={className}>
      {children}
    </button>
  );
}
