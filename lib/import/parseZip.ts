import JSZip from "jszip";
import { slugify } from "@/lib/utils";
import { parseListingMd } from "./parseListingMd";
import type { ParsedProperty, ParsedImage } from "./types";

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

interface RawMetadata {
  name?: string;
  price_label?: string;
  location?: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  internal_area?: string;
  plot_size?: string;
  outdoor_space?: string;
  property_type?: string;
  listing_type?: string;
  status?: string;
  pets?: string;
  short_description?: string;
  long_description?: string;
  features?: string[];
  instagram_url?: string;
  tiktok_url?: string;
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function emptyProperty(folderName: string): ParsedProperty {
  return {
    folderName,
    slug: slugify(folderName),
    name: "",
    price_label: "",
    location: "",
    short_description: "",
    long_description: "",
    bedrooms: null,
    bathrooms: null,
    internal_area: "",
    plot_size: "",
    outdoor_space: "",
    property_type: "",
    listing_type: "",
    status: "Available",
    pets: "",
    instagram_url: "",
    tiktok_url: "",
    features: [],
    images: [],
  };
}

export async function parseImportZip(file: File): Promise<ParsedProperty[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  // Group entries by their top-level folder name.
  const folders = new Map<string, JSZip.JSZipObject[]>();
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    const parts = relativePath.split("/").filter(Boolean);
    if (parts.length < 2) return; // not inside a property folder
    const folderName = parts[0];
    if (!folders.has(folderName)) folders.set(folderName, []);
    folders.get(folderName)!.push(entry);
  });

  const properties: ParsedProperty[] = [];

  for (const [folderName, entries] of folders) {
    const property = emptyProperty(folderName);

    const metadataEntry = entries.find((e) => e.name.endsWith("/metadata.json"));
    const listingMdEntry = entries.find((e) => e.name.endsWith("/listing.md"));
    const imageEntries = entries
      .filter((e) => IMAGE_EXT.test(e.name) && /\/images\//i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (metadataEntry) {
      try {
        const raw = JSON.parse(await metadataEntry.async("string")) as RawMetadata;
        property.name = raw.name ?? "";
        property.price_label = raw.price_label ?? "";
        property.location = raw.location ?? "";
        property.short_description = raw.short_description ?? "";
        property.long_description = raw.long_description ?? "";
        property.bedrooms = toNumber(raw.bedrooms);
        property.bathrooms = toNumber(raw.bathrooms);
        property.internal_area = raw.internal_area ?? "";
        property.plot_size = raw.plot_size ?? "";
        property.outdoor_space = raw.outdoor_space ?? "";
        property.property_type = raw.property_type ?? "";
        property.listing_type = raw.listing_type ?? "";
        property.status = raw.status ?? "Available";
        property.pets = raw.pets ?? "";
        property.instagram_url = raw.instagram_url ?? "";
        property.tiktok_url = raw.tiktok_url ?? "";
        property.features = Array.isArray(raw.features) ? raw.features : [];
      } catch {
        // fall through — leave fields empty, will be flagged by validation
      }
    } else if (listingMdEntry) {
      const content = await listingMdEntry.async("string");
      const parsed = parseListingMd(content);
      property.name = parsed.name;
      property.short_description = parsed.shortDescription;
      property.long_description = parsed.longDescription;
      property.features = parsed.features;
      property.price_label = parsed.fields.price_label ?? "";
      property.location = parsed.fields.location ?? "";
      property.bedrooms = toNumber(parsed.fields.bedrooms);
      property.bathrooms = toNumber(parsed.fields.bathrooms);
      property.internal_area = parsed.fields.internal_area ?? "";
      property.plot_size = parsed.fields.plot_size ?? "";
      property.outdoor_space = parsed.fields.outdoor_space ?? "";
      property.property_type = parsed.fields.property_type ?? "";
      property.listing_type = parsed.fields.listing_type ?? "";
      property.status = parsed.fields.status ?? "Available";
      property.pets = parsed.fields.pets ?? "";
      property.instagram_url = parsed.fields.instagram_url ?? "";
      property.tiktok_url = parsed.fields.tiktok_url ?? "";
    }

    if (!property.name) property.name = folderName.replace(/[-_]/g, " ");
    property.slug = slugify(property.name);

    for (const entry of imageEntries) {
      const blob = await entry.async("blob");
      const filename = entry.name.split("/").pop()!;
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      property.images.push({ filename, file });
    }

    properties.push(property);
  }

  return properties;
}
