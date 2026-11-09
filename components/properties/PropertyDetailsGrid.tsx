import { Reveal } from "@/components/motion/Reveal";
import type { Property } from "@/lib/types";

interface Fact {
  label: string;
  value: string;
  large?: boolean;
}

/** Key facts — only fields that exist on the listing are shown. */
export default function PropertyDetailsGrid({ property }: { property: Property }) {
  const facts: Fact[] = [];
  const push = (label: string, value: string | number | null | undefined, large = false) => {
    if (value == null || value === "") return;
    facts.push({ label, value: String(value), large });
  };
  push("Bedrooms", property.bedrooms, true);
  push("Bathrooms", property.bathrooms, true);
  push("Internal area", property.internal_area, true);
  push("Plot size", property.plot_size, true);
  push("Outdoor space", property.outdoor_space);
  push("Property type", property.property_type);
  push("Listing", property.listing_type);
  push("Status", property.status);
  push("Pets", property.pets);

  if (facts.length === 0) return null;

  return (
    <Reveal stagger={0.06} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 border-t border-ink/15">
      {facts.map((f) => (
        <div key={f.label} className="border-b border-ink/10 py-7 pr-6">
          <p className="micro-sm text-ink-soft">{f.label}</p>
          <p className={f.large ? "mt-3 font-serif font-light text-[clamp(2rem,3.4vw,3.2rem)] leading-none" : "mt-3 text-[16px] leading-snug"}>
            {f.value}
          </p>
        </div>
      ))}
    </Reveal>
  );
}
