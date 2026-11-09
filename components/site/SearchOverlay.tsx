"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "@/components/motion/gsap";
import { useOverlay } from "@/components/motion/useOverlay";
import { usePageTransition } from "@/components/motion/TransitionProvider";
import { Arrow } from "@/components/motion/Magnetic";
import { CloseIcon, SearchIcon } from "./SocialIcons";
import { useListings } from "@/lib/listings-client";
import { buildLocationOptions, displayPrice, distinctValues, normalize, specItems } from "@/lib/property-utils";
import { prefersReducedMotion } from "@/lib/experience";
import { cn } from "@/lib/utils";

/** Instant search across every published residence: names, communities, areas and types. */
export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { navigate } = usePageTransition();
  const listings = useListings(open);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useOverlay(mounted && open, onClose, {
    initialFocus: () => inputRef.current,
    inertSelector: "header, [data-page-root], [data-concierge-launcher]",
  });

  if (open && !mounted) setMounted(true);

  const changeQuery = (q: string) => {
    setQuery(q);
    setActive(0);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!mounted || !root) return;
    const reduced = prefersReducedMotion();
    if (open) {
      gsap
        .timeline()
        .fromTo(root, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.01 : 0.5, ease: "power2.out" })
        .fromTo(
          root.querySelectorAll("[data-search-in]"),
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.06 },
          0.1
        );
    } else {
      gsap.to(root, {
        opacity: 0,
        duration: reduced ? 0.01 : 0.4,
        ease: "power2.in",
        onComplete: () => {
          setMounted(false);
          setQuery("");
        },
      });
    }
  }, [open, mounted]);

  const areas = useMemo(
    () => (listings ? buildLocationOptions(listings).filter((o) => o.group === "Areas").slice(0, 6) : []),
    [listings]
  );
  const types = useMemo(() => (listings ? distinctValues(listings.map((l) => l.property_type)) : []), [listings]);

  const results = useMemo(() => {
    if (!listings) return [];
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return listings.slice(0, 6);
    return listings
      .filter((l) => {
        const hay = normalize(`${l.name} ${l.location} ${l.property_type ?? ""} ${l.listing_type ?? ""}`);
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 8);
  }, [listings, query]);

  const totalMatches = useMemo(() => {
    if (!listings) return 0;
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return listings.length;
    return listings.filter((l) => {
      const hay = normalize(`${l.name} ${l.location} ${l.property_type ?? ""} ${l.listing_type ?? ""}`);
      return terms.every((t) => hay.includes(t));
    }).length;
  }, [listings, query]);


  if (!mounted) return null;

  const open_ = (href: string) => {
    onClose();
    navigate(href);
  };

  const viewAllHref = query.trim() ? `/properties?q=${encodeURIComponent(query.trim())}` : "/properties";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Search residences"
      className="fixed inset-0 z-[70] bg-soft-white text-ink overflow-y-auto"
      style={{ opacity: 0 }}
      data-lenis-prevent
    >
      <div className="shell pt-6 pb-16">
        <div className="flex items-center justify-between h-14" data-search-in>
          <p className="micro text-ink-soft">Search the collection</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-3 micro-sm p-2 -mr-2 hover:opacity-60 transition-opacity"
          >
            Close <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-[6vh] relative" data-search-in>
          <label htmlFor="site-search" className="sr-only">
            Search by residence, community, area or property type
          </label>
          <SearchIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 md:w-10 md:h-10 text-ink-soft" />
          <input
            ref={inputRef}
            id="site-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const hit = results[active];
                if (query.trim() && hit) open_(`/properties/${hit.slug}`);
                else open_(viewAllHref);
              }
            }}
            placeholder="Villa, La Zagaleta, penthouse…"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-autocomplete="list"
            aria-controls="site-search-results"
            aria-activedescendant={results[active] ? `search-opt-${results[active].id}` : undefined}
            className="w-full bg-transparent border-0 border-b border-ink/20 focus:border-ink outline-none pl-12 md:pl-20 pb-5 pt-3 font-serif font-light text-[clamp(2rem,5.4vw,5rem)] leading-none placeholder:text-ink/25 transition-colors"
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-2" data-search-in>
          {areas.map((a) => (
            <button key={a.value} type="button" className="chip" onClick={() => changeQuery(a.label)}>
              {a.label} <span className="text-ink-soft">{a.count}</span>
            </button>
          ))}
          {types.slice(0, 5).map((t) => (
            <button key={t} type="button" className="chip" onClick={() => changeQuery(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="mt-14" data-search-in>
          <div className="flex items-end justify-between border-b border-ink/10 pb-4">
            <p className="micro text-ink-soft" aria-live="polite">
              {listings === null
                ? "Loading residences…"
                : query.trim()
                  ? `${totalMatches} ${totalMatches === 1 ? "residence" : "residences"} found`
                  : "Recently added"}
            </p>
            <button type="button" onClick={() => open_(viewAllHref)} className="link-line micro-sm">
              View in the collection <Arrow className="w-3.5 h-3.5" />
            </button>
          </div>

          {listings === null ? (
            <ul className="divide-y divide-ink/10">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-6 py-5">
                  <div className="skeleton w-24 h-16 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-5 w-1/3" />
                    <div className="skeleton h-3 w-1/4" />
                  </div>
                </li>
              ))}
            </ul>
          ) : results.length === 0 ? (
            <div className="py-16">
              <p className="heading">No residences match “{query}”.</p>
              <p className="mt-3 text-ink-soft">Try an area such as Nueva Andalucía or a type such as Villa — or browse the full collection.</p>
            </div>
          ) : (
            <ul id="site-search-results" role="listbox" aria-label="Matching residences" className="divide-y divide-ink/10">
              {results.map((r, i) => (
                <li key={r.id} id={`search-opt-${r.id}`} role="option" aria-selected={i === active}>
                  <a
                    href={`/properties/${r.slug}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey) return;
                      e.preventDefault();
                      open_(`/properties/${r.slug}`);
                    }}
                    onPointerEnter={() => setActive(i)}
                    className={cn(
                      "group grid grid-cols-[6rem_1fr_auto] md:grid-cols-[8rem_1fr_auto_auto] items-center gap-5 md:gap-8 py-4 transition-colors",
                      i === active && "bg-ivory-2/60"
                    )}
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden bg-ivory-2">
                      {r.cover && (
                        <Image
                          src={r.cover.url}
                          alt=""
                          fill
                          sizes="128px"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-serif text-[clamp(1.2rem,2vw,1.75rem)] leading-tight truncate">{r.name}</span>
                      <span className="block mt-1 text-[13px] text-ink-soft truncate">
                        {r.location}
                        {r.property_type ? ` · ${r.property_type}` : ""}
                      </span>
                    </span>
                    <span className="hidden md:block text-[13px] text-ink-soft whitespace-nowrap">
                      {specItems(r).join(" · ")}
                    </span>
                    <span className="font-serif text-lg whitespace-nowrap">{displayPrice(r.price, r.price_label)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
