"use client";

import { useRef, useState, useEffect } from "react";

interface StagedImagePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export default function StagedImagePicker({ files, onChange }: StagedImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    onChange([...files, ...Array.from(newFiles)]);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      {files.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative group">
              <div
                className="relative overflow-hidden bg-[#F5F4F1]"
                style={{ aspectRatio: "1/1" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt={file.name} className="w-full h-full object-cover" />
                {i === 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 text-[10px] text-center py-0.5"
                    style={{ background: "#111111", color: "white", fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    Cover
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="w-full mt-1 text-[10px] py-1 transition-colors hover:bg-red-50"
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
          ))}
        </div>
      )}

      <div
        className="border-dashed flex flex-col items-center justify-center py-10 cursor-pointer hover:bg-[#F5F4F1] transition-colors"
        style={{ border: "1px dashed #E6E3DE", borderRadius: 2 }}
        onClick={() => inputRef.current?.click()}
      >
        <p
          className="text-[13px] mb-1"
          style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          Click to select images
        </p>
        <p
          className="text-[12px]"
          style={{ color: "#E6E3DE", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          JPG, PNG, WebP · Max 10MB each · Uploaded when you save
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
