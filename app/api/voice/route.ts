import { NextResponse } from "next/server";
import { MAX_CHARS, speakWithSuzaVoice, suzaVoiceKey, TTS_MODEL, TTS_VOICE } from "@/lib/audio/suza-voice";

/**
 * Natural voice for the intro narration and concierge replies.
 *
 * Primary: the Zouza "Suza" voice — OpenAI gpt-4o-mini-tts, voice "marin",
 * with the same delivery instructions and server-side shaping (soft S/Z and a
 * gentle room echo). Enable it with VOICE_TTS_API_KEY or OPENAI_API_KEY on the
 * server (SUZA_TTS_API_KEY from the Zouza app also works).
 *
 * Alternative: ElevenLabs, used only when no OpenAI-compatible key is set and
 * ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID are.
 *
 * With neither configured the site uses the visitor's browser voice.
 * Keys stay on the server and are never sent to the browser.
 */

export const runtime = "nodejs";

type Provider = "suza" | "elevenlabs" | null;

function provider(): Provider {
  if (suzaVoiceKey()) return "suza";
  if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) return "elevenlabs";
  return null;
}

export async function GET() {
  const p = provider();
  return NextResponse.json(
    { enabled: !!p, provider: p, ...(p === "suza" ? { model: TTS_MODEL, voice: TTS_VOICE } : {}) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const p = provider();
  if (!p) return NextResponse.json({ error: "Voice provider not configured." }, { status: 501 });

  // Same-origin only: this endpoint spends provider credits.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS) : "";
  if (!text) return NextResponse.json({ error: "Missing text." }, { status: 400 });

  if (p === "suza") {
    try {
      const wav = await speakWithSuzaVoice(text);
      return new Response(new Blob([wav as BlobPart], { type: "audio/wav" }), {
        headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
      });
    } catch (err) {
      console.error("Voice synthesis failed:", err);
      return NextResponse.json({ error: "Voice synthesis failed." }, { status: 502 });
    }
  }

  const voiceId = encodeURIComponent(process.env.ELEVENLABS_VOICE_ID!);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
      voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.2 },
    }),
  });

  if (!res.ok || !res.body) {
    console.error("Voice provider error:", res.status);
    return NextResponse.json({ error: "Voice provider error." }, { status: 502 });
  }

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
