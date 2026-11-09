export interface ParsedImage {
  filename: string;
  file: File;
}

export interface ParsedProperty {
  // identity
  folderName: string;
  slug: string;

  // core fields
  name: string;
  price_label: string;
  location: string;
  short_description: string;
  long_description: string;

  // optional details
  bedrooms: number | null;
  bathrooms: number | null;
  internal_area: string;
  plot_size: string;
  outdoor_space: string;
  property_type: string;
  listing_type: string;
  status: string;
  pets: string;
  instagram_url: string;
  tiktok_url: string;
  features: string[];

  images: ParsedImage[];
}

export type RowStatus = "valid" | "warning" | "error" | "duplicate";

export interface PreviewRow {
  property: ParsedProperty;
  status: RowStatus;
  messages: string[];
}

export interface ImportResultRow {
  name: string;
  slug: string;
  status: "imported" | "skipped" | "error";
  propertyId?: string;
  message?: string;
}

export interface ImportSummary {
  totalDetected: number;
  totalImported: number;
  totalSkipped: number;
  totalErrors: number;
  results: ImportResultRow[];
}
