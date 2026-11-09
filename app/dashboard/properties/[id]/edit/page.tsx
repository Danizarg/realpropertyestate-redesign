import { notFound } from "next/navigation";
import OwnerGuard from "@/components/dashboard/OwnerGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PropertyForm from "@/components/dashboard/PropertyForm";
import type { Metadata } from "next";
import type { Property } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getProperty(id: string): Promise<Property | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties")
      .select("*, property_images(*)")
      .eq("id", id)
      .single();
    return (data as Property) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await getProperty(id);
  return {
    title: property ? `Edit: ${property.name} — Real Property Estate` : "Edit Property",
  };
}

export default async function EditPropertyPage({ params }: PageProps) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();

  return (
    <OwnerGuard>
      <DashboardShell>
        <div className="mb-10">
          <a
            href="/dashboard"
            className="text-[13px] transition-colors hover:text-[#111111] mb-6 inline-block"
            style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}
          >
            ← Back to properties
          </a>
          <h1
            className="font-display text-4xl"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", fontWeight: 400 }}
          >
            Edit Property
          </h1>
        </div>
        <PropertyForm
          mode="edit"
          propertyId={property.id}
          existingImages={property.property_images ?? []}
          defaultValues={{
            name: property.name,
            slug: property.slug,
            short_description: property.short_description,
            long_description: property.long_description ?? undefined,
            price: property.price ?? undefined,
            price_label: property.price_label,
            location: property.location,
            address: property.address ?? undefined,
            bedrooms: property.bedrooms ?? undefined,
            bathrooms: property.bathrooms ?? undefined,
            internal_area: property.internal_area ?? undefined,
            plot_size: property.plot_size ?? undefined,
            outdoor_space: property.outdoor_space ?? undefined,
            property_type: property.property_type ?? undefined,
            listing_type: property.listing_type ?? undefined,
            status: property.status,
            pets: property.pets ?? undefined,
            instagram_url: property.instagram_url ?? undefined,
            tiktok_url: property.tiktok_url ?? undefined,
            features: property.features ?? [],
            published: property.published,
            featured: property.featured,
          }}
        />
      </DashboardShell>
    </OwnerGuard>
  );
}
