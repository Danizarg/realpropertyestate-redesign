import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyImage } from "./types";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadPropertyImage(
  supabase: SupabaseClient,
  propertyId: string,
  file: File,
  sortOrder: number
): Promise<PropertyImage> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`${file.name} is not a supported image type.`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`${file.name} exceeds 10MB limit.`);
  }

  const ext = file.name.split(".").pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `properties/${propertyId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(storagePath, file, { upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(storagePath);

  const { data: imgRecord, error: dbError } = await supabase
    .from("property_images")
    .insert({
      property_id: propertyId,
      url: urlData.publicUrl,
      storage_path: storagePath,
      alt: file.name.split(".")[0],
      sort_order: sortOrder,
      is_cover: sortOrder === 0,
    })
    .select()
    .single();
  if (dbError) throw new Error(`DB error: ${dbError.message}`);

  return imgRecord as PropertyImage;
}
