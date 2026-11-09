import TransitionLink from "@/components/motion/TransitionLink";
import { Arrow } from "@/components/motion/Magnetic";

export default function NotFound() {
  return (
    <section data-nav-theme="dark" className="relative min-h-[100svh] bg-obsidian text-ivory flex items-center overflow-hidden">
      <div className="grain absolute inset-0 pointer-events-none" />
      <div className="relative shell py-40">
        <p className="micro text-champagne">404</p>
        <h1 className="display-xl mt-8 max-w-[12ch]">This address is not in our collection.</h1>
        <p className="mt-8 body-copy text-ivory/70 max-w-md">
          The residence may have been sold or withdrawn, or the link may be incomplete.
        </p>
        <div className="mt-12 flex flex-wrap gap-3">
          <TransitionLink href="/properties" className="btn btn-light">
            View current residences <Arrow className="w-4 h-4" />
          </TransitionLink>
          <TransitionLink href="/" className="btn btn-ghost-light">
            Return home
          </TransitionLink>
        </div>
      </div>
    </section>
  );
}
