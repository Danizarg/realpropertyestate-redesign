"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#F5F4F1]">
      {/* Dashboard header */}
      <header
        style={{ borderBottom: "1px solid #E6E3DE", background: "white" }}
        className="sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-display text-sm tracking-[0.12em] uppercase text-[#111111]"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 500 }}
            >
              Real Property Estate
            </Link>
            <span
              className="text-[11px] tracking-[0.08em] uppercase px-2 py-0.5"
              style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif", border: "1px solid #E6E3DE", borderRadius: 2 }}
            >
              Owner
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-[13px] transition-colors"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                color: pathname === "/dashboard" ? "#111111" : "#8A8781",
              }}
            >
              Properties
            </Link>
            <Link
              href="/dashboard/settings"
              className="text-[13px] transition-colors"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                color: pathname === "/dashboard/settings" ? "#111111" : "#8A8781",
              }}
            >
              Homepage Cover
            </Link>
            <Link
              href="/dashboard/import"
              className="text-[13px] transition-colors"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                color: pathname === "/dashboard/import" ? "#111111" : "#8A8781",
              }}
            >
              Bulk Import
            </Link>
            <button
              onClick={handleLogout}
              className="text-[13px] transition-colors hover:text-[#111111]"
              style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#8A8781" }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        {children}
      </main>
    </div>
  );
}
