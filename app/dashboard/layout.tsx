import "../legacy-fonts.css";

/**
 * The owner dashboard keeps its original typography (Inter + Cormorant by
 * family name), independent of the public site's font pipeline.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }} className="flex-1 flex flex-col">
      {children}
    </div>
  );
}
