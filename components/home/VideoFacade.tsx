"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight YouTube facade: a poster and play control; the real player
 * (and its ~1MB of scripts) loads only when the visitor asks for it.
 * The frame adopts the video's own aspect ratio (vertical or landscape).
 */
export default function VideoFacade({ embedUrl, title, className }: { embedUrl: string; title: string; className?: string }) {
  const id = embedUrl.split("/embed/")[1]?.split(/[?&/]/)[0] ?? "";
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState<number>(9 / 16);
  const [poster, setPoster] = useState(`https://i.ytimg.com/vi/${id}/oardefault.jpg`);

  if (!id) return null;

  return (
    <div className={cn("relative overflow-hidden bg-obsidian", className)} style={{ aspectRatio: String(ratio) }}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 w-full h-full text-ivory"
          aria-label={`Play film: ${title}`}
          data-cursor="Play"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- third-party poster with runtime fallback */}
          <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={(e) => {
              const img = e.currentTarget;
              // YouTube serves a 120×90 placeholder when a size doesn't exist.
              if (img.naturalWidth <= 120 && poster.includes("oardefault")) {
                setPoster(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
                return;
              }
              if (img.naturalWidth && img.naturalHeight && poster.includes("oardefault")) {
                setRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
            onError={() => setPoster(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
            className="img-cover transition-transform duration-[1.6s] ease-[var(--ease-out)] group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-obsidian/75 via-obsidian/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-20 h-20 rounded-full border border-ivory/50 backdrop-blur-sm transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="w-6 h-6 ml-1" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
          <span className="absolute left-5 right-5 bottom-5 text-left">
            <span className="block micro-sm text-champagne">Film</span>
            <span className="block mt-1.5 font-serif text-xl">{title}</span>
          </span>
        </button>
      )}
    </div>
  );
}
