import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadPropertyImage } from "@/lib/images";
import { parsePriceLabel } from "@/lib/utils";
import type { PreviewRow, ImportResultRow, ImportSummary } from "./types";

export async function runImport(
  supabase: SupabaseClient,
  rows: PreviewRow[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportSummary> {
  const results: ImportResultRow[] = [];
  const importable = rows.filter((r) => r.status === "valid" || r.status === "warning");
  const skipped = rows.filter((r) => r.status === "duplicate");
  const errored = rows.filter((r) => r.status === "error");

  for (const row of errored) {
    results.push({
      name: row.property.name || row.property.folderName,
      slug: row.property.slug,
      status: "error",
      message: row.messages.join(" "),
    });
  }
  for (const row of skipped) {
    results.push({
      name: row.property.name || row.property.folderName,
      slug: row.property.slug,
      status: "skipped",
      message: row.messages.join(" "),
    });
  }

  let done = 0;
  for (const row of importable) {
    const p = row.property;
    try {
      const { data: newProp, error } = await supabase
        .from("properties")
        .insert({
          name: p.name,
          slug: p.slug,
          short_description: p.short_description || p.long_description.slice(0, 200),
          long_description: p.long_description || null,
          price: parsePriceLabel(p.price_label),
          price_label: p.price_label,
          location: p.location,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          internal_area: p.internal_area || null,
          plot_size: p.plot_size || null,
          outdoor_space: p.outdoor_space || null,
          property_type: p.property_type || null,
          listing_type: p.listing_type || null,
          status: p.status || "Available",
          pets: p.pets || null,
          instagram_url: p.instagram_url || null,
          tiktok_url: p.tiktok_url || null,
          features: p.features.length > 0 ? p.features : null,
          published: false,
          featured: false,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      let imageFailures = 0;
      for (let i = 0; i < p.images.length; i++) {
        try {
          await uploadPropertyImage(supabase, newProp.id, p.images[i].file, i);
        } catch {
          imageFailures++;
        }
      }

      results.push({
        name: p.name,
        slug: p.slug,
        status: "imported",
        propertyId: newProp.id,
        message: imageFailures > 0 ? `${imageFailures} image(s) failed to upload.` : undefined,
      });
    } catch (err) {
      results.push({
        name: p.name || p.folderName,
        slug: p.slug,
        status: "error",
        message: err instanceof Error ? err.message : "Import failed.",
      });
    }

    done++;
    onProgress?.(done, importable.length);
  }

  return {
    totalDetected: rows.length,
    totalImported: results.filter((r) => r.status === "imported").length,
    totalSkipped: results.filter((r) => r.status === "skipped").length,
    totalErrors: results.filter((r) => r.status === "error").length,
    results,
  };
}
