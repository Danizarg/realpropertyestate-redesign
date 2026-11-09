import { IMAGERY, type EditorialImage } from "./media-library";

export interface Chapter {
  title: string;
  place: string;
  text: string;
  image: EditorialImage;
  /** Location filter for the collection link (omitted when we hold no listings there). */
  query?: string;
  count?: number;
}

export const CHAPTERS: Omit<Chapter, "count">[] = [
  {
    title: "The Coast",
    place: "Golden Mile · Puente Romano",
    text: "Sheltered by the Sierra Blanca, Marbella's coastline unfolds as a sequence of beaches, promenades and beach clubs — the Mediterranean as a daily ritual rather than a holiday.",
    image: IMAGERY.beachSunset,
    query: "Golden Mile",
  },
  {
    title: "The Marinas",
    place: "Puerto Banús",
    text: "Yachts, terraces and boutiques gather around Puerto Banús, while smaller harbours along the coast keep a quieter, more local rhythm.",
    image: IMAGERY.banusBlue,
    query: "Puerto Banus",
  },
  {
    title: "The Fairways",
    place: "Nueva Andalucía",
    text: "Known locally as the Golf Valley, Nueva Andalucía gathers some of the coast's most celebrated courses beneath the silhouette of La Concha.",
    image: IMAGERY.golfValley,
    query: "Nueva Andalucia",
  },
  {
    title: "The Sierra",
    place: "Benahavís · Sierra Blanca",
    text: "Above the coast, the pale peak of La Concha and the Sierra Blanca shape the light, the climate and the long views from the hillside estates.",
    image: IMAGERY.sierraPalms,
    query: "Benahavis",
  },
  {
    title: "The Old Town",
    place: "Casco Antiguo",
    text: "Whitewashed lanes, bougainvillea and the orange trees of Plaza de los Naranjos: the historic heart of Marbella remains intimate, walkable and unmistakably Andalusian.",
    image: IMAGERY.oldTown,
  },
];
