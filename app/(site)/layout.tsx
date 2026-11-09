import SmoothScroll from "@/components/motion/SmoothScroll";
import TransitionProvider from "@/components/motion/TransitionProvider";
import CursorFollower from "@/components/motion/CursorFollower";
import SoundProvider from "@/components/experience/SoundProvider";
import ConciergeProvider from "@/components/concierge/ConciergeProvider";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

/** Public site shell: shared motion, sound, navigation and concierge. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SoundProvider>
      <TransitionProvider>
        <ConciergeProvider>
          <SmoothScroll />
          <SiteHeader />
          <div data-page-root className="flex-1 flex flex-col">
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
          <CursorFollower />
        </ConciergeProvider>
      </TransitionProvider>
    </SoundProvider>
  );
}
