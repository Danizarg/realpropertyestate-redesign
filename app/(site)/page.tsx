import CinematicIntro from "@/components/intro/CinematicIntro";
import Hero from "@/components/home/Hero";
import DiscoverySearch from "@/components/home/DiscoverySearch";
import FeaturedResidences from "@/components/home/FeaturedResidences";
import LifestyleChapters from "@/components/home/LifestyleChapters";
import Philosophy from "@/components/home/Philosophy";
import FounderPreview from "@/components/home/FounderPreview";
import PrivateEnquiry from "@/components/home/PrivateEnquiry";
import { getListingSummaries, selectFeatured } from "@/lib/properties";
import { getHomepageCoverSettings, getAboutVideoSettings } from "@/lib/settings";
import { CHAPTERS } from "@/lib/lifestyle";
import { matchesLocation } from "@/lib/property-utils";
import { getYouTubeEmbedUrl } from "@/lib/utils";

async function getVideoTitle(url: string | null): Promise<string> {
  if (!url) return "Our film";
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return "Our film";
    const body = (await res.json()) as { title?: string };
    return body.title?.trim() || "Our film";
  } catch {
    return "Our film";
  }
}

export default async function HomePage() {
  const [listings, cover, aboutVideo] = await Promise.all([
    getListingSummaries(),
    getHomepageCoverSettings(),
    getAboutVideoSettings(),
  ]);
  const aboutVideoEmbedUrl = getYouTubeEmbedUrl(aboutVideo.youtubeUrl);
  const videoTitle = await getVideoTitle(aboutVideoEmbedUrl ? aboutVideo.youtubeUrl : null);

  const featured = selectFeatured(listings);
  const curated = listings.some((l) => l.featured);
  const chapters = CHAPTERS.map((c) => ({
    ...c,
    count: c.query ? listings.filter((l) => matchesLocation(l.location, c.query!)).length : undefined,
  }));

  return (
    <>
      <CinematicIntro cover={cover} />
      <Hero cover={cover} total={listings.length} />
      <DiscoverySearch listings={listings} />
      <FeaturedResidences listings={featured} total={listings.length} curated={curated} />
      <LifestyleChapters chapters={chapters} />
      <Philosophy videoEmbedUrl={aboutVideoEmbedUrl} videoTitle={videoTitle} />
      <FounderPreview />
      <PrivateEnquiry />
    </>
  );
}
