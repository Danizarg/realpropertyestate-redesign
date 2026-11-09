import { SEED_PROPERTIES } from "./seed";
import { pickCover, sortImages, toSummary } from "./property-utils";
import type { ListingImage, ListingSummary, Property } from "./types";

/**
 * Server-side data access for published properties.
 *
 * Seed data is used only when Supabase is not configured (local development).
 * When Supabase is configured, a failed query returns an empty result instead
 * of sample listings, so mock properties can never appear in production.
 */

const SUMMARY_COLUMNS =
  "id, created_at, name, slug, short_description, price, price_label, location, bedrooms, bathrooms, internal_area, plot_size, property_type, listing_type, status, pets, features, featured";

const hasSupabase = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL;

async function serverClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

const PAGE = 1000;

type SummaryRow = Omit<ListingSummary, "cover" | "secondary">;
type ImageRow = ListingImage & { property_id: string };

export async function getListingSummaries(): Promise<ListingSummary[]> {
  if (!hasSupabase()) return SEED_PROPERTIES.filter((p) => p.published).map(toSummary);

  try {
    const supabase = await serverClient();

    const rows: SummaryRow[] = [];
    for (let from = 0; from < PAGE * 10; from += PAGE) {
      const { data, error } = await supabase
        .from("properties")
        .select(SUMMARY_COLUMNS)
        .eq("published", true)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...((data ?? []) as SummaryRow[]));
      if (!data || data.length < PAGE) break;
    }
    if (rows.length === 0) return [];

    // Only the owner-chosen cover and the first two images per property.
    const images: ImageRow[] = [];
    for (let from = 0; from < PAGE * 10; from += PAGE) {
      const { data, error } = await supabase
        .from("property_images")
        .select("id, property_id, url, alt, sort_order, is_cover")
        .or("is_cover.eq.true,sort_order.lte.1")
        .order("sort_order", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      images.push(...((data ?? []) as ImageRow[]));
      if (!data || data.length < PAGE) break;
    }

    const byProperty = new Map<string, ImageRow[]>();
    for (const img of images) {
      const list = byProperty.get(img.property_id) ?? [];
      list.push(img);
      byProperty.set(img.property_id, list);
    }

    return rows.map((row) => {
      const imgs = sortImages(byProperty.get(row.id));
      const cover = pickCover(imgs);
      const secondary = imgs.find((i) => i.id !== cover?.id) ?? null;
      const strip = (i: ImageRow | null): ListingImage | null =>
        i ? { id: i.id, url: i.url, alt: i.alt, sort_order: i.sort_order, is_cover: i.is_cover } : null;
      return { ...row, cover: strip(cover), secondary: strip(secondary) };
    });
  } catch (err) {
    console.error("getListingSummaries failed:", err);
    return [];
  }
}

/**
 * Homepage selection: properties the owner marked as featured. If none are
 * featured yet, the newest listings are shown so the section is never empty.
 */
export function selectFeatured(listings: ListingSummary[], max = 5): ListingSummary[] {
  const featured = listings.filter((l) => l.featured);
  if (featured.length > 0) return featured.slice(0, max);
  return listings.slice(0, Math.min(3, max));
}

export async function getProperty(slug: string): Promise<Property | null> {
  if (!hasSupabase()) {
    return SEED_PROPERTIES.find((p) => p.slug === slug && p.published) ?? null;
  }
  try {
    const supabase = await serverClient();
    const { data } = await supabase
      .from("properties")
      .select("*, property_images(*)")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    if (!data) return null;
    const property = data as Property;
    property.property_images = sortImages(property.property_images);
    return property;
  } catch (err) {
    console.error("getProperty failed:", err);
    return null;
  }
}

export async function getRelatedProperties(property: Property, limit = 3): Promise<ListingSummary[]> {
  const all = await getListingSummaries();
  const others = all.filter((p) => p.slug !== property.slug);
  const sameLocation = others.filter((p) => p.location === property.location);
  const sameType = others.filter(
    (p) => p.location !== property.location && property.property_type && p.property_type === property.property_type
  );
  return [...sameLocation, ...sameType].slice(0, limit);
}
