import { NextResponse } from "next/server";
import { getListingSummaries } from "@/lib/properties";

/**
 * Lightweight published-listing summaries for client features (site search,
 * concierge). Read-only; respects Supabase RLS (published properties only).
 */
export async function GET() {
  const listings = await getListingSummaries();
  return NextResponse.json(
    { listings },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
  );
}
