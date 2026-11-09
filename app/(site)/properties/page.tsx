import type { Metadata } from "next";
import CollectionExplorer from "@/components/properties/CollectionExplorer";
import { getListingSummaries } from "@/lib/properties";
import { filtersFromParams } from "@/lib/collection-filters";

export const metadata: Metadata = {
  title: "Properties — Real Property Estate",
  description: "Villas, penthouses, apartments and plots across Marbella and the Costa del Sol, presented by Real Property Estate.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const [params, listings] = await Promise.all([searchParams, getListingSummaries()]);
  const filters = filtersFromParams(params);
  const view = (Array.isArray(params.view) ? params.view[0] : params.view) === "list" ? "list" : "grid";

  return <CollectionExplorer listings={listings} initialFilters={filters} initialView={view} />;
}
