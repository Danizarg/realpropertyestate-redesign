"use client";

import { STORAGE, writePref } from "@/lib/experience";
import { scrollToTop } from "@/components/motion/scroll";

export const REPLAY_EVENT = "rpe:replay-intro";

/** Replays the cinematic introduction (navigating home first when needed). */
export function replayIntro(navigate: (href: string) => void) {
  if (window.location.pathname === "/") {
    scrollToTop(true);
    window.dispatchEvent(new Event(REPLAY_EVENT));
    return;
  }
  writePref(STORAGE.introReplay, "1", true);
  navigate("/");
}
