import Papa from "papaparse";
import JSZip from "jszip";
import { slugify } from "@/lib/utils";
import type { ParsedProperty } from "./types";

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

interface CsvRow {
  name?: string;
  slug?: string;
  price_label?: string;
  location?: string;
  bedrooms?: string;
  bathrooms?: string;
  internal_area?: string;
  plot_size?: string;
  property_type?: string;
  listing_type?: string;
  status?: string;
  pets?: string;
  short_description?: string;
  long_description?: string;
  features?: string;
  instagram_url?: string;
  tiktok_url?: string;
  image_folder?: string;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function parseImportCsv(csvFile: File, imagesZipFile: File | null): Promise<ParsedProperty[]> {
  const csvText = await csvFile.text();
  const { data } = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  let imagesByFolder = new Map<string, JSZip.JSZipObject[]>();
  if (imagesZipFile) {
    const zip = await JSZip.loadAsync(await imagesZipFile.arrayBuffer());
    const grouped = new Map<string, JSZip.JSZipObject[]>();
    zip.forEach((relativePath, entry) => {
      if (entry.dir || !IMAGE_EXT.test(relativePath)) return;
      const parts = relativePath.split("/").filter(Boolean);
      if (parts.length < 2) return;
      const folder = parts[0];
      if (!grouped.has(folder)) grouped.set(folder, []);
      grouped.get(folder)!.push(entry);
    });
    imagesByFolder = grouped;
  }

  const properties: ParsedProperty[] = [];

  for (const row of data) {
    const name = (row.name ?? "").trim();
    if (!name && !row.location && !row.price_label) continue; // skip blank rows

    const slug = row.slug?.trim() ? slugify(row.slug) : slugify(name);
    const features = (row.features ?? "")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const property: ParsedProperty = {
      folderName: row.image_folder?.trim() ?? slug,
      slug,
      name,
      price_label: (row.price_label ?? "").trim(),
      location: (row.location ?? "").trim(),
      short_description: (row.short_description ?? "").trim(),
      long_description: (row.long_description ?? "").trim(),
      bedrooms: toNumber(row.bedrooms),
      bathrooms: toNumber(row.bathrooms),
      internal_area: (row.internal_area ?? "").trim(),
      plot_size: (row.plot_size ?? "").trim(),
      outdoor_space: "",
      property_type: (row.property_type ?? "").trim(),
      listing_type: (row.listing_type ?? "").trim(),
      status: (row.status ?? "Available").trim(),
      pets: (row.pets ?? "").trim(),
      instagram_url: (row.instagram_url ?? "").trim(),
      tiktok_url: (row.tiktok_url ?? "").trim(),
      features,
      images: [],
    };

    const folderKey = row.image_folder?.trim();
    const entries = folderKey ? imagesByFolder.get(folderKey) ?? [] : [];
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const entry of sorted) {
      const blob = await entry.async("blob");
      const filename = entry.name.split("/").pop()!;
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      property.images.push({ filename, file });
    }

    properties.push(property);
  }

  return properties;
}
