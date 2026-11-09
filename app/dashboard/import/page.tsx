import OwnerGuard from "@/components/dashboard/OwnerGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import BulkImportForm from "@/components/dashboard/BulkImportForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bulk Import — Real Property Estate",
};

export default function DashboardImportPage() {
  return (
    <OwnerGuard>
      <DashboardShell>
        <div className="mb-10">
          <h1
            className="font-display text-4xl"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", fontWeight: 400 }}
          >
            Bulk Import
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
            Import many properties at once from a ZIP folder or CSV. Everything is unpublished until you review it.
          </p>
        </div>
        <BulkImportForm />
      </DashboardShell>
    </OwnerGuard>
  );
}
