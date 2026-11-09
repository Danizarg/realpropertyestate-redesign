"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { uploadPropertyImage } from "@/lib/images";
import type { PropertyImage } from "@/lib/types";

interface ImageUploaderProps {
  propertyId: string;
  existingImages?: PropertyImage[];
  onImagesChange?: (images: PropertyImage[]) => void;
}

export default function ImageUploader({
  propertyId,
  existingImages = [],
  onImagesChange,
}: ImageUploaderProps) {
  const [images, setImages] = useState<PropertyImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");

    const supabase = createClient();
    const newImages: PropertyImage[] = [];

    for (const file of Array.from(files)) {
      try {
        const sortOrder = images.length + newImages.length;
        const imgRecord = await uploadPropertyImage(supabase, propertyId, file, sortOrder);
        newImages.push(imgRecord);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    }

    const updated = [...images, ...newImages];
    setImages(updated);
    onImagesChange?.(updated);
    setUploading(false);
  }

  async function deleteImage(img: PropertyImage) {
    const supabase = createClient();

    if (img.storage_path) {
      await supabase.storage.from("property-images").remove([img.storage_path]);
    }
    await supabase.from("property_images").delete().eq("id", img.id);

    const updated = images.filter((i) => i.id !== img.id);
    setImages(updated);
    onImagesChange?.(updated);
  }

  async function setCover(img: PropertyImage) {
    const supabase = createClient();

    // Unset all covers
    await supabase
      .from("property_images")
      .update({ is_cover: false })
      .eq("property_id", propertyId);

    // Set this one
    await supabase
      .from("property_images")
      .update({ is_cover: true })
      .eq("id", img.id);

    const updated = images.map((i) => ({ ...i, is_cover: i.id === img.id }));
    setImages(updated);
    onImagesChange?.(updated);
  }

  return (
    <div>
      {/* Existing images */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <div
                className="relative overflow-hidden bg-[#F5F4F1]"
                style={{ aspectRatio: "1/1" }}
              >
                <Image src={img.url} alt={img.alt ?? "Property image"} fill className="object-cover" sizes="20vw" />
                {img.is_cover && (
                  <div
                    className="absolute bottom-0 left-0 right-0 text-[10px] text-center py-0.5"
                    style={{ background: "#111111", color: "white", fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    Cover
                  </div>
                )}
              </div>
              <div className="flex gap-1 mt-1">
                {!img.is_cover && (
                  <button
                    type="button"
                    onClick={() => setCover(img)}
                    className="flex-1 text-[10px] py-1 transition-colors hover:bg-[#E6E3DE]"
                    style={{
                      border: "1px solid #E6E3DE",
                      fontFamily: "Inter, system-ui, sans-serif",
                      color: "#8A8781",
                      borderRadius: 2,
                    }}
                  >
                    Set cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteImage(img)}
                  className="flex-1 text-[10px] py-1 transition-colors hover:bg-red-50"
                  style={{
                    border: "1px solid #E6E3DE",
                    fontFamily: "Inter, system-ui, sans-serif",
                    color: "#8A8781",
                    borderRadius: 2,
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        className="border-dashed flex flex-col items-center justify-center py-10 cursor-pointer hover:bg-[#F5F4F1] transition-colors"
        style={{ border: "1px dashed #E6E3DE", borderRadius: 2 }}
        onClick={() => inputRef.current?.click()}
      >
        <p
          className="text-[13px] mb-1"
          style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {uploading ? "Uploading..." : "Click to upload images"}
        </p>
        <p
          className="text-[12px]"
          style={{ color: "#E6E3DE", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          JPG, PNG, WebP · Max 10MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
}
