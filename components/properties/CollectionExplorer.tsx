"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flip, gsap, useIsoLayoutEffect } from "@/components/motion/gsap";
import { SplitReveal, Reveal } from "@/components/motion/Reveal";
import { scrollToElement } from "@/components/motion/scroll";
import TransitionLink from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/motion/Magnetic";
import { useConcierge } from "@/components/concierge/ConciergeProvider";
import Picker from "@/components/ui/Picker";
import PropertyCard from "./PropertyCard";
import {
  activeFilterCount,
  applyFilters,
  DEFAULT_FILTERS,
  filtersToQuery,
  priceOptions,
  type CollectionFilters,
} from "@/lib/collection-filters";
import { buildLocationOptions, compactEuro, displayPrice, distinctValues, specItems } from "@/lib/property-utils";
import { prefersReducedMotion } from "@/lib/experience";
import { useMediaQuery, FINE_POINTER_MOTION } from "@/lib/use-media-query";
import type { ListingSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

interface Props {
  listings: ListingSummary[];
  initialFilters: CollectionFilters;
  initialView: "grid" | "list";
}

export default function CollectionExplorer({ listings, initialFilters, initialView }: Props) {
  const concierge = useConcierge();
  const [filters, setFilters] = useState<CollectionFilters>(initialFilters);
  const [view, setView] = useState<"grid" | "list">(initialView);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [floating, setFloating] = useState(false);
  const [qDraft, setQDraft] = useState(initialFilters.q);
  const resultsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  const results = useMemo(() => applyFilters(listings, filters), [listings, filters]);
  const shown = results.slice(0, visible);
  const activeCount = activeFilterCount(filters);

  const options = useMemo(() => {
    const countBy = (fn: (l: ListingSummary) => boolean) => listings.filter(fn).length;
    return {
      locations: buildLocationOptions(listings).map((o) => ({ value: o.value, label: o.label, meta: o.count, group: o.group })),
      types: distinctValues(listings.map((l) => l.property_type)).map((t) => ({
        value: t,
        label: t,
        meta: countBy((l) => l.property_type === t),
      })),
      pets: distinctValues(listings.map((l) => l.pets)).map((p) => ({ value: p, label: p })),
      listingTypes: distinctValues(listings.map((l) => l.listing_type)).map((t) => ({ value: t, label: t })),
    };
  }, [listings]);

  // Keep the URL shareable without a server round-trip.
  useEffect(() => {
    const query = filtersToQuery(filters);
    const viewParam = view === "list" ? `${query ? "&" : "?"}view=list` : "";
    const next = `/properties${query}${viewParam}`;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [filters, view]);

  // Debounced name search
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (qDraft !== filters.q) update({ q: qDraft });
    }, 260);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  // Floating filter shortcut once the bar has scrolled away
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setFloating(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function captureFlip() {
    if (prefersReducedMotion() || view !== "grid" || !resultsRef.current) return;
    flipState.current = Flip.getState(resultsRef.current.querySelectorAll("[data-flip-id]"));
  }

  function update(patch: Partial<CollectionFilters>) {
    captureFlip();
    setFilters((f) => ({ ...f, ...patch }));
    setVisible(PAGE_SIZE);
  }

  function reset() {
    captureFlip();
    setQDraft("");
    setFilters({ ...DEFAULT_FILTERS, sort: filters.sort });
    setVisible(PAGE_SIZE);
  }

  // Fluid reflow when the result set changes.
  useIsoLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state || !resultsRef.current) return;
    Flip.from(state, {
      targets: resultsRef.current.querySelectorAll("[data-flip-id]"),
      duration: 0.9,
      ease: "expo.inOut",
      stagger: 0.015,
      absolute: false,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.05 }),
    });
  }, [results]);

  const loadMore = () => setVisible((v) => v + PAGE_SIZE);

  const chips: { key: keyof CollectionFilters; label: string }[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”` });
  if (filters.location) chips.push({ key: "location", label: filters.location });
  if (filters.propertyType) chips.push({ key: "propertyType", label: filters.propertyType });
  if (filters.minPrice) chips.push({ key: "minPrice", label: `From ${compactEuro(Number(filters.minPrice))}` });
  if (filters.maxPrice) chips.push({ key: "maxPrice", label: `Up to ${compactEuro(Number(filters.maxPrice))}` });
  if (filters.bedrooms) chips.push({ key: "bedrooms", label: `${filters.bedrooms}+ bedrooms` });
  if (filters.pets) chips.push({ key: "pets", label: `Pets: ${filters.pets}` });
  if (filters.listingType) chips.push({ key: "listingType", label: filters.listingType });

  return (
    <>
      {/* Header */}
      <section data-nav-theme="dark" className="relative bg-obsidian text-ivory overflow-hidden">
        <div className="grain absolute inset-0 pointer-events-none" />
        <div className="relative shell pt-[calc(var(--nav-h)+4.5rem)] md:pt-[calc(var(--nav-h)+7rem)] pb-16 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-y-10 items-end">
          <div className="lg:col-span-8">
            <Reveal as="p" className="micro text-champagne mb-8 flex items-center gap-4">
              <span className="block w-10 h-px bg-current" />
              The collection
            </Reveal>
            <h1 className="display-xl flex items-start gap-4">
              <SplitReveal as="span" split="chars" trigger="mount">
                Residences
              </SplitReveal>
              <span className="font-sans text-[clamp(0.9rem,1.4vw,1.25rem)] font-medium tracking-normal text-champagne mt-[0.6em]">
                ({listings.length})
              </span>
            </h1>
          </div>
          <Reveal className="lg:col-span-4">
            <p className="body-copy text-ivory/70 max-w-sm">
              Every residence currently presented by Real Property Estate across Marbella and the Costa del Sol.
              Refine by area, type, budget or bedrooms.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Filters */}
      <section data-nav-theme="light" className="bg-soft-white text-ink">
        <div ref={barRef} id="collection-filters" className="shell pt-8 md:pt-10">
          <div className="border border-ink/10 bg-soft-white grid grid-cols-2 md:grid-cols-3 xl:grid-cols-[1.6fr_1.3fr_1fr_0.9fr_0.9fr_0.8fr] divide-x divide-y xl:divide-y-0 divide-ink/10">
            <label className="col-span-2 md:col-span-3 xl:col-span-1 flex flex-col justify-center min-h-[3.6rem] px-4 py-2">
              <span className="micro-sm text-ink-soft">Search</span>
              <input
                type="search"
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                placeholder="Residence or community"
                className="mt-1.5 bg-transparent outline-none text-[14px] placeholder:text-ink/45"
              />
            </label>
            <Picker label="Location" value={filters.location} onChange={(v) => update({ location: v })} placeholder="All locations" searchable options={options.locations} />
            <Picker label="Type" value={filters.propertyType} onChange={(v) => update({ propertyType: v })} placeholder="All types" options={options.types} />
            <Picker label="Min price" value={filters.minPrice} onChange={(v) => update({ minPrice: v })} placeholder="No minimum" options={priceOptions()} />
            <Picker label="Max price" value={filters.maxPrice} onChange={(v) => update({ maxPrice: v })} placeholder="No maximum" options={priceOptions()} />
            <Picker
              label="Bedrooms"
              value={filters.bedrooms}
              onChange={(v) => update({ bedrooms: v })}
              placeholder="Any"
              align="right"
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}+` }))}
            />
            {(options.pets.length > 0 || options.listingTypes.length > 1) && (
              <div className="col-span-2 md:col-span-3 xl:col-span-6 grid grid-cols-2 md:grid-cols-3 divide-x divide-ink/10 border-t border-ink/10">
                {options.listingTypes.length > 1 && (
                  <Picker label="Listing" value={filters.listingType} onChange={(v) => update({ listingType: v })} placeholder="All listings" options={options.listingTypes} />
                )}
                {options.pets.length > 0 && (
                  <Picker label="Pets" value={filters.pets} onChange={(v) => update({ pets: v })} placeholder="Any" options={options.pets} />
                )}
              </div>
            )}
          </div>

          {/* Result toolbar */}
          <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-ink/10 pb-6">
            <div className="flex flex-wrap items-center gap-2 min-h-10">
              <p className="font-serif text-2xl mr-4" aria-live="polite">
                {results.length} {results.length === 1 ? "residence" : "residences"}
              </p>
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    if (c.key === "q") setQDraft("");
                    update({ [c.key]: "" } as Partial<CollectionFilters>);
                  }}
                  className="chip group"
                  aria-label={`Remove filter ${c.label}`}
                >
                  {c.label}
                  <span aria-hidden="true" className="text-ink-soft group-hover:text-ink">×</span>
                </button>
              ))}
              {activeCount > 0 && (
                <button type="button" onClick={reset} className="micro-sm ml-2 link-line">
                  Clear all
                </button>
              )}
            </div>
            <div className="flex items-stretch gap-2 w-full lg:w-auto">
              <div className="flex-1 min-w-0 sm:flex-none sm:w-56 border border-ink/10">
                <Picker
                  label="Sort"
                  value={filters.sort === "newest" ? "" : filters.sort}
                  onChange={(v) => update({ sort: (v || "newest") as CollectionFilters["sort"] })}
                  placeholder="Newest first"
                  align="right"
                  options={[
                    { value: "price_desc", label: "Price: high to low" },
                    { value: "price_asc", label: "Price: low to high" },
                  ]}
                />
              </div>
              <div role="group" aria-label="View" className="flex shrink-0 border border-ink/10 min-h-[3.6rem]">
                {(["grid", "list"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={cn("px-4 sm:px-5 micro-sm transition-colors", view === v ? "bg-obsidian text-ivory" : "hover:bg-ivory-2")}
                  >
                    {v === "grid" ? "Grid" : "List"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="shell pt-14 pb-28 md:pb-36">
          {results.length === 0 ? (
            <EmptyState onReset={reset} onAsk={() => concierge.open()} />
          ) : view === "grid" ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 md:gap-y-20 [grid-auto-flow:dense]">
              {shown.map((p, i) => {
                const wide = i % 7 === 0;
                return (
                  <li key={p.id} data-flip-id={p.id} className={cn(wide && "md:col-span-2")}>
                    <PropertyCard
                      property={p}
                      index={i}
                      aspect={wide ? "16 / 10" : "4 / 5"}
                      priority={i < 2}
                      sizes={wide ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <ListView items={shown} />
          )}

          {results.length > shown.length && (
            <div className="mt-20 flex flex-col items-center gap-6">
              <p className="micro-sm text-ink-soft">
                Showing {shown.length} of {results.length}
              </p>
              <span className="relative w-48 h-px bg-ink/10">
                <span
                  className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-700"
                  style={{ width: `${(shown.length / results.length) * 100}%` }}
                />
              </span>
              <button type="button" onClick={loadMore} className="btn btn-ghost-dark">
                Show {Math.min(PAGE_SIZE, results.length - shown.length)} more residences
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Floating shortcut back to filters */}
      <div
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-[50] transition-[opacity,transform] duration-700 ease-[var(--ease-out)]",
          floating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
        )}
        style={{ bottom: "calc(1.1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={() => scrollToElement("#collection-filters", -110)}
          className="surface-glass text-ivory h-12 px-5 flex items-center gap-4 micro-sm"
          tabIndex={floating ? 0 : -1}
        >
          Refine
          {activeCount > 0 && <span className="text-champagne">{activeCount} active</span>}
          <span className="w-px h-4 bg-ivory/20" />
          <span className="text-ivory/70">{results.length} results</span>
        </button>
      </div>
    </>
  );
}

function EmptyState({ onReset, onAsk }: { onReset: () => void; onAsk: () => void }) {
  return (
    <div className="py-20 md:py-28 grid md:grid-cols-12 gap-10 items-center">
      <div className="md:col-span-5 relative aspect-[4/3] border border-ink/10 overflow-hidden" aria-hidden="true">
        <span className="absolute left-[12%] right-[12%] bottom-[22%] h-px bg-ink/30" />
        <span className="absolute left-[24%] bottom-[22%] w-px h-[42%] bg-ink/30" />
        <span className="absolute right-[24%] bottom-[22%] w-px h-[42%] bg-ink/30" />
        <span className="absolute left-[24%] right-[24%] top-[36%] h-px bg-ink/30" />
        <span className="absolute left-1/2 top-[18%] w-[38%] h-px bg-ink/20 -translate-x-1/2" />
      </div>
      <div className="md:col-span-6 md:col-start-7">
        <p className="micro text-bronze">No exact match</p>
        <h2 className="display-m mt-5">Nothing matches these criteria — yet.</h2>
        <p className="mt-6 body-copy text-ink-soft max-w-md">
          Widen your search, or tell our concierge what you have in mind — our team will be glad to help you find
          the right residence.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <button type="button" onClick={onReset} className="btn btn-dark">
            Clear all filters
          </button>
          <button type="button" onClick={onAsk} className="btn btn-ghost-dark">
            Ask the concierge
          </button>
        </div>
      </div>
    </div>
  );
}

/** Editorial list with a cursor-following image preview on fine pointers. */
function ListView({ items }: { items: ListingSummary[] }) {
  const preview = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<ListingSummary | null>(null);
  const fine = useMediaQuery(FINE_POINTER_MOTION);

  useEffect(() => {
    const el = preview.current;
    if (!fine || !el) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      xTo(e.clientX + 28);
      yTo(e.clientY - 120);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [fine]);

  useEffect(() => {
    if (!fine || !preview.current) return;
    gsap.to(preview.current, { opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.9, duration: 0.5, ease: "expo.out" });
  }, [hovered, fine]);

  return (
    <>
      <ul className="border-t border-ink/10" onPointerLeave={() => setHovered(null)}>
        {items.map((p, i) => (
          <li key={p.id} className="border-b border-ink/10">
            <TransitionLink
              href={`/properties/${p.slug}`}
              transitionLabel={p.name}
              onPointerEnter={() => setHovered(p)}
              onFocus={() => setHovered(p)}
              className="group grid grid-cols-[5.5rem_1fr_auto] md:grid-cols-[3rem_1.6fr_1fr_1fr_auto_2rem] items-center gap-x-5 md:gap-x-8 py-5 md:py-7"
            >
              <span className="relative aspect-[4/3] overflow-hidden bg-ivory-2 md:hidden">
                {p.cover && <Image src={p.cover.url} alt="" fill sizes="88px" className="object-cover" />}
              </span>
              <span className="hidden md:block micro-sm text-ink-soft tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block font-serif text-[clamp(1.3rem,2.4vw,2.3rem)] leading-tight transition-transform duration-700 ease-[var(--ease-out)] md:group-hover:translate-x-3 truncate">
                  {p.name}
                </span>
                <span className="block mt-1 text-[13px] text-ink-soft truncate md:hidden">{p.location}</span>
              </span>
              <span className="hidden md:block text-[14px] text-ink-soft truncate">{p.location}</span>
              <span className="hidden md:block text-[13px] text-ink-soft">
                {[p.property_type, ...specItems(p)].filter(Boolean).join(" · ")}
              </span>
              <span className="font-serif text-[1.05rem] md:text-xl whitespace-nowrap text-right">
                {displayPrice(p.price, p.price_label)}
              </span>
              <Arrow className="hidden md:block w-5 h-5 opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
            </TransitionLink>
          </li>
        ))}
      </ul>
      {fine && (
        <div
          ref={preview}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[45] w-[22rem] aspect-[4/3] overflow-hidden bg-ivory-2 shadow-[0_30px_60px_-30px_rgba(16,20,19,0.6)]"
          style={{ opacity: 0 }}
        >
          {hovered?.cover && (
            <Image key={hovered.id} src={hovered.cover.url} alt="" fill sizes="352px" className="object-cover animate-[fadeIn_0.5s_ease-out]" />
          )}
        </div>
      )}
    </>
  );
}
