import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

export interface UploadedMedia {
  url: string;
  storagePath: string;
}

export async function uploadSiteMedia(
  supabase: SupabaseClient,
  file: File,
  mediaType: "image" | "video",
  folder: string
): Promise<UploadedMedia> {
  const allowedTypes = mediaType === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

  if (!allowedTypes.includes(file.type)) {
    const kinds = mediaType === "image" ? "JPG, PNG, or WEBP" : "MP4 or WEBM";
    throw new Error(`${file.name} is not a supported ${mediaType} type. Use ${kinds}.`);
  }
  if (file.size > maxSize) {
    const limitMb = Math.round(maxSize / (1024 * 1024));
    throw new Error(`${file.name} exceeds the ${limitMb}MB limit for ${mediaType}s.`);
  }

  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `${folder}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("site-media")
    .upload(storagePath, file, { upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from("site-media").getPublicUrl(storagePath);

  return { url: urlData.publicUrl, storagePath };
}

export async function deleteSiteMedia(supabase: SupabaseClient, storagePath: string): Promise<void> {
  await supabase.storage.from("site-media").remove([storagePath]);
}
