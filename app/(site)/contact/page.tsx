import Image from "next/image";
import type { Metadata } from "next";
import ContactForm from "@/components/forms/ContactForm";
import { Reveal, SplitReveal } from "@/components/motion/Reveal";
import { Arrow } from "@/components/motion/Magnetic";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/site/SocialIcons";
import ConciergeButton from "@/components/concierge/ConciergeButton";
import { WHATSAPP_DISPLAY_PHONE, WHATSAPP_GENERAL_URL } from "@/lib/whatsapp";
import { INSTAGRAM_URL, TIKTOK_URL } from "@/lib/social";
import { IMAGERY, unsplash } from "@/lib/media-library";
import { CONTACT_EMAIL } from "@/components/site/nav-links";

export const metadata: Metadata = {
  title: "Contact — Real Property Estate",
  description: "Get in touch with Real Property Estate in Marbella, Spain.",
};

export default function ContactPage() {
  return (
    <>
      <section data-nav-theme="dark" className="relative bg-obsidian text-ivory overflow-hidden">
        <div className="absolute inset-0 lg:left-auto lg:w-[42%]">
          <Image
            src={unsplash(IMAGERY.hazyMarina.id, 1800)}
            alt={IMAGERY.hazyMarina.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover opacity-35 lg:opacity-100"
            style={{ objectPosition: IMAGERY.hazyMarina.position }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/60 to-transparent lg:via-obsidian/10" />
        </div>
        <div className="relative shell pt-[calc(var(--nav-h)+5rem)] md:pt-[calc(var(--nav-h)+8rem)] pb-20 md:pb-28">
          <div className="max-w-3xl">
            <Reveal as="p" className="micro text-champagne mb-8 flex items-center gap-4">
              <span className="block w-10 h-px bg-current" />
              Contact
            </Reveal>
            <SplitReveal as="h1" split="words" trigger="mount" className="display-xl max-w-[11ch]">
              A private conversation.
            </SplitReveal>
            <Reveal className="mt-10 max-w-lg">
              <p className="body-copy text-ivory/75">
                Whether you are searching for a primary residence, a second home, or a private investment — we are here to
                guide you with complete discretion.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section data-nav-theme="light" className="bg-soft-white text-ink py-20 md:py-32">
        <div className="shell grid grid-cols-1 lg:grid-cols-12 gap-y-16 gap-x-12">
          {/* Direct channels */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28 space-y-10">
              <Reveal stagger={0.07} className="border-t border-ink/15">
                <a
                  href={WHATSAPP_GENERAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-6 border-b border-ink/10 py-6"
                >
                  <span>
                    <span className="micro-sm text-ink-soft block">WhatsApp</span>
                    <span className="mt-2 block font-serif text-[1.6rem] leading-tight">{WHATSAPP_DISPLAY_PHONE}</span>
                  </span>
                  <WhatsAppIcon className="w-5 h-5 mt-1 transition-transform duration-500 group-hover:scale-110" />
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`} className="group flex items-start justify-between gap-6 border-b border-ink/10 py-6">
                  <span className="min-w-0">
                    <span className="micro-sm text-ink-soft block">Email</span>
                    <span className="mt-2 block font-serif text-[1.35rem] leading-tight break-all">{CONTACT_EMAIL}</span>
                  </span>
                  <Arrow direction="up-right" className="w-5 h-5 mt-1 shrink-0 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
                <div className="border-b border-ink/10 py-6">
                  <span className="micro-sm text-ink-soft block">Location</span>
                  <span className="mt-2 block font-serif text-[1.35rem] leading-tight">
                    Marbella, Spain
                    <br />
                    Costa del Sol
                  </span>
                </div>
                <div className="border-b border-ink/10 py-6">
                  <span className="micro-sm text-ink-soft block mb-4">Social</span>
                  <div className="flex gap-6 text-[14px]">
                    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 link-line">
                      <InstagramIcon className="w-4 h-4" /> Instagram
                    </a>
                    <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 link-line">
                      <TikTokIcon className="w-4 h-4" /> TikTok
                    </a>
                  </div>
                </div>
              </Reveal>
              <Reveal className="bg-obsidian text-ivory p-7">
                <p className="micro-sm text-champagne">Prefer to talk it through?</p>
                <p className="mt-3 font-serif text-[1.35rem] leading-snug">
                  Our concierge can suggest residences from the current collection in seconds.
                </p>
                <ConciergeButton className="mt-6 link-line micro-sm">
                  Open the concierge <Arrow className="w-3.5 h-3.5" />
                </ConciergeButton>
              </Reveal>
            </div>
          </aside>

          {/* Form */}
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="micro text-bronze mb-6">Private enquiry</p>
            <SplitReveal as="h2" className="display-m max-w-[18ch]">
              Tell us what you are looking for.
            </SplitReveal>
            <p className="mt-6 body-copy text-ink-soft max-w-lg">
              A few details are enough — we will be in touch shortly.
            </p>
            <div className="mt-12">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
