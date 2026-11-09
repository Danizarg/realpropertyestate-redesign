"use client";

import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { slugify, parsePriceLabel } from "@/lib/utils";
import { uploadPropertyImage } from "@/lib/images";
import ImageUploader from "./ImageUploader";
import StagedImagePicker from "./StagedImagePicker";
import {
  PROPERTY_TYPES,
  LISTING_TYPES,
  STATUS_OPTIONS,
  PETS_OPTIONS,
  FEATURES_OPTIONS,
  type PropertyImage,
} from "@/lib/types";

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  short_description: z.string().min(10),
  long_description: z.string().optional(),
  price: z.coerce.number().optional().nullable(),
  price_label: z.string().min(1),
  location: z.string().min(2),
  address: z.string().optional(),
  bedrooms: z.coerce.number().optional().nullable(),
  bathrooms: z.coerce.number().optional().nullable(),
  internal_area: z.string().optional(),
  plot_size: z.string().optional(),
  outdoor_space: z.string().optional(),
  property_type: z.string().optional(),
  listing_type: z.string().optional(),
  status: z.string().default("Available"),
  pets: z.string().optional(),
  instagram_url: z.string().optional(),
  tiktok_url: z.string().optional(),
  features: z.array(z.string()).optional(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

interface PropertyFormProps {
  mode: "new" | "edit";
  propertyId?: string;
  defaultValues?: Partial<FormData>;
  existingImages?: PropertyImage[];
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p className="mt-1 text-[12px]" style={{ color: "#8A8781" }}>{error}</p>}
    </div>
  );
}

export default function PropertyForm({ mode, propertyId, defaultValues, existingImages }: PropertyFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [savedId, setSavedId] = useState(propertyId ?? "");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      status: "Available",
      published: false,
      featured: false,
      features: [],
      ...defaultValues,
    },
  });

  const nameValue = watch("name");
  useEffect(() => {
    if (mode === "new" && nameValue) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, mode, setValue]);

  async function onSubmit(rawData: FormData) {
    setServerError("");
    const supabase = createClient();
    const data = {
      ...rawData,
      price: rawData.price ?? parsePriceLabel(rawData.price_label),
    };

    try {
      if (mode === "new") {
        const { data: newProp, error } = await supabase
          .from("properties")
          .insert({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        setSavedId(newProp.id);

        for (let i = 0; i < pendingFiles.length; i++) {
          try {
            await uploadPropertyImage(supabase, newProp.id, pendingFiles[i], i);
          } catch (imgErr) {
            const msg = imgErr instanceof Error ? imgErr.message : "Image upload failed.";
            setServerError((prev) => (prev ? `${prev} ${msg}` : msg));
          }
        }

        router.push(`/dashboard/properties/${newProp.id}/edit`);
      } else {
        const { error } = await supabase
          .from("properties")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", propertyId!);

        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setServerError(message);
    }
  }

  const gridClass = "grid grid-cols-1 md:grid-cols-2 gap-5";
  const inputClass = "w-full px-4 py-3 outline-none focus:border-[#2D2C2A] transition-colors";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">

      {/* Basic info */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Basic Information
        </h2>
        <div className="space-y-5">
          <Field label="Property Name" error={errors.name?.message}>
            <input {...register("name")} className={inputClass} style={inputStyle} />
          </Field>
          <div className={gridClass}>
            <Field label="Slug (URL)" error={errors.slug?.message}>
              <input {...register("slug")} className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Price Label" error={errors.price_label?.message}>
              <input {...register("price_label")} placeholder="e.g. €2,450,000" className={inputClass} style={inputStyle} />
            </Field>
          </div>
          <div className={gridClass}>
            <Field label="Price (numeric)" error={errors.price?.message}>
              <input {...register("price")} type="number" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Location" error={errors.location?.message}>
              <input {...register("location")} placeholder="Nueva Andalucía" className={inputClass} style={inputStyle} />
            </Field>
          </div>
          <Field label="Address">
            <input {...register("address")} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Short Description" error={errors.short_description?.message}>
            <textarea {...register("short_description")} rows={2} className={inputClass} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <Field label="Long Description">
            <textarea {...register("long_description")} rows={6} className={inputClass} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
        </div>
      </section>

      {/* Property details */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Property Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <Field label="Bedrooms">
            <input {...register("bedrooms")} type="number" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Bathrooms">
            <input {...register("bathrooms")} type="number" step="0.5" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Internal Area">
            <input {...register("internal_area")} placeholder="520 m²" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Plot Size">
            <input {...register("plot_size")} placeholder="1,200 m²" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Outdoor Space">
            <input {...register("outdoor_space")} placeholder="Terrace 120 m²" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Pets">
            <select {...register("pets")} className={inputClass} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Select...</option>
              {PETS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Property Type">
            <select {...register("property_type")} className={inputClass} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Select...</option>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Listing Type">
            <select {...register("listing_type")} className={inputClass} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Select...</option>
              {LISTING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select {...register("status")} className={inputClass} style={{ ...inputStyle, appearance: "none" }}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Features & Amenities
        </h2>
        <Controller
          name="features"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {FEATURES_OPTIONS.map((feat) => {
                const checked = field.value?.includes(feat) ?? false;
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => {
                      const current = field.value ?? [];
                      field.onChange(
                        checked ? current.filter((f) => f !== feat) : [...current, feat]
                      );
                    }}
                    className="px-4 py-2 text-[13px] transition-colors"
                    style={{
                      border: "1px solid #E6E3DE",
                      borderRadius: 2,
                      fontFamily: "Inter, system-ui, sans-serif",
                      background: checked ? "#111111" : "white",
                      color: checked ? "white" : "#2D2C2A",
                    }}
                  >
                    {feat}
                  </button>
                );
              })}
            </div>
          )}
        />
      </section>

      {/* Social */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Social Links
        </h2>
        <div className={gridClass}>
          <Field label="Instagram URL">
            <input {...register("instagram_url")} placeholder="https://instagram.com/..." className={inputClass} style={inputStyle} />
          </Field>
          <Field label="TikTok URL">
            <input {...register("tiktok_url")} placeholder="https://tiktok.com/..." className={inputClass} style={inputStyle} />
          </Field>
        </div>
      </section>

      {/* Images */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Images
        </h2>
        {mode === "edit" ? (
          <ImageUploader propertyId={propertyId!} existingImages={existingImages} />
        ) : (
          <StagedImagePicker files={pendingFiles} onChange={setPendingFiles} />
        )}
      </section>

      {/* Publishing */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Publishing
        </h2>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register("published")} className="w-4 h-4 accent-black" />
            <span className="text-[14px]" style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#2D2C2A" }}>
              Published (visible on website)
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register("featured")} className="w-4 h-4 accent-black" />
            <span className="text-[14px]" style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#2D2C2A" }}>
              Featured on homepage
            </span>
          </label>
        </div>
      </section>

      {serverError && (
        <p className="text-[13px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
          Error: {serverError}
        </p>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-4 text-[13px] tracking-[0.08em] uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "#111111", borderRadius: 4, fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {isSubmitting ? "Saving..." : mode === "new" ? "Create Property" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-8 py-4 text-[13px] tracking-[0.08em] uppercase transition-colors hover:bg-[#F5F4F1]"
          style={{ border: "1px solid #E6E3DE", fontFamily: "Inter, system-ui, sans-serif", color: "#2D2C2A", borderRadius: 4 }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
