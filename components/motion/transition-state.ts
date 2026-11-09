"use client";

/**
 * Tiny cross-component signals for choreography:
 *  - page transitions (is a curtain/shared image currently covering the page?)
 *  - the cinematic intro (has it handed off to the homepage yet?)
 */

let covering = false;
const revealWaiters = new Set<() => void>();

export function setCovering(value: boolean) {
  covering = value;
  if (!value) {
    const waiters = [...revealWaiters];
    revealWaiters.clear();
    waiters.forEach((fn) => fn());
  }
}

export function isCovering() {
  return covering;
}

/** Runs `fn` once the page is visible (immediately if no transition is running). */
export function whenPageRevealed(fn: () => void): () => void {
  if (!covering) {
    fn();
    return () => {};
  }
  revealWaiters.add(fn);
  return () => revealWaiters.delete(fn);
}

let introComplete = false;
const introWaiters = new Set<() => void>();

export function markIntroComplete() {
  introComplete = true;
  const waiters = [...introWaiters];
  introWaiters.clear();
  waiters.forEach((fn) => fn());
}

export function resetIntroComplete() {
  introComplete = false;
}

export function isIntroComplete() {
  return introComplete;
}

/** Runs `fn` once the intro has handed off (immediately when skipped/seen). */
export function whenIntroComplete(fn: () => void): () => void {
  if (introComplete) {
    fn();
    return () => {};
  }
  introWaiters.add(fn);
  return () => introWaiters.delete(fn);
}
