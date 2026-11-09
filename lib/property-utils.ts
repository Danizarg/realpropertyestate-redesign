import type { ListingImage, ListingSummary, Property, PropertyImage } from "./types";

/** Lower-case and strip accents so "Benahavís" matches "Benahavis". */
export function normalize(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function sortImages<T extends Pick<PropertyImage, "sort_order">>(images: T[] | null | undefined): T[] {
  return [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

/** Owner-chosen cover first, otherwise the first image by sort order. */
export function pickCover<T extends Pick<PropertyImage, "sort_order" | "is_cover">>(
  images: T[] | null | undefined
): T | null {
  const sorted = sortImages(images);
  return sorted.find((i) => i.is_cover) ?? sorted[0] ?? null;
}

function toListingImage(img: PropertyImage | ListingImage): ListingImage {
  return { id: img.id, url: img.url, alt: img.alt, sort_order: img.sort_order, is_cover: img.is_cover };
}

export function toSummary(p: Property): ListingSummary {
  const sorted = sortImages(p.property_images);
  const cover = pickCover(sorted);
  const secondary = sorted.find((i) => i.id !== cover?.id) ?? null;
  return {
    id: p.id,
    created_at: p.created_at,
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    price: p.price,
    price_label: p.price_label,
    location: p.location,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    internal_area: p.internal_area,
    plot_size: p.plot_size,
    property_type: p.property_type,
    listing_type: p.listing_type,
    status: p.status,
    pets: p.pets,
    features: p.features,
    featured: p.featured,
    cover: cover ? toListingImage(cover) : null,
    secondary: secondary ? toListingImage(secondary) : null,
  };
}

/** Display price: the owner's label wins, then the numeric price. */
export function displayPrice(price: number | null, label: string | null | undefined): string {
  if (label && label.trim()) return label.trim();
  if (!price) return "Price on request";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

/** Compact euro amount for filter chips: 2500000 -> "€2.5M". */
export function compactEuro(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `€${Number.isInteger(m) ? m : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) return `€${Math.round(value / 1_000)}K`;
  return `€${value}`;
}

/** The comma-suffix of a location ("El Herrojo, Benahavis" -> "Benahavis"). */
function areaToken(location: string): string | null {
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 1];
}

export function matchesLocation(location: string, query: string): boolean {
  if (!query) return true;
  return normalize(location).includes(normalize(query));
}

export interface LocationOption {
  value: string;
  label: string;
  count: number;
  group: "Areas" | "Communities";
}

/**
 * Builds location options from real inventory: broad areas (the part after
 * the last comma) and individual communities, de-duplicated across accent and
 * spelling variants. Counts use the same matching the filter uses, so they are
 * always accurate.
 */
export function buildLocationOptions(listings: Pick<ListingSummary, "location">[]): LocationOption[] {
  const labelFor = new Map<string, Map<string, number>>();
  const remember = (key: string, label: string) => {
    const variants = labelFor.get(key) ?? new Map<string, number>();
    variants.set(label, (variants.get(label) ?? 0) + 1);
    labelFor.set(key, variants);
  };
  const bestLabel = (key: string) => {
    const variants = labelFor.get(key);
    if (!variants) return key;
    return [...variants.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  const areaKeys = new Set<string>();
  const communityKeys = new Set<string>();
  for (const { location } of listings) {
    if (!location) continue;
    const area = areaToken(location);
    if (area) {
      areaKeys.add(normalize(area));
      remember(normalize(area), area);
    }
    communityKeys.add(normalize(location));
    remember(normalize(location), location.trim());
  }

  const count = (key: string) => listings.filter((l) => normalize(l.location).includes(key)).length;

  const areas: LocationOption[] = [...areaKeys]
    .map((key) => ({ value: bestLabel(key), label: bestLabel(key), count: count(key), group: "Areas" as const }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const communities: LocationOption[] = [...communityKeys]
    .filter((key) => !areaKeys.has(key))
    .map((key) => ({ value: bestLabel(key), label: bestLabel(key), count: count(key), group: "Communities" as const }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [...areas, ...communities];
}

export function distinctValues(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v && !!v.trim()).map((v) => v.trim()))).sort(
    (a, b) => a.localeCompare(b)
  );
}

/**
 * Long descriptions are often one unbroken block. Keep any line breaks the
 * owner wrote; otherwise group sentences into readable editorial paragraphs.
 */
export function toParagraphs(text: string | null | undefined, target = 420): string[] {
  const source = (text ?? "").trim();
  if (!source) return [];
  if (/\n/.test(source)) {
    return source
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  const sentences = source.replace(/([.!?])\s+(?=[A-Z"“‘(])/g, "$1\u0000").split("\u0000");
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current && current.length + s.length > target) {
      out.push(current.trim());
      current = "";
    }
    current += `${s} `;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** Spec line items for cards, only for fields that exist. */
export function specItems(p: Pick<ListingSummary, "bedrooms" | "bathrooms" | "internal_area">): string[] {
  const items: string[] = [];
  if (p.bedrooms != null) items.push(`${p.bedrooms} ${p.bedrooms === 1 ? "bed" : "beds"}`);
  if (p.bathrooms != null) items.push(`${p.bathrooms} ${p.bathrooms === 1 ? "bath" : "baths"}`);
  if (p.internal_area) items.push(p.internal_area);
  return items;
}
