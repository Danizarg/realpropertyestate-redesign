"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ABOUT_VIDEO_KEY } from "@/lib/settings-constants";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import type { AboutVideoSettings } from "@/lib/types";

interface AboutVideoFormProps {
  initial: AboutVideoSettings;
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #E6E3DE",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  color: "#2D2C2A",
  background: "white",
  borderRadius: 2,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 11,
  color: "#8A8781",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputClass = "w-full px-4 py-3 outline-none focus:border-[#2D2C2A] transition-colors";

export default function AboutVideoForm({ initial }: AboutVideoFormProps) {
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);

    if (!getYouTubeEmbedUrl(youtubeUrl)) {
      setError("That doesn't look like a valid YouTube link.");
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: upsertError } = await supabase
        .from("site_settings")
        .upsert({ key: ABOUT_VIDEO_KEY, value: { youtubeUrl }, updated_at: new Date().toISOString() });

      if (upsertError) throw new Error(upsertError.message);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Current Video
        </h2>
        <div
          className="relative overflow-hidden bg-[#111111] mx-auto"
          style={{ aspectRatio: "9/16", maxWidth: 320 }}
        >
          {embedUrl ? (
            <iframe
              key={embedUrl}
              src={embedUrl}
              title="About video preview"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-[13px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
                No valid video link
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Video Link
        </h2>
        <div>
          <label style={labelStyle}>YouTube URL</label>
          <input
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value);
              setSuccess(false);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className={inputClass}
            style={inputStyle}
          />
          <p className="mt-2 text-[12px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
            Paste any YouTube link — a watch, share, shorts, or embed URL all work. This replaces the video shown on the &quot;Our approach&quot; section of the homepage.
          </p>
        </div>
      </section>

      {error && (
        <p className="text-[13px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="text-[13px]" style={{ color: "#2D2C2A", fontFamily: "Inter, system-ui, sans-serif" }}>
          Saved. The homepage now shows this video.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-8 py-4 text-[13px] tracking-[0.08em] uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: "#111111", borderRadius: 4, fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
