"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const ConciergePanel = dynamic(() => import("./ConciergePanel"), { ssr: false });

interface ConciergeContextValue {
  open: (prefill?: string) => void;
  close: () => void;
  isOpen: boolean;
}

const ConciergeContext = createContext<ConciergeContextValue>({
  open: () => {},
  close: () => {},
  isOpen: false,
});

export const useConcierge = () => useContext(ConciergeContext);

const preload = () => {
  void import("./ConciergePanel");
};

export default function ConciergeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const [prefill, setPrefill] = useState<{ text: string; id: number } | null>(null);

  const open = useCallback((text?: string) => {
    setRequested(true);
    setIsOpen(true);
    if (text) setPrefill({ text, id: Date.now() });
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <ConciergeContext.Provider value={value}>
      {children}
      <ConciergeLauncher hidden={isOpen} onOpen={() => open()} />
      {requested && <ConciergePanel open={isOpen} onClose={close} prefill={prefill} />}
    </ConciergeContext.Provider>
  );
}

function ConciergeLauncher({ hidden, onOpen }: { hidden: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      data-concierge-launcher
      onClick={onOpen}
      onPointerEnter={preload}
      onFocus={preload}
      aria-label="Open the Real Property Estate concierge"
      className={cn(
        "group fixed right-4 sm:right-6 z-[65] flex items-center gap-3 transition-[opacity,transform] duration-700 ease-[var(--ease-out)]",
        hidden ? "opacity-0 translate-y-6 pointer-events-none" : "opacity-100 translate-y-0"
      )}
      style={{ bottom: "calc(1.1rem + var(--dock-offset, 0px) + env(safe-area-inset-bottom, 0px))" }}
    >
      <span className="hidden md:block overflow-hidden">
        <span className="block surface-glass text-ivory micro-sm px-4 py-2.5 translate-x-[110%] group-hover:translate-x-0 group-focus-visible:translate-x-0 transition-transform duration-700 ease-[var(--ease-out)]">
          Concierge
        </span>
      </span>
      <span className="relative block w-[3.6rem] h-[3.6rem] rounded-full bg-obsidian/85 backdrop-blur-md border border-ivory/15 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.6)]">
        <span
          className="absolute inset-[5px] rounded-full opacity-80"
          style={{
            background: "conic-gradient(from 0deg, transparent 0 55%, rgba(197,177,138,0.9) 75%, transparent 92%)",
            animation: "orbit 5.5s linear infinite",
            WebkitMask: "radial-gradient(circle, transparent 62%, #000 64%)",
            mask: "radial-gradient(circle, transparent 62%, #000 64%)",
          }}
        />
        <span
          className="absolute inset-[17px] rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #f5f2eb 0%, #c5b18a 45%, rgba(197,177,138,0.15) 100%)",
            animation: "breathe 4s ease-in-out infinite",
          }}
        />
      </span>
    </button>
  );
}
