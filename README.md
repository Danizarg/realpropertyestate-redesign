# Real Property Estate

Luxury real estate website for Marbella, Spain. Built with Next.js 16, TypeScript, Tailwind CSS v4, and Supabase, with GSAP (ScrollTrigger, SplitText, Flip) and Lenis for motion.

---

## The experience (public site)

| Area | What it does |
|---|---|
| Cinematic introduction | First-visit film ("Welcome to Marbella"): emblem in darkness → sound-consent prompt → three choreographed scenes → dissolves into the homepage hero. Skippable at any moment (button or `Esc`), shown once per visitor, replayable from the menu/footer, skipped automatically for `prefers-reduced-motion`. |
| Sound | Optional narration (captions included) and a generative ambient score built with the Web Audio API — no audio files, nothing to license. Only starts after the visitor chooses "Enter with sound"; preference remembered; toggle in the header, menu and footer. |
| Homepage | Hero (owner-editable cover image/video, title, subtitle, button), live search console, featured residences, pinned "Marbella lifestyle" chapters linked to real inventory counts, philosophy + owner film (click-to-load YouTube facade), founder, private enquiry. |
| Collection `/properties` | Server-rendered, URL-shareable filters (`location`, `type`, `min`, `max`, `beds`, `pets`, `listing`, `sort`, `q`, `view`), accent-insensitive location grouping (areas + communities with live counts), animated reflow, grid and editorial list view, incremental loading. |
| Residence `/properties/[slug]` | Image morphs from the card into a full-bleed hero, key facts, editorial description, scroll-driven gallery + fullscreen viewer (keyboard, swipe, thumbnails), features, enquiry form + WhatsApp, sticky enquiry dock, share. |
| Concierge | Floating control → voice/text concierge with live transcript and an animated presence. Runs in **preview mode**: answers are generated on the visitor's device from the live published listings (it is not an AI model and says so). Voice input uses the browser's speech recognition after an explicit consent notice; nothing is recorded or stored. |
| Navigation | Adaptive transparent → floating glass header, fullscreen editorial menu, instant search overlay across all residences, page transitions without white flashes. |

Owner-area pages (`/login`, `/dashboard/*`) are unchanged and keep their original styling.

### Owner notes

- **Homepage headline** comes from Dashboard → Homepage Cover. The default (used when nothing has been saved) is now "Where extraordinary living begins." If a cover has been saved before, update its title/subtitle/button there.
- **Featured residences**: tick "Featured" on properties in the dashboard to curate the homepage. If none are featured, the newest listings are shown.
- **Images**: property photos are served at their uploaded size (`images.unoptimized` is kept on to avoid image-optimisation charges). Enabling Supabase image transformations (Pro plan) would make thumbnails and cards much lighter.

### Optional production services

| Service | How to enable |
|---|---|
| Concierge voice (narration + concierge replies) | The same voice as Zouza's Suza: OpenAI `gpt-4o-mini-tts`, voice `marin`, with soft S/Z and a gentle room echo shaped on the server (`lib/audio/suza-voice.ts`). Set `VOICE_TTS_API_KEY` (or `OPENAI_API_KEY`) on the server only. Without a key the browser's own voice is used. ElevenLabs remains an optional alternative (`ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`). |
| AI concierge backend | Implement the `ConciergeEngine` interface in `lib/concierge/engine.ts` against your own server route (never call an AI provider from the browser with a secret key) and return it from `createConciergeEngine()`. |

### Structure

```
app/(site)/          public pages (route group — URLs unchanged) + shared layout
app/dashboard, login owner area (unchanged)
app/api/             contact (unchanged), listings (read-only summaries), voice (optional TTS)
components/motion/   GSAP + Lenis setup, page transitions, reveals, parallax, magnetic
components/intro/    cinematic introduction
components/concierge concierge UI and orb
components/home|properties|site|forms|ui
lib/properties.ts    server data access (seed data only when Supabase is not configured)
lib/concierge/       on-device concierge engine
lib/audio/           ambient score, voice output, speech recognition
public/brand/        transparent light/dark versions of the logo and monogram
```

Editorial photography of Marbella is from Unsplash (free licence; Unsplash+ images excluded) — see `lib/media-library.ts`.

---

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (server-side only) |
| `OWNER_EMAIL` | The email address of the property owner (dashboard access) |
| `NEXT_PUBLIC_SITE_URL` | Your production domain |

### 3. Run database schema

In the Supabase dashboard → SQL Editor, paste and run the contents of `supabase/schema.sql`.

If this project's schema was already applied before the `site_settings` table existed, run `supabase/migrations/002_site_settings.sql` instead of re-running the whole schema file (which would error on tables/policies that already exist).

### 4. Create Storage buckets

In Supabase → Storage, create two buckets, both set to **public** so URLs work without auth tokens:

- `property-images` — property photos
- `site-media` — homepage cover image/video (used by the "Homepage Cover" dashboard setting)

**Note on upload size limits:** Supabase enforces a project-wide global file upload limit in addition to any per-bucket limit — on the free tier this is typically 50MB. If you set a bucket's file size limit higher than the project's global limit, uploads will fail with a "Payload too large" error even though the bucket itself allows it. This project's cover video upload is capped at 50MB client-side (in `lib/media.ts`) to match. If your plan allows a higher global limit, you can raise both the bucket's `file_size_limit` and the constant in `lib/media.ts`.

After creating the buckets, run `supabase/storage-policies.sql` in the SQL Editor (for a brand-new project) — or, if `property-images` policies already exist, run only `supabase/migrations/003_site_media_storage_policies.sql`.

### 5. Create owner user

In Supabase → Authentication → Users, create a new user with the email address matching `OWNER_EMAIL`.

### 6. Install dependencies

```bash
npm install
```

---

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The site works without Supabase credentials — it falls back to seed data for public pages.

---

## Build

```bash
npm run build
npm start
```

---

## Deployment (Vercel)

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo.
3. Add all environment variables from `.env.local` in the Vercel project settings.
4. Deploy.

---

## Custom Domain (GoDaddy → Vercel)

After deploying to Vercel:

1. In Vercel → Project Settings → Domains, add your custom domain (currently `realpropertyestate.online`).
2. Vercel will give you DNS records to add.
3. In GoDaddy → DNS Management for your domain:
   - Add an **A record**: `@` → Vercel's IP (shown in Vercel dashboard, typically `76.76.21.21`)
   - Add a **CNAME record**: `www` → `cname.vercel-dns.com`
4. Wait for DNS propagation (up to 48 hours, usually much faster).

---

## Pages

| Route | Description |
|---|---|
| `/` | Cinematic intro, hero, search, featured residences, lifestyle chapters, founder, enquiry |
| `/properties` | Full collection with URL-shareable filters, grid and list views |
| `/properties/[slug]` | Residence: hero, facts, gallery viewer, enquiry form, WhatsApp |
| `/about` | Company editorial page |
| `/contact` | Contact form + company info |
| `/login` | Owner login |
| `/dashboard` | Owner property management |
| `/dashboard/properties/new` | Add new property |
| `/dashboard/properties/[id]/edit` | Edit property + manage images |
| `/dashboard/settings` | Homepage cover image/video, overlay text and button |
