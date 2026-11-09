/**
 * Editorial photography of Marbella used across the public site.
 *
 * All images are from Unsplash (https://unsplash.com/license — free for
 * commercial use, no attribution required). Premium "Unsplash+" images are
 * deliberately excluded. Property photography always comes from the owner's
 * own uploads in Supabase.
 */

export interface EditorialImage {
  id: string;
  alt: string;
  /** CSS object-position, tuned per image so portrait crops keep the subject. */
  position?: string;
  credit: string;
}

export function unsplash(id: string, width = 2000, quality = 80): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

export const IMAGERY = {
  banusDusk: {
    id: "1589642073293-d0d511afb66e",
    alt: "Puerto Banús marina at dusk beneath the peak of La Concha",
    position: "50% 60%",
    credit: "Simon Hermans",
  },
  beachSunset: {
    id: "1591293771866-3e96a60916a5",
    alt: "Palms along a Marbella beach at sunset",
    position: "45% 50%",
    credit: "Unsplash",
  },
  banusBlue: {
    id: "1625528193934-4cb230e7267d",
    alt: "Yachts moored in Puerto Banús with La Concha behind",
    position: "60% 50%",
    credit: "Unsplash",
  },
  golfValley: {
    id: "1722452848316-c6c26ebeeb09",
    alt: "Golf course in Nueva Andalucía with La Concha on the horizon",
    position: "60% 40%",
    credit: "Maksim Shutov",
  },
  sierraPalms: {
    id: "1593331808946-3c61b7e65c78",
    alt: "Palms and a white Andalusian villa beneath the Sierra Blanca",
    position: "35% 45%",
    credit: "Unsplash",
  },
  oldTown: {
    id: "1633819813475-543aa9d171c8",
    alt: "Bougainvillea and orange-tree square in Marbella's old town",
    position: "50% 55%",
    credit: "Unsplash",
  },
  stairsToSea: {
    id: "1770929356942-211ef44d03be",
    alt: "A stairway lined with bougainvillea leading down to the Mediterranean",
    position: "50% 60%",
    credit: "ionut dobre",
  },
  whiteVilla: {
    id: "1590590271884-fa6626606965",
    alt: "A whitewashed Andalusian house framed by palms",
    position: "50% 70%",
    credit: "Unsplash",
  },
  hazyMarina: {
    id: "1770929356134-426035b1a404",
    alt: "Puerto Banús in soft morning haze",
    position: "50% 55%",
    credit: "ionut dobre",
  },
  modernVilla: {
    id: "1613977257363-707ba9348227",
    alt: "A contemporary white villa with an infinity pool",
    position: "50% 55%",
    credit: "Unsplash",
  },
} satisfies Record<string, EditorialImage>;
