"use client";

import { useEffect, useState } from "react";
import type { ListingSummary } from "./types";

let cache: Promise<ListingSummary[]> | null = null;

/** Published listings for client features (search overlay, concierge). Fetched once per visit. */
export function loadListings(): Promise<ListingSummary[]> {
  if (!cache) {
    cache = fetch("/api/listings")
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((body: { listings?: ListingSummary[] }) => body.listings ?? [])
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}

export function useListings(enabled = true) {
  const [listings, setListings] = useState<ListingSummary[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadListings().then((l) => alive && setListings(l));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return listings;
}
