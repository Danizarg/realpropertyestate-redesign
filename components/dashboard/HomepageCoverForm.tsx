"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadSiteMedia, deleteSiteMedia } from "@/lib/media";
import { HOMEPAGE_COVER_KEY } from "@/lib/settings-constants";
import type { HomepageCoverSettings } from "@/lib/types";

interface HomepageCoverFormProps {
  initial: HomepageCoverSettings;
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

export default function HomepageCoverForm({ initial }: HomepageCoverFormProps) {
  const [mediaType, setMediaType] = useState<"image" | "video">(initial.mediaType);
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [buttonText, setButtonText] = useState(initial.buttonText);
  const [buttonLink, setButtonLink] = useState(initial.buttonLink);

  const [currentMediaUrl, setCurrentMediaUrl] = useState(initial.mediaUrl);
  const [currentStoragePath, setCurrentStoragePath] = useState(initial.storagePath);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(file: File | null) {
    setError("");
    setSuccess(false);
    if (!file) {
      setPendingFile(null);
      setPreviewUrl(null);
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const supabase = createClient();

      let mediaUrl = currentMediaUrl;
      let storagePath = currentStoragePath;
      const previousStoragePath = currentStoragePath;

      if (pendingFile) {
        const uploaded = await uploadSiteMedia(supabase, pendingFile, mediaType, "homepage-cover");
        mediaUrl = uploaded.url;
        storagePath = uploaded.storagePath;
      }

      const value = {
        mediaType,
        mediaUrl,
        storagePath,
        title,
        subtitle,
        buttonText,
        buttonLink,
      };

      const { error: upsertError } = await supabase
        .from("site_settings")
        .upsert({ key: HOMEPAGE_COVER_KEY, value, updated_at: new Date().toISOString() });

      if (upsertError) throw new Error(upsertError.message);

      // Clean up the previous file only after the new one is safely saved.
      if (pendingFile && previousStoragePath) {
        await deleteSiteMedia(supabase, previousStoragePath);
      }

      setCurrentMediaUrl(mediaUrl);
      setCurrentStoragePath(storagePath);
      setPendingFile(null);
      setPreviewUrl(null);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const displayUrl = previewUrl ?? currentMediaUrl;

  return (
    <div className="space-y-10">
      {/* Preview */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Current Cover
        </h2>
        <div
          className="relative overflow-hidden bg-[#111111]"
          style={{ aspectRatio: "16/9", maxWidth: 640 }}
        >
          {displayUrl ? (
            mediaType === "video" ? (
              <video
                key={displayUrl}
                src={displayUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayUrl} alt="Homepage cover preview" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-[13px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
                No cover set
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Media type + upload */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Cover Media
        </h2>
        <div className="space-y-5">
          <div>
            <label style={labelStyle}>Media Type</label>
            <div className="flex gap-2">
              {(["image", "video"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setMediaType(type);
                    setPendingFile(null);
                    setPreviewUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="px-5 py-2 text-[13px] uppercase tracking-[0.05em] transition-colors"
                  style={{
                    border: "1px solid #E6E3DE",
                    borderRadius: 2,
                    fontFamily: "Inter, system-ui, sans-serif",
                    background: mediaType === type ? "#111111" : "white",
                    color: mediaType === type ? "white" : "#2D2C2A",
                  }}
                >
                  {type === "image" ? "Image" : "Video"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Upload New {mediaType === "image" ? "Cover Image" : "Cover Video"}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={mediaType === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"}
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              className={inputClass}
              style={{ ...inputStyle, padding: "10px 16px" }}
            />
            <p className="mt-2 text-[12px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
              {mediaType === "image"
                ? "JPG, PNG or WEBP · Max 10MB"
                : "MP4 or WEBM · Max 50MB"}
            </p>
          </div>
        </div>
      </section>

      {/* Overlay text */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Overlay Text
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label style={labelStyle}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Subtitle</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Button Text</label>
            <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Button Link</label>
            <input value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
        </div>
      </section>

      {error && (
        <p className="text-[13px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="text-[13px]" style={{ color: "#2D2C2A", fontFamily: "Inter, system-ui, sans-serif" }}>
          Saved. The homepage now reflects these changes.
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
