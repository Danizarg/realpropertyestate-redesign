/**
 * Every line that is pre-recorded in the concierge voice.
 *
 * `npm run voice:render` turns each of these into an audio file in
 * public/voice/, so the site can speak them with no API key at runtime.
 * Keep this file dependency-free: the render script imports it directly.
 *
 * Concierge replies are matched by their opening sentence(s), so a reply such
 * as "Let me help you explore suitable residences. 7 residences match — …"
 * speaks its recorded first sentence and shows the rest on screen.
 */

export const INTRO_NARRATION = [
  "Welcome to Marbella.",
  "A place where extraordinary living meets timeless beauty.",
  "Discover your next chapter with Real Property Estate.",
] as const;

const OPENING_REST =
  "I'm the Real Property Estate concierge. Tell me what you have in mind — an area, a type of home, a budget — and I'll show you residences from our current collection.";

export const CONCIERGE_LINES = [
  `Good morning. ${OPENING_REST}`,
  `Good afternoon. ${OPENING_REST}`,
  `Good evening. ${OPENING_REST}`,
  "Of course. May I ask what price range you have in mind?",
  "Let me help you explore suitable residences.",
  "Here are a few more that fit your brief.",
  "That's everything that matches your brief in our current collection. I can widen the search, or connect you with our team for a private conversation.",
  "Of course — let's begin again. What would you like to explore?",
  "It's my pleasure. Whenever you're ready, I can arrange a private viewing or keep exploring with you.",
  "I'd be delighted to connect you with our team. Message us directly on WhatsApp, or leave a private enquiry and we'll respond personally.",
  "We'd be glad to discuss selling your property. Our team works alongside architects, lawyers and notaries to support every stage — leave a few details and we'll be in touch.",
  "Our current public collection is offered for sale. For rentals, our team will be happy to advise you personally.",
  "Real Property Estate was founded by Massimo Michelino. For more than two decades, he and a trusted team have connected discerning clients with some of the finest opportunities on the Costa del Sol — alongside architects, engineers, lawyers and notaries.",
  "Marbella is far more than a destination — it is a way of life: a year-round Mediterranean climate, world-class infrastructure, renowned golf courses, luxury marinas, fine dining and a breathtaking coastline. With consistent demand and limited supply in prime locations, it remains one of Europe's most attractive real estate markets.",
  "I can help you explore residences by area, type, budget or bedrooms — or connect you with our team for a private viewing.",
  "I'm listening — what kind of residence are you looking for?",
] as const;

export const RECORDED_LINES: readonly string[] = [...INTRO_NARRATION, ...CONCIERGE_LINES];

/** How a line is read aloud: dashes become natural pauses. */
export function spokenForm(text: string): string {
  return text.replace(/\s+—\s+/g, ", ").replace(/\s+/g, " ").trim();
}

/** Lookup key for a line's recording (matches text before or after `spokenForm`). */
export function clipKey(text: string): string {
  return spokenForm(text).toLowerCase();
}

/** Splits text into sentences, keeping their punctuation. */
export function sentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+(?=[A-Z0-9"“‘(€])/g, "$1\u0000")
    .split("\u0000")
    .map((s) => s.trim())
    .filter(Boolean);
}
