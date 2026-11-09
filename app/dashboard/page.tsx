import Link from "next/link";
import Image from "next/image";
import OwnerGuard from "@/components/dashboard/OwnerGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PublishToggle from "@/components/dashboard/PublishToggle";
import type { Metadata } from "next";
import type { Property } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard — Real Property Estate",
};

async function getAllProperties(): Promise<Property[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("properties")
      .select("*, property_images(*)")
      .order("created_at", { ascending: false });
    return (data as Property[]) ?? [];
  } catch {
    return [];
  }
}

async function toggleField(id: string, field: "published" | "featured", value: boolean) {
  "use server";
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.from("properties").update({ [field]: value }).eq("id", id);
  } catch {}
}

export default async function DashboardPage() {
  const properties = await getAllProperties();

  return (
    <OwnerGuard>
      <DashboardShell>
        <div className="flex items-center justify-between mb-10">
          <h1
            className="font-display text-4xl"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", fontWeight: 400 }}
          >
            Properties
          </h1>
          <Link
            href="/dashboard/properties/new"
            className="px-6 py-3 text-[13px] tracking-[0.06em] uppercase text-white transition-opacity hover:opacity-80"
            style={{ background: "#111111", borderRadius: 4, fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Add Property
          </Link>
        </div>

        {properties.length === 0 ? (
          <div
            className="text-center py-20"
            style={{ border: "1px solid #E6E3DE", background: "white" }}
          >
            <p
              className="font-display text-3xl mb-3"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111" }}
            >
              No properties yet
            </p>
            <p className="text-[14px] mb-8" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
              Add your first property to get started.
            </p>
            <Link
              href="/dashboard/properties/new"
              className="inline-block px-6 py-3 text-[13px] tracking-[0.06em] uppercase text-white"
              style={{ background: "#111111", borderRadius: 4, fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Add Property
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((property) => {
              const cover = property.property_images?.find((i) => i.is_cover) ?? property.property_images?.[0];
              return (
                <div
                  key={property.id}
                  className="flex items-center gap-6 p-5 bg-white"
                  style={{ border: "1px solid #E6E3DE" }}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative flex-shrink-0 bg-[#F5F4F1] overflow-hidden"
                    style={{ width: 80, height: 60 }}
                  >
                    {cover && (
                      <Image
                        src={cover.url}
                        alt={property.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-display text-lg truncate"
                      style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", fontWeight: 400 }}
                    >
                      {property.name}
                    </p>
                    <p
                      className="text-[13px]"
                      style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}
                    >
                      {property.location} · {property.price_label} · {property.status}
                    </p>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-6">
                    <PublishToggle
                      defaultChecked={property.published}
                      label="Published"
                      action={toggleField.bind(null, property.id, "published")}
                    />
                    <PublishToggle
                      defaultChecked={property.featured}
                      label="Featured"
                      action={toggleField.bind(null, property.id, "featured")}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link
                      href={`/dashboard/properties/${property.id}/edit`}
                      className="text-[13px] px-4 py-2 transition-colors hover:bg-[#F5F4F1]"
                      style={{ border: "1px solid #E6E3DE", fontFamily: "Inter, system-ui, sans-serif", color: "#2D2C2A", borderRadius: 2 }}
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/properties/${property.slug}`}
                      target="_blank"
                      className="text-[13px] px-4 py-2 transition-colors hover:bg-[#F5F4F1]"
                      style={{ border: "1px solid #E6E3DE", fontFamily: "Inter, system-ui, sans-serif", color: "#8A8781", borderRadius: 2 }}
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardShell>
    </OwnerGuard>
  );
}
