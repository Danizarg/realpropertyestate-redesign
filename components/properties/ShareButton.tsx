"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/site/SocialIcons";
import { cn } from "@/lib/utils";

/** Native share sheet where available, otherwise copies the link. */
export default function ShareButton({ title, className, label = "Share" }: { title: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <button type="button" onClick={share} className={cn("inline-flex items-center gap-2.5", className)}>
      <ShareIcon className="w-4 h-4" />
      <span aria-live="polite">{copied ? "Link copied" : label}</span>
    </button>
  );
}
