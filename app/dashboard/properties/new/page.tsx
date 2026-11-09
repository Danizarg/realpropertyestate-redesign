import OwnerGuard from "@/components/dashboard/OwnerGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PropertyForm from "@/components/dashboard/PropertyForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Property — Real Property Estate",
};

export default function NewPropertyPage() {
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
            Add New Property
          </h1>
        </div>
        <PropertyForm mode="new" />
      </DashboardShell>
    </OwnerGuard>
  );
}
