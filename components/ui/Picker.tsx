"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { gsap } from "@/components/motion/gsap";
import { lockScroll, unlockScroll } from "@/components/motion/scroll";
import { normalize } from "@/lib/property-utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { prefersReducedMotion } from "@/lib/experience";
import { cn } from "@/lib/utils";

export interface PickerOption {
  value: string;
  label: string;
  meta?: string | number;
  group?: string;
}

interface PickerProps {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchable?: boolean;
  /** "console" = large editorial field (homepage), "filter" = compact bar control. */
  variant?: "console" | "filter";
  align?: "left" | "right";
  className?: string;
}


/**
 * Accessible listbox picker: popover on desktop, bottom sheet on phones.
 * Keyboard: ↑/↓ to move, Enter to choose, Esc to close, type to filter.
 */
export default function Picker({
  label,
  value,
  options,
  onChange,
  placeholder,
  searchable = false,
  variant = "filter",
  align = "left",
  className,
}: PickerProps) {
  const id = useId();
  const narrow = useMediaQuery("(max-width: 767px)");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const all: PickerOption[] = [{ value: "", label: placeholder }, ...options];
    if (!q) return all;
    return all.filter((o) => o.value === "" || normalize(o.label).includes(q));
  }, [options, placeholder, query]);

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    setQuery("");
    if (focusTrigger) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const openPicker = () => {
    const all = [{ value: "" }, ...options];
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const choose = (v: string) => {
    onChange(v);
    close();
  };

  // Entrance animation + initial active item
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && !prefersReducedMotion()) {
      gsap.fromTo(
        panel,
        narrow ? { yPercent: 100 } : { opacity: 0, y: -8, clipPath: "inset(0% 0% 100% 0%)" },
        narrow
          ? { yPercent: 0, duration: 0.7, ease: "expo.out" }
          : { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "expo.out" }
      );
    }
    const t = window.setTimeout(() => (searchable ? searchRef.current : listRef.current)?.focus({ preventScroll: true }), 30);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock page scroll for the mobile sheet
  useEffect(() => {
    if (!open || !narrow) return;
    lockScroll();
    return () => unlockScroll();
  }, [open, narrow]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, close]);

  // Keep the active option in view
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(filtered.length - 1);
    } else if (e.key === "Enter" || (e.key === " " && !searchable)) {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const listboxId = `${id}-listbox`;
  let lastGroup: string | undefined;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
            e.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "group w-full text-left flex flex-col justify-center transition-colors",
          variant === "console" ? "min-h-[5.5rem] px-6 py-4" : "min-h-[3.6rem] px-4 py-2"
        )}
      >
        <span className="micro-sm text-ink-soft">{label}</span>
        <span className="mt-1.5 flex items-center justify-between gap-3">
          <span
            className={cn(
              "truncate",
              variant === "console" ? "font-serif text-[1.4rem] leading-tight" : "text-[14px]",
              !selected && "text-ink/60"
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          <svg
            viewBox="0 0 12 12"
            className={cn("w-3 h-3 shrink-0 transition-transform duration-500", open && "rotate-180")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <path d="M2 4.5 6 8.5l4-4" />
          </svg>
        </span>
      </button>

      {open && (
        <>
          {narrow && <div className="fixed inset-0 z-[80] bg-obsidian/50" aria-hidden="true" />}
          <div
            ref={panelRef}
            className={cn(
              "z-[81] bg-soft-white text-ink shadow-[0_30px_80px_-30px_rgba(16,20,19,0.45)] border border-ink/10",
              narrow
                ? "fixed inset-x-0 bottom-0 max-h-[78vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
                : cn("absolute top-[calc(100%+8px)] w-[min(24rem,90vw)] max-h-[26rem] flex flex-col", align === "right" ? "right-0" : "left-0")
            )}
            data-lenis-prevent
          >
            {narrow && (
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <p className="micro text-ink-soft">{label}</p>
                <button type="button" onClick={() => close()} className="micro-sm py-2 pl-4">
                  Close
                </button>
              </div>
            )}
            {searchable && (
              <div className="px-4 pt-3 pb-2 border-b border-ink/10">
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onListKey}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  aria-label={`Search ${label.toLowerCase()}`}
                  aria-controls={listboxId}
                  aria-activedescendant={filtered[active] ? `${id}-opt-${active}` : undefined}
                  className="w-full bg-transparent outline-none text-[15px] py-2 placeholder:text-ink/40"
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={label}
              tabIndex={searchable ? -1 : 0}
              aria-activedescendant={!searchable && filtered[active] ? `${id}-opt-${active}` : undefined}
              onKeyDown={searchable ? undefined : onListKey}
              className="overflow-y-auto py-2 outline-none"
            >
              {filtered.map((o, i) => {
                const header = o.group && o.group !== lastGroup ? o.group : null;
                lastGroup = o.group;
                const isSelected = o.value === value;
                return (
                  <li key={`${o.group ?? ""}-${o.value}`} role="presentation">
                    {header && <p className="micro-sm text-ink-soft px-5 pt-4 pb-2">{header}</p>}
                    <div
                      id={`${id}-opt-${i}`}
                      role="option"
                      aria-selected={isSelected}
                      data-index={i}
                      onPointerEnter={() => setActive(i)}
                      onClick={() => choose(o.value)}
                      className={cn(
                        "flex items-center justify-between gap-4 px-5 py-3 cursor-pointer text-[14.5px] transition-colors",
                        i === active ? "bg-ivory-2" : "",
                        isSelected && "font-semibold"
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      <span className="flex items-center gap-3 shrink-0">
                        {o.meta !== undefined && <span className="text-[12px] text-ink-soft tabular-nums">{o.meta}</span>}
                        {isSelected && (
                          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                            <path d="M2 6.5 5 9l5-6" />
                          </svg>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
              {filtered.length === 1 && query && (
                <li className="px-5 py-6 text-[14px] text-ink-soft">No matches for “{query}”.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
