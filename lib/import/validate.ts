import type { ParsedProperty, PreviewRow, RowStatus } from "./types";

export function validateProperty(property: ParsedProperty, existingSlugs: Set<string>): PreviewRow {
  const messages: string[] = [];
  let status: RowStatus = "valid";

  if (existingSlugs.has(property.slug)) {
    return {
      property,
      status: "duplicate",
      messages: [`A property with slug "${property.slug}" already exists — will be skipped.`],
    };
  }

  const errors: string[] = [];
  if (!property.name) errors.push("Missing property name.");
  if (!property.price_label) errors.push("Missing price label.");
  if (!property.location) errors.push("Missing location.");
  if (!property.short_description && !property.long_description) {
    errors.push("Missing description (short or long).");
  }
  if (property.images.length === 0) errors.push("No images found.");

  if (errors.length > 0) {
    return { property, status: "error", messages: errors };
  }

  if (!property.bedrooms) messages.push("No bedrooms specified.");
  if (!property.bathrooms) messages.push("No bathrooms specified.");
  if (!property.internal_area) messages.push("No internal area specified.");
  if (!property.property_type) messages.push("No property type specified.");
  if (!property.listing_type) messages.push("No listing type specified.");

  if (messages.length > 0) status = "warning";

  return { property, status, messages };
}

export function validateAll(properties: ParsedProperty[], existingSlugs: Set<string>): PreviewRow[] {
  return properties.map((p) => validateProperty(p, existingSlugs));
}
