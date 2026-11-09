"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useId, useState } from "react";
import { RollLabel, Arrow } from "@/components/motion/Magnetic";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Please tell us your name"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  interest: z.string().optional(),
  message: z.string().min(10, "Please write a brief message (10 characters or more)"),
  website: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ContactFormProps {
  propertyId?: string;
  propertyName?: string;
  defaultInterest?: string;
  tone?: "light" | "dark";
}

const INTERESTS = [
  { value: "buying", label: "Buying" },
  { value: "selling", label: "Selling" },
  { value: "renting", label: "Renting" },
  { value: "private_viewing", label: "Private viewing" },
];

const CONTACT_PREFS = ["Email", "Phone", "WhatsApp"] as const;

/**
 * Private enquiry form. Posts the same payload as before to /api/contact
 * (saved to Supabase, emailed to the owner via Resend). The optional
 * preferred-contact choice is appended to the message so no schema change
 * is needed.
 */
export default function ContactForm({ propertyId, propertyName, defaultInterest, tone = "light" }: ContactFormProps) {
  const uid = useId();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [preferred, setPreferred] = useState<string>("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { interest: defaultInterest ?? "" },
  });

  const interest = watch("interest");
  const dark = tone === "dark";

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      const message = preferred ? `${data.message}\n\nPreferred contact: ${preferred}` : data.message;
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, message, propertyId, propertyName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong.");
      }
      setSubmitted(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      console.error(err);
    }
  }

  const fieldVars = (dark
    ? {
        "--field-line": "rgba(245,242,235,0.28)",
        "--field-muted": "rgba(245,242,235,0.6)",
        "--field-accent": "#c5b18a",
      }
    : {
        "--field-line": "rgba(16,20,19,0.24)",
        "--field-muted": "#5c5f5a",
        "--field-accent": "#101413",
      }) as React.CSSProperties;

  const chipVars = (dark
    ? { "--chip-line": "rgba(245,242,235,0.25)", "--chip-active-bg": "#f5f2eb", "--chip-active-fg": "#101413" }
    : {}) as React.CSSProperties;

  if (submitted) {
    return (
      <div className="py-10" role="status" aria-live="polite">
        <svg viewBox="0 0 52 52" className={cn("w-14 h-14", dark ? "text-champagne" : "text-bronze")} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
          <circle cx="26" cy="26" r="25" className="[stroke-dasharray:160] [stroke-dashoffset:160] animate-[draw_1.2s_var(--ease-out)_forwards]" />
          <path d="M15 27l7 7 15-16" className="[stroke-dasharray:40] [stroke-dashoffset:40] animate-[draw_0.8s_0.6s_var(--ease-out)_forwards]" />
        </svg>
        <p className="mt-8 display-m">Thank you.</p>
        <p className={cn("mt-4 body-copy max-w-sm", dark ? "text-ivory/70" : "text-ink-soft")}>
          Your enquiry has been received. We will be in touch shortly — personally, and with complete discretion.
        </p>
        <button
          type="button"
          onClick={() => {
            reset({ interest: defaultInterest ?? "" });
            setPreferred("");
            setSubmitted(false);
          }}
          className="mt-8 link-line micro-sm"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const errorId = (k: string) => `${uid}-${k}-error`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7" style={fieldVars}>
      {/* Honeypot: hidden from real users, bots tend to fill every field */}
      <input
        type="text"
        {...register("website")}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      {propertyName && (
        <p className={cn("text-[13px] pb-5 border-b", dark ? "text-ivory/60 border-ivory/10" : "text-ink-soft border-ink/10")}>
          Enquiry regarding <span className={dark ? "text-ivory" : "text-ink"}>{propertyName}</span>
        </p>
      )}

      <fieldset>
        <legend className={cn("micro-sm mb-4", dark ? "text-ivory/60" : "text-ink-soft")}>I am interested in</legend>
        <div className="flex flex-wrap gap-2" style={chipVars}>
          {INTERESTS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={interest === o.value}
              onClick={() => setValue("interest", interest === o.value ? "" : o.value)}
              className="chip"
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
        <div className="field" data-invalid={!!errors.name}>
          <input
            id={`${uid}-name`}
            {...register("name")}
            placeholder=" "
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? errorId("name") : undefined}
            className="field-input"
          />
          <label htmlFor={`${uid}-name`} className="field-label">
            Full name
          </label>
          <span className="field-bar" aria-hidden="true" />
          {errors.name && (
            <p id={errorId("name")} className="mt-2 text-[12.5px] text-terracotta">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="field" data-invalid={!!errors.email}>
          <input
            id={`${uid}-email`}
            {...register("email")}
            type="email"
            placeholder=" "
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? errorId("email") : undefined}
            className="field-input"
          />
          <label htmlFor={`${uid}-email`} className="field-label">
            Email
          </label>
          <span className="field-bar" aria-hidden="true" />
          {errors.email && (
            <p id={errorId("email")} className="mt-2 text-[12.5px] text-terracotta">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="field">
          <input id={`${uid}-phone`} {...register("phone")} type="tel" placeholder=" " autoComplete="tel" className="field-input" />
          <label htmlFor={`${uid}-phone`} className="field-label">
            Phone (optional)
          </label>
          <span className="field-bar" aria-hidden="true" />
        </div>

        <fieldset className="pt-2">
          <legend className={cn("micro-sm mb-3", dark ? "text-ivory/60" : "text-ink-soft")}>Preferred contact (optional)</legend>
          <div className="flex flex-wrap gap-2" style={chipVars}>
            {CONTACT_PREFS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={preferred === p}
                onClick={() => setPreferred(preferred === p ? "" : p)}
                className="chip !min-h-[2.3rem]"
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="field" data-invalid={!!errors.message}>
        <textarea
          id={`${uid}-message`}
          {...register("message")}
          rows={4}
          placeholder=" "
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? errorId("message") : undefined}
          className="field-input resize-y min-h-[8rem]"
        />
        <label htmlFor={`${uid}-message`} className="field-label">
          How can we help?
        </label>
        <span className="field-bar" aria-hidden="true" />
        {errors.message && (
          <p id={errorId("message")} className="mt-2 text-[12.5px] text-terracotta">
            {errors.message.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-[13.5px] text-terracotta">
          {serverError}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-2">
        <button type="submit" disabled={isSubmitting} className={cn("btn", dark ? "btn-light" : "btn-dark")}>
          <RollLabel>{isSubmitting ? "Sending…" : "Send private enquiry"}</RollLabel>
          <Arrow className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
