/**
 * Shared image scrims. The homepage hero and the intro's final frame must use
 * the identical scrim so the intro dissolves into the hero without a visible
 * change in tone.
 */
export const HERO_SCRIM = [
  "linear-gradient(90deg, rgba(16,20,19,0.62) 0%, rgba(16,20,19,0.28) 38%, rgba(16,20,19,0) 68%)",
  "linear-gradient(180deg, rgba(16,20,19,0.55) 0%, rgba(16,20,19,0.05) 30%, rgba(16,20,19,0.18) 58%, rgba(16,20,19,0.88) 100%)",
].join(", ");

export const DETAIL_SCRIM = [
  "linear-gradient(90deg, rgba(16,20,19,0.5) 0%, rgba(16,20,19,0.18) 40%, rgba(16,20,19,0) 70%)",
  "linear-gradient(180deg, rgba(16,20,19,0.6) 0%, rgba(16,20,19,0.05) 30%, rgba(16,20,19,0.15) 55%, rgba(16,20,19,0.9) 100%)",
].join(", ");
