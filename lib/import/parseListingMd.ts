// Lightweight parser for the fallback `listing.md` format (used only when a
// folder has no metadata.json). Deliberately simple — no markdown library —
// since the format is just "Key: value" lines plus two known sections.

interface ParsedListingMd {
  name: string;
  fields: Record<string, string>;
  shortDescription: string;
  longDescription: string;
  features: string[];
}

const FIELD_ALIASES: Record<string, string> = {
  price: "price_label",
  "price label": "price_label",
  location: "location",
  bedrooms: "bedrooms",
  bathrooms: "bathrooms",
  "internal area": "internal_area",
  "built area": "internal_area",
  "plot size": "plot_size",
  "plot area": "plot_size",
  "outdoor space": "outdoor_space",
  terrace: "outdoor_space",
  "property type": "property_type",
  "listing type": "listing_type",
  status: "status",
  pets: "pets",
  instagram: "instagram_url",
  "instagram url": "instagram_url",
  tiktok: "tiktok_url",
  "tiktok url": "tiktok_url",
};

export function parseListingMd(content: string): ParsedListingMd {
  const lines = content.split(/\r?\n/);
  let name = "";
  const fields: Record<string, string> = {};
  const descriptionLines: string[] = [];
  const features: string[] = [];

  let section: "header" | "description" | "features" | "other" = "header";

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("# ")) {
      name = line.slice(2).trim();
      continue;
    }
    if (/^##\s+description/i.test(line)) {
      section = "description";
      continue;
    }
    if (/^##\s+features/i.test(line)) {
      section = "features";
      continue;
    }
    if (/^##\s+/.test(line)) {
      section = "other";
      continue;
    }

    if (section === "header") {
      const match = line.match(/^([A-Za-z /]+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim().toLowerCase();
        const mapped = FIELD_ALIASES[key];
        if (mapped) fields[mapped] = match[2].trim();
      }
    } else if (section === "description") {
      if (line) descriptionLines.push(line);
    } else if (section === "features") {
      const match = line.match(/^[-*]\s+(.+)$/);
      if (match) features.push(match[1].trim());
    }
  }

  const paragraphs = descriptionLines.join(" ").split(/(?<=[.!?])\s{2,}/);
  const shortDescription = paragraphs[0] ?? descriptionLines.join(" ");
  const longDescription = descriptionLines.join("\n");

  return { name, fields, shortDescription, longDescription, features };
}
