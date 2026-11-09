import Image from "next/image";
import TransitionLink from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/motion/Magnetic";
import { displayPrice, specItems } from "@/lib/property-utils";
import type { ListingSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: ListingSummary;
  index?: number;
  /** CSS aspect-ratio for the image frame. */
  aspect?: string;
  sizes?: string;
  priority?: boolean;
  tone?: "light" | "dark";
  className?: string;
  titleClassName?: string;
}

/**
 * Image-first residence card. Hover (fine pointers) deepens the image and
 * reveals a masked detail panel; every key fact is also printed below the
 * image so touch visitors never miss anything.
 */
export default function PropertyCard({
  property,
  index,
  aspect = "4 / 5",
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
  priority,
  tone = "light",
  className,
  titleClassName,
}: PropertyCardProps) {
  const specs = specItems(property);
  const price = displayPrice(property.price, property.price_label);
  const muted = tone === "dark" ? "text-stone" : "text-ink-soft";
  const showStatus = property.status && property.status !== "Available";

  return (
    <TransitionLink
      href={`/properties/${property.slug}`}
      sharedImage
      transitionLabel={property.name}
      data-cursor="View"
      className={cn("group block focus-visible:outline-offset-8", className)}
    >
      <div
        data-shared-image
        className={cn("relative overflow-hidden", tone === "dark" ? "bg-obsidian-3" : "skeleton")}
        style={{ aspectRatio: aspect }}
      >
        {property.cover ? (
          <div className="absolute inset-0 transition-transform duration-[1.6s] ease-[var(--ease-out)] group-hover:scale-[1.045]">
            <Image
              src={property.cover.url}
              alt={property.name}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("micro-sm", muted)}>Images on request</span>
          </div>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-obsidian/0 to-obsidian/0 opacity-40 transition-opacity duration-700 group-hover:opacity-100"
        />

        {showStatus && (
          <span className="absolute top-4 left-4 bg-soft-white/90 text-ink micro-sm px-3 py-1.5 backdrop-blur-sm">
            {property.status}
          </span>
        )}
        {index !== undefined && (
          <span className="absolute top-4 right-4 micro-sm text-ivory/90 mix-blend-difference">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}

        {/* Masked hover reveal (desktop) */}
        <div className="absolute inset-x-0 bottom-0 overflow-hidden hidden [@media(hover:hover)]:block">
          <div className="translate-y-full group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-transform duration-700 ease-[var(--ease-out)] p-5 md:p-6 text-ivory">
            {property.short_description && (
              <p className="text-[13.5px] leading-relaxed text-ivory/85 line-clamp-2 max-w-md">{property.short_description}</p>
            )}
            <span className="mt-4 inline-flex items-center gap-3 micro-sm">
              View residence <Arrow className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      <div className="pt-5 flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className={cn("micro-sm truncate", muted)}>
            {property.location}
            {property.property_type ? ` · ${property.property_type}` : ""}
          </p>
          <h3
            className={cn(
              "mt-2 font-serif font-normal leading-[1.08] text-[clamp(1.45rem,2vw,1.9rem)] transition-colors",
              titleClassName
            )}
          >
            {property.name}
          </h3>
        </div>
        <p className="font-serif text-[1.15rem] md:text-[1.25rem] whitespace-nowrap pt-[1.35rem]">{price}</p>
      </div>
      {specs.length > 0 && <p className={cn("mt-2 text-[13px] tabular-nums", muted)}>{specs.join("  ·  ")}</p>}
    </TransitionLink>
  );
}
