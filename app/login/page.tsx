"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Metadata } from "next";

// Can't use metadata in client components — handled in a wrapper or layout
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid #E6E3DE",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 14,
    color: "#2D2C2A",
    background: "white",
    borderRadius: 2,
    width: "100%",
    padding: "12px 16px",
    outline: "none",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4F1]">
      <div className="w-full max-w-md px-8 py-12 bg-white" style={{ border: "1px solid #E6E3DE" }}>
        <div className="text-center mb-10">
          <p
            className="font-display text-sm tracking-[0.14em] uppercase text-[#111111] mb-2"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 500 }}
          >
            Real Property Estate
          </p>
          <h1
            className="font-display text-3xl"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", fontWeight: 400 }}
          >
            Owner Access
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="block text-[11px] tracking-[0.08em] uppercase mb-2"
              style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label
              className="block text-[11px] tracking-[0.08em] uppercase mb-2"
              style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-[13px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 text-[13px] tracking-[0.08em] uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "#111111", borderRadius: 4, fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-[12px] transition-colors hover:text-[#111111]"
            style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}
          >
            ← Back to website
          </a>
        </div>
      </div>
    </div>
  );
}
