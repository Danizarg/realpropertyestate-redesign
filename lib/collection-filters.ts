import { compactEuro, matchesLocation, normalize } from "./property-utils";
import type { ListingSummary } from "./types";

export interface CollectionFilters {
  q: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  propertyType: string;
  listingType: string;
  pets: string;
  sort: "newest" | "price_desc" | "price_asc";
}

export const DEFAULT_FILTERS: CollectionFilters = {
  q: "",
  location: "",
  minPrice: "",
  maxPrice: "",
  bedrooms: "",
  propertyType: "",
  listingType: "",
  pets: "",
  sort: "newest",
};

/** URL parameter names (short, shareable). */
const PARAMS: Record<keyof CollectionFilters, string> = {
  q: "q",
  location: "location",
  minPrice: "min",
  maxPrice: "max",
  bedrooms: "beds",
  propertyType: "type",
  listingType: "listing",
  pets: "pets",
  sort: "sort",
};

const SORTS = new Set(["newest", "price_desc", "price_asc"]);

export function filtersFromParams(params: Record<string, string | string[] | undefined> | URLSearchParams): CollectionFilters {
  const get = (k: string) => {
    if (params instanceof URLSearchParams) return params.get(k) ?? "";
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const f: CollectionFilters = { ...DEFAULT_FILTERS };
  (Object.keys(PARAMS) as (keyof CollectionFilters)[]).forEach((key) => {
    const raw = get(PARAMS[key]).trim().slice(0, 120);
    if (key === "sort") f.sort = SORTS.has(raw) ? (raw as CollectionFilters["sort"]) : "newest";
    else if (key === "minPrice" || key === "maxPrice" || key === "bedrooms") f[key] = /^\d+$/.test(raw) ? raw : "";
    else f[key] = raw;
  });
  return f;
}

export function filtersToQuery(f: Partial<CollectionFilters>): string {
  const sp = new URLSearchParams();
  (Object.keys(PARAMS) as (keyof CollectionFilters)[]).forEach((key) => {
    const v = f[key];
    if (!v) return;
    if (key === "sort" && v === "newest") return;
    sp.set(PARAMS[key], String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: CollectionFilters): number {
  return (["q", "location", "minPrice", "maxPrice", "bedrooms", "propertyType", "listingType", "pets"] as const).filter(
    (k) => !!f[k]
  ).length;
}

/**
 * Same semantics as the original catalogue: location is a substring match
 * (now accent-insensitive), properties without a numeric price are not
 * excluded by price bounds, bedrooms means "at least".
 */
export function applyFilters(all: ListingSummary[], f: CollectionFilters): ListingSummary[] {
  const terms = normalize(f.q).split(/\s+/).filter(Boolean);
  return all
    .filter((p) => {
      if (terms.length) {
        const hay = normalize(`${p.name} ${p.location} ${p.property_type ?? ""} ${p.listing_type ?? ""}`);
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      if (f.location && !matchesLocation(p.location, f.location)) return false;
      if (f.minPrice && p.price != null && p.price < Number(f.minPrice)) return false;
      if (f.maxPrice && p.price != null && p.price > Number(f.maxPrice)) return false;
      if (f.bedrooms && (p.bedrooms == null || p.bedrooms < Number(f.bedrooms))) return false;
      if (f.propertyType && p.property_type !== f.propertyType) return false;
      if (f.listingType && p.listing_type !== f.listingType) return false;
      if (f.pets && p.pets !== f.pets) return false;
      return true;
    })
    .sort((a, b) => {
      if (f.sort === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
      if (f.sort === "price_asc") return (a.price ?? 0) - (b.price ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

export const PRICE_STEPS = [
  500_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_500_000,
  10_000_000, 12_500_000, 15_000_000, 20_000_000,
];

export const priceOptions = () => PRICE_STEPS.map((v) => ({ value: String(v), label: compactEuro(v) }));

/** Homepage console price bands. */
export const PRICE_BANDS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: "0-2000000", label: "Up to €2M", max: 2_000_000 },
  { value: "2000000-4000000", label: "€2M – €4M", min: 2_000_000, max: 4_000_000 },
  { value: "4000000-7000000", label: "€4M – €7M", min: 4_000_000, max: 7_000_000 },
  { value: "7000000-10000000", label: "€7M – €10M", min: 7_000_000, max: 10_000_000 },
  { value: "10000000-", label: "€10M and above", min: 10_000_000 },
];
