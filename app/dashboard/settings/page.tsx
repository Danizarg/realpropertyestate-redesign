import OwnerGuard from "@/components/dashboard/OwnerGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import HomepageCoverForm from "@/components/dashboard/HomepageCoverForm";
import AboutVideoForm from "@/components/dashboard/AboutVideoForm";
import { getHomepageCoverSettings, getAboutVideoSettings } from "@/lib/settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — Real Property Estate",
};

export default async function DashboardSettingsPage() {
  const cover = await getHomepageCoverSettings();
  const aboutVideo = await getAboutVideoSettings();

  return (
    <OwnerGuard>
      <DashboardShell>
        <div className="mb-10">
          <h1
            className="font-display text-4xl"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", fontWeight: 400 }}
          >
            Homepage Cover
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
            Control the image or video shown at the top of the homepage.
          </p>
        </div>
        <HomepageCoverForm initial={cover} />

        <div className="mt-16 mb-10">
          <h1
            className="font-display text-4xl"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", fontWeight: 400 }}
          >
            About Video
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
            Control the YouTube video shown in the &quot;Our approach&quot; section of the homepage.
          </p>
        </div>
        <AboutVideoForm initial={aboutVideo} />
      </DashboardShell>
    </OwnerGuard>
  );
}
