import { buildLocationOptions, compactEuro, displayPrice, normalize } from "@/lib/property-utils";
import { filtersToQuery } from "@/lib/collection-filters";
import { WHATSAPP_GENERAL_URL, buildPropertyWhatsAppUrl } from "@/lib/whatsapp";
import type { ListingSummary } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   Concierge engine contract
   The UI talks only to `ConciergeEngine`. The bundled LocalConciergeEngine runs
   entirely in the browser against the live published listings — it is a
   deterministic preview, not an AI model. To connect a production AI service,
   implement `respond()` against your own backend (e.g. a /api/concierge route
   that calls an LLM server-side with the listing summaries) and return it from
   `createConciergeEngine()`. Never call an AI provider directly from the
   browser with a secret key.
   ────────────────────────────────────────────────────────────────────────── */

export interface ConciergeAction {
  label: string;
  href: string;
  external?: boolean;
}

export interface ConciergeReply {
  text: string;
  matches?: ListingSummary[];
  total?: number;
  actions?: ConciergeAction[];
  suggestions?: string[];
}

export interface SearchSlots {
  typeKey?: string;
  typeLabel?: string;
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  target?: number;
  beds?: number;
  features: string[];
  noBudget?: boolean;
}

export interface ConversationState {
  slots: SearchSlots;
  askedPrice: boolean;
  lastResults: ListingSummary[];
  shown: number;
  focus?: ListingSummary;
  /** Criteria the last results actually satisfy (after any relaxation). */
  effective?: SearchSlots;
}

export interface ConciergeEngine {
  readonly mode: "preview" | "live";
  respond(input: string, state: ConversationState, listings: ListingSummary[]): Promise<{ reply: ConciergeReply; state: ConversationState }>;
}

export const initialConversation = (): ConversationState => ({
  slots: { features: [] },
  askedPrice: false,
  lastResults: [],
  shown: 0,
});

export function createConciergeEngine(): ConciergeEngine {
  return new LocalConciergeEngine();
}

/* ── Parsing ───────────────────────────────────────────────────────────── */

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
};
const WORD_RE = Object.keys(WORD_NUMBERS).join("|");

const TYPES: { key: string; label: string; plural: string; ask: RegExp; test: (t: string) => boolean }[] = [
  { key: "penthouse", label: "penthouse", plural: "penthouses", ask: /\bpenthouses?\b/, test: (t) => /penthouse/.test(t) },
  { key: "townhouse", label: "townhouse", plural: "townhouses", ask: /\btown ?houses?\b/, test: (t) => /town ?house/.test(t) },
  { key: "duplex", label: "duplex", plural: "duplexes", ask: /\bduplex(es)?\b/, test: (t) => /duplex/.test(t) },
  { key: "apartment", label: "apartment", plural: "apartments", ask: /\b(apartments?|flats?|condos?)\b/, test: (t) => /apartment/.test(t) },
  { key: "plot", label: "plot", plural: "plots", ask: /\b(plots?|land|building plot)\b/, test: (t) => /plot/.test(t) },
  { key: "villa", label: "villa", plural: "villas", ask: /\b(villas?|mansions?)\b/, test: (t) => /villa|mansion/.test(t) },
  { key: "house", label: "house", plural: "houses", ask: /\bhouses?\b/, test: (t) => /villa|house/.test(t) },
];

const FEATURES: { key: string; label: string; ask: RegExp; test: RegExp }[] = [
  { key: "sea", label: "sea views", ask: /\b(sea|ocean|mediterranean|panoramic|coastal)\s*views?\b|\bviews? (of|over) the (sea|mediterranean)\b|\bsea-?view/, test: /sea view|sea-view|views of the sea|views over the|panoramic|mediterranean|ocean/ },
  { key: "pool", label: "a pool", ask: /\b(pool|swimming)\b/, test: /pool/ },
  { key: "garden", label: "a garden", ask: /\bgardens?\b/, test: /garden/ },
  { key: "gated", label: "a gated setting", ask: /\b(gated|security|secure)\b/, test: /gated|security/ },
  { key: "beach", label: "beach proximity", ask: /\b(beach(front|side)?|frontline|first line)\b/, test: /beach|frontline|front line/ },
  { key: "golf", label: "golf", ask: /\bgolf\b/, test: /golf/ },
  { key: "modern", label: "contemporary architecture", ask: /\b(modern|contemporary|new ?build|newly built|minimalist?)\b/, test: /modern|contemporary|new build|newly|minimal/ },
  { key: "gym", label: "a gym", ask: /\bgym\b/, test: /gym|fitness/ },
  { key: "garage", label: "a garage", ask: /\b(garage|parking)\b/, test: /garage|parking/ },
  { key: "terrace", label: "terraces", ask: /\bterraces?\b/, test: /terrace/ },
];

function prepare(input: string): string {
  return normalize(input)
    .replace(/€/g, " eur ")
    .replace(/(\d)[.,](?=\d{3}\b)/g, "$1")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, " ");
}

interface Amount {
  value: number;
  index: number;
  end: number;
}

function findAmounts(n: string): Amount[] {
  const re = new RegExp(
    `(?:(\\d+(?:\\.\\d+)?)|\\b(${WORD_RE})|\\b(half a|a))(\\s+and\\s+a\\s+half)?\\s*(million|millions|mill|mio|mn|m(?![²2a-z])|k\\b|thousand|grand)|\\b(\\d{5,})\\b`,
    "g"
  );
  const out: Amount[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(n))) {
    if (m[6]) {
      out.push({ value: Number(m[6]), index: m.index, end: m.index + m[0].length });
      continue;
    }
    let base = m[1] ? Number(m[1]) : m[2] ? WORD_NUMBERS[m[2]] : m[3] === "half a" ? 0.5 : 1;
    if (m[4]) base += 0.5;
    const unit = m[5];
    const mult = /^(k|thousand|grand)/.test(unit) ? 1_000 : 1_000_000;
    out.push({ value: base * mult, index: m.index, end: m.index + m[0].length });
  }
  return out.filter((a) => a.value >= 50_000 && a.value <= 200_000_000);
}

function parsePrice(n: string): Pick<SearchSlots, "minPrice" | "maxPrice" | "target" | "noBudget"> | null {
  if (/\b(no (fixed )?budget|any (budget|price)|budget is flexible|flexible budget|price is no object|not sure)\b/.test(n)) {
    return { noBudget: true };
  }
  const amounts = findAmounts(n);
  if (amounts.length === 0) return null;
  if (amounts.length >= 2) {
    const between = n.slice(amounts[0].end, amounts[1].index).replace(/\b(eur|euros?)\b/g, "");
    if (/^\s*(and|to|-|–|or)\s*$/.test(between)) {
      const [a, b] = [amounts[0].value, amounts[1].value].sort((x, y) => x - y);
      return { minPrice: a, maxPrice: b };
    }
  }
  const a = amounts[0];
  const before = n.slice(Math.max(0, a.index - 28), a.index);
  if (/(under|below|less than|up to|upto|max(imum)?|no more than|not more than|within|cap of|at most)\s*(eur\s*)?$/.test(before)) {
    return { maxPrice: a.value };
  }
  if (/(over|above|more than|at least|from|starting at|minimum|min|upwards of|in excess of)\s*(eur\s*)?$/.test(before)) {
    return { minPrice: a.value };
  }
  return { target: a.value };
}

function parseBeds(n: string): number | undefined {
  const m = new RegExp(`\\b(\\d{1,2}|${WORD_RE})\\s*\\+?\\s*(?:-\\s*)?(bed|beds|bedroom|bedrooms|bedroomed|br|bdr)\\b`).exec(n);
  if (!m) return undefined;
  return /^\d+$/.test(m[1]) ? Number(m[1]) : WORD_NUMBERS[m[1]];
}

interface AreaKey {
  key: string;
  query: string;
  label: string;
}

function areaKeys(listings: ListingSummary[]): AreaKey[] {
  const keys = new Map<string, AreaKey>();
  for (const opt of buildLocationOptions(listings)) {
    const variants = [opt.label, opt.label.split(",")[0]];
    for (const v of variants) {
      const key = normalize(v).replace(/^(el|la|los|las)\s+/, "").replace(/\s*-\s*/g, " ").trim();
      if (key.length < 4 || key === "marbella") continue;
      if (!keys.has(key)) keys.set(key, { key, query: v.trim(), label: v.trim() });
    }
  }
  // Common shorthand used by visitors
  const aliases: [string, string][] = [
    ["golden mile", "Golden Mile"],
    ["banus", "Puerto Banus"],
    ["east marbella", "Marbella East"],
    ["zagaleta", "La Zagaleta"],
  ];
  for (const [key, query] of aliases) if (!keys.has(key)) keys.set(key, { key, query, label: query });
  return [...keys.values()].sort((a, b) => b.key.length - a.key.length);
}

function parseArea(n: string, listings: ListingSummary[]): AreaKey | undefined {
  const spaced = n.replace(/\s*-\s*/g, " ");
  return areaKeys(listings).find((k) => new RegExp(`\\b${k.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(spaced));
}

/* ── Matching ──────────────────────────────────────────────────────────── */

function haystack(l: ListingSummary): string {
  return normalize(`${l.name} ${l.short_description} ${(l.features ?? []).join(" ")} ${l.property_type ?? ""} ${l.location}`);
}

function priceBounds(s: SearchSlots, widen = 1): { min?: number; max?: number } {
  if (s.target) return { min: s.target * (1 - 0.25 * widen), max: s.target * (1 + 0.25 * widen) };
  return {
    min: s.minPrice ? s.minPrice / widen : undefined,
    max: s.maxPrice ? s.maxPrice * widen : undefined,
  };
}

function hardFilter(listings: ListingSummary[], s: SearchSlots, opts: { widen?: number; ignoreArea?: boolean; ignoreBeds?: boolean } = {}) {
  const type = TYPES.find((t) => t.key === s.typeKey);
  const { min, max } = priceBounds(s, opts.widen ?? 1);
  const priced = !!(min || max);
  const areaN = s.area ? normalize(s.area) : "";
  return listings.filter((l) => {
    if (type && !type.test(normalize(l.property_type))) return false;
    if (areaN && !opts.ignoreArea && !normalize(l.location).includes(areaN)) return false;
    if (s.beds && !opts.ignoreBeds && (l.bedrooms == null || l.bedrooms < s.beds)) return false;
    if (priced) {
      if (l.price == null) return false;
      if (min && l.price < min) return false;
      if (max && l.price > max) return false;
    }
    return true;
  });
}

function rank(list: ListingSummary[], s: SearchSlots): ListingSummary[] {
  const feats = FEATURES.filter((f) => s.features.includes(f.key));
  return [...list]
    .map((l) => {
      const hay = haystack(l);
      let score = feats.reduce((acc, f) => acc + (f.test.test(hay) ? 2 : 0), 0);
      if (s.target && l.price) score += 1.5 * Math.max(0, 1 - Math.abs(l.price - s.target) / s.target);
      return { l, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.l);
}

function describe(s: SearchSlots): string {
  const type = TYPES.find((t) => t.key === s.typeKey);
  const parts: string[] = [];
  parts.push(type ? type.plural : "residences");
  if (s.beds) parts.push(`with ${s.beds}+ bedrooms`);
  if (s.area) parts.push(`in ${s.area}`);
  if (s.target) parts.push(`around ${compactEuro(s.target)}`);
  else if (s.minPrice && s.maxPrice) parts.push(`between ${compactEuro(s.minPrice)} and ${compactEuro(s.maxPrice)}`);
  else if (s.maxPrice) parts.push(`up to ${compactEuro(s.maxPrice)}`);
  else if (s.minPrice) parts.push(`from ${compactEuro(s.minPrice)}`);
  return parts.join(" ");
}

function collectionLink(s: SearchSlots): string {
  const type = TYPES.find((t) => t.key === s.typeKey);
  const { min, max } = priceBounds(s);
  return `/properties${filtersToQuery({
    q: type ? type.label : "",
    location: s.area ?? "",
    minPrice: min ? String(Math.round(min)) : "",
    maxPrice: max ? String(Math.round(max)) : "",
    bedrooms: s.beds ? String(s.beds) : "",
  })}`;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export function openingReply(): ConciergeReply {
  return {
    text: `${greeting()}. I'm the Real Property Estate concierge. Tell me what you have in mind — an area, a type of home, a budget — and I'll show you residences from our current collection.`,
    suggestions: [
      "A modern villa with sea views",
      "Penthouses on the Golden Mile",
      "Homes under €3 million",
      "Arrange a private viewing",
    ],
  };
}

/* ── Engine ────────────────────────────────────────────────────────────── */

class LocalConciergeEngine implements ConciergeEngine {
  readonly mode = "preview" as const;

  async respond(input: string, prev: ConversationState, listings: ListingSummary[]) {
    const n = prepare(input);
    const state: ConversationState = { ...prev, slots: { ...prev.slots, features: [...prev.slots.features] } };
    const reply = (r: ConciergeReply) => ({ reply: r, state });

    if (!n) return reply({ text: "I'm listening — what kind of residence are you looking for?" });

    if (/\b(start over|start again|reset|new search|clear (everything|search))\b/.test(n)) {
      return { reply: { text: "Of course — let's begin again. What would you like to explore?", suggestions: openingReply().suggestions }, state: initialConversation() };
    }

    // What did this message tell us?
    const type = TYPES.find((t) => t.ask.test(n));
    const price = parsePrice(n);
    const beds = parseBeds(n);
    const area = parseArea(n, listings);
    const features = FEATURES.filter((f) => f.ask.test(n)).map((f) => f.key);
    const hasSearchSignal = !!(type || price || beds || area || features.length);

    const wantsMore = /\b(more like (these|this)|show (me )?more|other options|anything else)\b/.test(n);
    if (wantsMore && state.lastResults.length > 0 && state.lastResults.length <= state.shown) {
      return reply({
        text: "That's everything that matches your brief in our current collection. I can widen the search, or connect you with our team for a private conversation.",
        actions: [{ label: "WhatsApp our team", href: WHATSAPP_GENERAL_URL, external: true }],
        suggestions: ["Start a new search", "Arrange a private viewing"],
      });
    }
    if (wantsMore && state.lastResults.length > state.shown) {
      const next = state.lastResults.slice(state.shown, state.shown + 4);
      state.shown += next.length;
      return reply({
        text: "Here are a few more that fit your brief.",
        matches: next,
        total: state.lastResults.length,
        actions: [{ label: "View them all in the collection", href: collectionLink(state.effective ?? state.slots) }],
      });
    }

    if (!hasSearchSignal) {
      if (/^(hi|hello|hey|good (morning|afternoon|evening)|hola|buenos dias|buongiorno|ciao)\b/.test(n)) {
        return reply(openingReply());
      }
      if (/\b(thank|thanks|gracias|grazie|perfect|wonderful|lovely)\b/.test(n)) {
        return reply({
          text: "It's my pleasure. Whenever you're ready, I can arrange a private viewing or keep exploring with you.",
          suggestions: ["Arrange a private viewing", "Start a new search"],
        });
      }
    }

    if (/\b(view(ing)?|visit|see (it|them|the (house|villa|property))|appointment|agent|speak|talk|call|contact|whatsapp|phone|email|human|person|someone|advis(e|or))\b/.test(n) && !hasSearchSignal) {
      const focus = state.focus;
      return reply({
        text: focus
          ? `I'd be delighted to arrange a private viewing of ${focus.name}. Message our team directly on WhatsApp, or leave a private enquiry and we'll respond personally.`
          : "I'd be delighted to connect you with our team. Message us directly on WhatsApp, or leave a private enquiry and we'll respond personally.",
        actions: [
          { label: "WhatsApp our team", href: focus ? buildPropertyWhatsAppUrl(focus.name) : WHATSAPP_GENERAL_URL, external: true },
          { label: "Make a private enquiry", href: focus ? `/properties/${focus.slug}#enquiry` : "/contact" },
        ],
      });
    }

    if (/\b(sell|selling|valuation|value (of )?my|list my)\b/.test(n)) {
      return reply({
        text: "We'd be glad to discuss selling your property. Our team works alongside architects, lawyers and notaries to support every stage — leave a few details and we'll be in touch.",
        actions: [{ label: "Contact us about selling", href: "/contact" }],
      });
    }

    if (/\b(rent(al|als|ing|s)?|leas(e|ing)|holiday lets?)\b/.test(n)) {
      const rentals = listings.filter((l) => /rent/i.test(l.listing_type ?? ""));
      if (rentals.length === 0) {
        return reply({
          text: "Our current public collection is offered for sale. For rentals, our team will be happy to advise you personally.",
          actions: [{ label: "Ask about rentals", href: "/contact" }],
        });
      }
    }

    if (!hasSearchSignal && /\b(who are you|about (you|the company|real property)|founder|massimo|your team|company)\b/.test(n)) {
      return reply({
        text: "Real Property Estate was founded by Massimo Michelino. For more than two decades, he and a trusted team have connected discerning clients with some of the finest opportunities on the Costa del Sol — alongside architects, engineers, lawyers and notaries.",
        actions: [{ label: "Discover our story", href: "/about" }],
      });
    }

    if (!hasSearchSignal && /\b(why marbella|about marbella|marbella like|lifestyle|climate|weather|invest(ment|ing)?)\b/.test(n)) {
      return reply({
        text: "Marbella is far more than a destination — it is a way of life: a year-round Mediterranean climate, world-class infrastructure, renowned golf courses, luxury marinas, fine dining and a breathtaking coastline. With consistent demand and limited supply in prime locations, it remains one of Europe's most attractive real estate markets.",
        suggestions: ["Show me villas in Nueva Andalucía", "Penthouses on the Golden Mile"],
      });
    }

    if (hasSearchSignal || (state.askedPrice && price)) {
      if (type) {
        state.slots.typeKey = type.key;
        state.slots.typeLabel = type.label;
      }
      if (area) state.slots.area = area.query;
      if (beds) state.slots.beds = beds;
      if (price) {
        state.slots.minPrice = price.minPrice;
        state.slots.maxPrice = price.maxPrice;
        state.slots.target = price.target;
        state.slots.noBudget = price.noBudget;
      }
      for (const f of features) if (!state.slots.features.includes(f)) state.slots.features.push(f);

      const s = state.slots;
      const hasPrice = !!(s.target || s.minPrice || s.maxPrice || s.noBudget);
      if (!hasPrice && !state.askedPrice) {
        state.askedPrice = true;
        return reply({
          text: "Of course. May I ask what price range you have in mind?",
          suggestions: ["Around €2 million", "Up to €5 million", "€5M to €10M", "No fixed budget"],
        });
      }
      return reply(this.search(listings, state));
    }

    return reply({
      text: "I can help you explore residences by area, type, budget or bedrooms — or connect you with our team for a private viewing.",
      suggestions: openingReply().suggestions,
    });
  }

  private search(listings: ListingSummary[], state: ConversationState): ConciergeReply {
    const s = state.slots;
    const widened = (by: number): SearchSlots => {
      const b = priceBounds(s, by);
      return s.target || s.minPrice || s.maxPrice
        ? { ...s, target: undefined, minPrice: b.min ? Math.round(b.min) : undefined, maxPrice: b.max ? Math.round(b.max) : undefined }
        : s;
    };
    // Progressive relaxation; `effective` is what the results actually satisfy.
    const attempts: { slots: SearchSlots; note: string }[] = [
      { slots: s, note: "" },
      { slots: widened(1.4), note: "Nothing matched exactly, so I widened the budget slightly." },
    ];
    if (s.beds) attempts.push({ slots: { ...widened(1.4), beds: undefined }, note: "Nothing matched exactly, so I relaxed the bedroom count." });
    if (s.area) {
      attempts.push({ slots: { ...s, area: undefined }, note: `I couldn't find a match in ${s.area}, so here are the closest alternatives elsewhere.` });
      attempts.push({ slots: { ...widened(1.4), area: undefined, beds: undefined }, note: `I couldn't find a match in ${s.area}, so I broadened the search.` });
    }
    let pool: ListingSummary[] = [];
    let note = "";
    let effective = s;
    for (const a of attempts) {
      pool = hardFilter(listings, a.slots);
      if (pool.length) {
        note = a.note;
        effective = a.slots;
        break;
      }
    }

    if (pool.length === 0) {
      state.lastResults = [];
      state.shown = 0;
      return {
        text: `I couldn't find ${describe(s)} in our current public collection. Our team will be happy to search on your behalf.`,
        actions: [
          { label: "WhatsApp our team", href: WHATSAPP_GENERAL_URL, external: true },
          { label: "Make a private enquiry", href: "/contact" },
        ],
        suggestions: ["Start a new search"],
      };
    }

    const ranked = rank(pool, effective);
    const top = ranked.slice(0, 4);
    state.lastResults = ranked;
    state.shown = top.length;
    state.effective = effective;
    state.focus = top[0];
    const featureText = s.features.length
      ? ` I've prioritised ${FEATURES.filter((f) => s.features.includes(f.key))
          .map((f) => f.label)
          .join(" and ")}.`
      : "";
    const count = `${pool.length} ${pool.length === 1 ? "residence matches" : "residences match"}`;
    return {
      text: `Let me help you explore suitable residences. ${note ? `${note} ` : ""}${count} — ${describe(effective)}.${featureText}`,
      matches: top,
      total: pool.length,
      actions: [
        { label: pool.length > top.length ? `View all ${pool.length} in the collection` : "Open in the collection", href: collectionLink(effective) },
        { label: `Ask about ${top[0].name}`, href: buildPropertyWhatsAppUrl(top[0].name), external: true },
      ],
      suggestions: pool.length > top.length ? ["Show me more like these", "Arrange a private viewing", "Start a new search"] : ["Arrange a private viewing", "Start a new search"],
    };
  }
}

export function formatMatchPrice(l: ListingSummary) {
  return displayPrice(l.price, l.price_label);
}
