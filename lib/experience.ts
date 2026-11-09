/** Browser-side preference keys and safe storage helpers for the experience layer. */

export const STORAGE = {
  introSeen: "rpe:intro-seen",
  sound: "rpe:sound", // "on" | "off"
  captions: "rpe:captions", // "on" | "off"
  micConsent: "rpe:mic-consent", // "granted"
  introReplay: "rpe:intro-replay", // sessionStorage flag
  listView: "rpe:collection-view", // "grid" | "list"
} as const;

export function readPref(key: string, session = false): string | null {
  try {
    return (session ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null, session = false): void {
  try {
    const store = session ? window.sessionStorage : window.localStorage;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — preferences simply aren't remembered */
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Inline, pre-paint script: decides whether the intro should be skipped
 * before first paint so returning visitors never see a flash of it. */
export const PREPAINT_SCRIPT = `(function(){try{var d=document.documentElement;d.classList.add('js');var seen=localStorage.getItem('${STORAGE.introSeen}');var replay=sessionStorage.getItem('${STORAGE.introReplay}');var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if((seen||rm)&&!replay){d.setAttribute('data-intro','skip');}}catch(e){document.documentElement.setAttribute('data-intro','skip');}})();`;
