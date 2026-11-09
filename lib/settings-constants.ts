import type { HomepageCoverSettings, AboutVideoSettings } from "./types";

export const HOMEPAGE_COVER_KEY = "homepage_cover";
export const ABOUT_VIDEO_KEY = "about_video";

// Matches the hardcoded video that existed before this setting was added.
export const DEFAULT_ABOUT_VIDEO: AboutVideoSettings = {
  youtubeUrl: "https://www.youtube.com/watch?v=81kdLfUUg1o",
};

// Used whenever no row exists yet in site_settings, so the homepage never
// breaks. The owner can override every field from Dashboard → Homepage Cover.
export const DEFAULT_HOMEPAGE_COVER: HomepageCoverSettings = {
  mediaType: "image",
  mediaUrl: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=2400&q=82",
  storagePath: null,
  title: "Where extraordinary living begins.",
  subtitle: "Exceptional properties. Exceptional places. A distinctly personal approach.",
  buttonText: "Explore Residences",
  buttonLink: "/properties",
};
