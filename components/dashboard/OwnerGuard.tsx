import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface OwnerGuardProps {
  children: React.ReactNode;
}

export default async function OwnerGuard({ children }: OwnerGuardProps) {
  const ownerEmail = process.env.OWNER_EMAIL;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== ownerEmail) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F4F1]">
          <div className="text-center p-12">
            <p
              className="font-display text-3xl mb-4"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111" }}
            >
              Access denied
            </p>
            <p className="text-[14px] mb-8" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
              This area is restricted to the property owner.
            </p>
            <a
              href="/login"
              className="px-6 py-3 text-[13px] tracking-[0.08em] uppercase text-white"
              style={{ background: "#111111", borderRadius: 4, fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Login
            </a>
          </div>
        </div>
      );
    }
  } catch {
    redirect("/login");
  }

  return <>{children}</>;
}
