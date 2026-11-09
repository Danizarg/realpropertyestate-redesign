import type { Metadata } from "next";
import "../legacy-fonts.css";

export const metadata: Metadata = {
  title: "Owner Access — Real Property Estate",
  robots: { index: false, follow: false },
};

/** Owner login keeps the dashboard's original typography. */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }} className="flex-1 flex flex-col">
      {children}
    </div>
  );
}
