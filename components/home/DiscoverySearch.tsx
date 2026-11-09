"use client";

import { useMemo, useState } from "react";
import Picker from "@/components/ui/Picker";
import { Reveal } from "@/components/motion/Reveal";
import { usePageTransition } from "@/components/motion/TransitionProvider";
import { Magnetic, RollLabel, Arrow } from "@/components/motion/Magnetic";
import { applyFilters, DEFAULT_FILTERS, filtersToQuery, PRICE_BANDS, type CollectionFilters } from "@/lib/collection-filters";
import { buildLocationOptions, distinctValues } from "@/lib/property-utils";
import type { ListingSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Structured search console connected to the live inventory, with live result counts. */
export default function DiscoverySearch({ listings }: { listings: ListingSummary[] }) {
  const { navigate } = usePageTransition();
  const [listing, setListing] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [band, setBand] = useState("");
  const [beds, setBeds] = useState("");

  const listingTypes = useMemo(() => distinctValues(listings.map((l) => l.listing_type)), [listings]);
  const locationOptions = useMemo(
    () => buildLocationOptions(listings).map((o) => ({ value: o.value, label: o.label, meta: o.count, group: o.group })),
    [listings]
  );
  const typeOptions = useMemo(
    () =>
      distinctValues(listings.map((l) => l.property_type)).map((t) => ({
        value: t,
        label: t,
        meta: listings.filter((l) => l.property_type === t).length,
      })),
    [listings]
  );

  const filters: CollectionFilters = useMemo(() => {
    const b = PRICE_BANDS.find((p) => p.value === band);
    return {
      ...DEFAULT_FILTERS,
      listingType: listing,
      location,
      propertyType: type,
      minPrice: b?.min ? String(b.min) : "",
      maxPrice: b?.max ? String(b.max) : "",
      bedrooms: beds,
    };
  }, [listing, location, type, band, beds]);

  const count = useMemo(() => applyFilters(listings, filters).length, [listings, filters]);

  const bandOptions = PRICE_BANDS.map((b) => ({
    value: b.value,
    label: b.label,
    meta: applyFilters(listings, { ...DEFAULT_FILTERS, minPrice: b.min ? String(b.min) : "", maxPrice: b.max ? String(b.max) : "" }).filter(
      (l) => l.price != null
    ).length,
  }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/properties${filtersToQuery(filters)}`, { label: "Residences" });
  };

  return (
    <section data-nav-theme="light" className="relative z-10 bg-soft-white" aria-label="Search residences">
      <div className="shell">
        <Reveal
          as="form"
          onSubmit={submit}
          className="relative -mt-14 md:-mt-[4.5rem] bg-soft-white text-ink border border-ink/10 shadow-[0_40px_90px_-50px_rgba(16,20,19,0.55)]"
        >
          <div className="flex items-center justify-between px-6 pt-5 md:hidden">
            <p className="micro text-bronze">Discover</p>
            <p className="micro-sm text-ink-soft">{listings.length} residences</p>
          </div>
          <div
            className={cn(
              "grid grid-cols-1 divide-y md:divide-y-0 md:divide-x divide-ink/10",
              listingTypes.length > 1 ? "md:grid-cols-[1fr_1.4fr_1fr_1fr_0.8fr_auto]" : "md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]"
            )}
          >
            {listingTypes.length > 1 && (
              <Picker
                variant="console"
                label="Buy or rent"
                value={listing}
                onChange={setListing}
                placeholder="All listings"
                options={listingTypes.map((t) => ({ value: t, label: t }))}
              />
            )}
            <Picker
              variant="console"
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="All of Marbella"
              searchable
              options={locationOptions}
            />
            <Picker
              variant="console"
              label="Property type"
              value={type}
              onChange={setType}
              placeholder="Any type"
              options={typeOptions}
            />
            <Picker
              variant="console"
              label="Price range"
              value={band}
              onChange={setBand}
              placeholder="Any price"
              options={bandOptions}
            />
            <Picker
              variant="console"
              label="Bedrooms"
              value={beds}
              onChange={setBeds}
              placeholder="Any"
              align="right"
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}+` }))}
            />
            <div className="p-3 md:p-2.5 flex">
              <Magnetic className="flex w-full">
                <button type="submit" className="btn btn-dark w-full md:h-full md:min-w-[13rem]" aria-live="polite">
                  <RollLabel>{count === 1 ? "View 1 residence" : `View ${count} residences`}</RollLabel>
                  <Arrow className="w-4 h-4" />
                </button>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
