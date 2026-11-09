import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PropertyHero from "@/components/properties/PropertyHero";
import PropertyDetailsGrid from "@/components/properties/PropertyDetailsGrid";
import CinematicGallery from "@/components/properties/CinematicGallery";
import SocialVideoLinks from "@/components/properties/SocialVideoLinks";
import PropertyCard from "@/components/properties/PropertyCard";
import EnquiryDock from "@/components/properties/EnquiryDock";
import ShareButton from "@/components/properties/ShareButton";
import ContactForm from "@/components/forms/ContactForm";
import TransitionLink from "@/components/motion/TransitionLink";
import { Reveal, SplitReveal } from "@/components/motion/Reveal";
import { Arrow } from "@/components/motion/Magnetic";
import { WhatsAppIcon } from "@/components/site/SocialIcons";
import { buildPropertyWhatsAppUrl, WHATSAPP_DISPLAY_PHONE } from "@/lib/whatsapp";
import { getProperty, getRelatedProperties } from "@/lib/properties";
import { displayPrice, matchesLocation, pickCover, toParagraphs } from "@/lib/property-utils";
import { CONTACT_EMAIL } from "@/components/site/nav-links";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) return { title: "Property Not Found" };
  const cover = pickCover(property.property_images);
  return {
    title: `${property.name} — Real Property Estate`,
    description: property.short_description,
    openGraph: {
      title: `${property.name} — Real Property Estate`,
      description: property.short_description,
      images: cover ? [{ url: cover.url }] : undefined,
    },
  };
}

/** The broad area of a location ("El Herrojo, Benahavis" → "Benahavis"). */
function areaOf(location: string): string {
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? location;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const related = await getRelatedProperties(property);
  const images = property.property_images ?? [];
  const cover = pickCover(images);
  const ordered = cover ? [cover, ...images.filter((i) => i.id !== cover.id)] : images;
  const price = displayPrice(property.price, property.price_label);
  const eyebrow = [property.location, property.property_type, property.listing_type].filter(Boolean).join(" · ");
  const paragraphs = toParagraphs(property.long_description);
  const lead = property.short_description?.trim();
  // Avoid repeating the lead when the description opens with the same sentence.
  const body =
    paragraphs.length && lead && paragraphs[0].startsWith(lead)
      ? [paragraphs[0].slice(lead.length).trim(), ...paragraphs.slice(1)].filter(Boolean)
      : paragraphs;
  const whatsapp = buildPropertyWhatsAppUrl(property.name);
  const area = areaOf(property.location);
  const sameArea = related.filter((r) => matchesLocation(r.location, area)).length;

  return (
    <>
      <PropertyHero
        name={property.name}
        eyebrow={eyebrow}
        price={price}
        status={property.status}
        cover={cover}
        imageCount={images.length}
      />

      {/* Overview */}
      <section data-nav-theme="light" className="bg-soft-white text-ink pt-24 md:pt-36 pb-20 md:pb-28">
        <div className="shell grid grid-cols-1 lg:grid-cols-12 gap-y-14 gap-x-12">
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-32 space-y-8">
              <p className="micro text-bronze flex items-center gap-4">
                <span className="block w-10 h-px bg-current" />
                Overview
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <ShareButton title={property.name} className="micro-sm link-line" label="Share residence" />
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="micro-sm link-line">
                  <WhatsAppIcon className="w-4 h-4" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
          <div className="lg:col-span-9">
            {lead && (
              <SplitReveal as="p" className="font-serif font-light text-[clamp(1.75rem,3.2vw,3.1rem)] leading-[1.18] max-w-[30ch]">
                {lead}
              </SplitReveal>
            )}
            <div className="mt-16">
              <PropertyDetailsGrid property={property} />
            </div>
            {body.length > 0 && (
              <Reveal className="mt-16 md:columns-2 gap-12 body-copy text-ink/80 [&>p]:mb-6 [&>p]:break-inside-avoid-column">
                {body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {ordered.length > 1 && <CinematicGallery images={ordered} name={property.name} />}

      {/* Features & location */}
      <section data-nav-theme="light" className="bg-ivory text-ink py-24 md:py-32">
        <div className="shell grid grid-cols-1 lg:grid-cols-12 gap-y-16 gap-x-12">
          {property.features && property.features.length > 0 && (
            <div className="lg:col-span-7">
              <p className="micro text-bronze mb-10">Features &amp; amenities</p>
              <Reveal as="ul" stagger={0.04} className="grid grid-cols-1 sm:grid-cols-2 border-t border-ink/15">
                {property.features.map((feat, i) => (
                  <li key={feat} className="flex items-baseline gap-5 border-b border-ink/10 py-5 pr-6">
                    <span className="micro-sm text-ink-soft tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[16px]">{feat}</span>
                  </li>
                ))}
              </Reveal>
            </div>
          )}
          <div className={property.features?.length ? "lg:col-span-4 lg:col-start-9" : "lg:col-span-6"}>
            <p className="micro text-bronze mb-10">Location</p>
            <p className="display-m">{property.location}</p>
            {sameArea > 0 && (
              <TransitionLink href={`/properties?location=${encodeURIComponent(area)}`} className="mt-8 link-line micro-sm">
                More residences in {area} <Arrow className="w-3.5 h-3.5" />
              </TransitionLink>
            )}
            {(property.instagram_url || property.tiktok_url) && (
              <div className="mt-14">
                <p className="micro text-bronze mb-5">Property films</p>
                <SocialVideoLinks instagramUrl={property.instagram_url} tiktokUrl={property.tiktok_url} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section id="enquiry" data-nav-theme="dark" className="relative bg-obsidian text-ivory py-24 md:py-36 overflow-hidden">
        <div className="grain absolute inset-0 pointer-events-none" />
        <div className="relative shell grid grid-cols-1 lg:grid-cols-12 gap-y-16 gap-x-12">
          <div className="lg:col-span-5">
            <p className="micro text-champagne mb-8 flex items-center gap-4">
              <span className="block w-10 h-px bg-current" />
              Private viewing
            </p>
            <SplitReveal as="h2" className="display-l max-w-[11ch]">
              Arrange a private viewing.
            </SplitReveal>
            <p className="mt-8 body-copy text-ivory/70 max-w-md">
              Share a few details and we will respond personally about {property.name} — or message us directly.
            </p>
            <div className="mt-10 flex flex-col gap-4">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light self-start">
                <WhatsAppIcon className="w-4 h-4" /> Request private viewing
              </a>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="link-line micro-sm self-start text-ivory/80">
                Request brochure via WhatsApp <Arrow direction="up-right" className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="mt-14 pt-8 border-t border-ivory/10 grid grid-cols-2 gap-6 text-[14px]">
              <div>
                <p className="micro-sm text-stone mb-2">WhatsApp</p>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-champagne transition-colors">
                  {WHATSAPP_DISPLAY_PHONE}
                </a>
              </div>
              <div>
                <p className="micro-sm text-stone mb-2">Email</p>
                <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(property.name)}`} className="hover:text-champagne transition-colors break-all">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <ContactForm propertyId={property.id} propertyName={property.name} defaultInterest="private_viewing" tone="dark" />
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section data-nav-theme="light" className="bg-soft-white text-ink py-24 md:py-32">
          <div className="shell">
            <div className="flex items-end justify-between gap-6 mb-14">
              <SplitReveal as="h2" className="display-m">
                You may also consider
              </SplitReveal>
              <TransitionLink href="/properties" className="hidden md:inline-flex link-line micro-sm">
                All residences <Arrow className="w-3.5 h-3.5" />
              </TransitionLink>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
              {related.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <EnquiryDock name={property.name} price={price} coverUrl={cover?.url ?? null} whatsappUrl={whatsapp} />
    </>
  );
}
