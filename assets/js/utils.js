/** Small shared helpers. Keep this file free of site-specific logic. */

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** Reads "a.b.c" from a nested object. */
export const getPath = (source, path) =>
  path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), source);

/**
 * One shared, rAF-throttled scroll listener for every scroll-driven effect.
 * Returns an unsubscribe function.
 */
const scrollCallbacks = new Set();
let scrollTicking = false;

function flushScroll() {
  scrollTicking = false;
  const y = window.scrollY;
  scrollCallbacks.forEach((callback) => callback(y));
}

window.addEventListener(
  'scroll',
  () => {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(flushScroll);
    }
  },
  { passive: true },
);

export function onScroll(callback, { immediate = true } = {}) {
  scrollCallbacks.add(callback);
  if (immediate) callback(window.scrollY);
  return () => scrollCallbacks.delete(callback);
}

/** Debounce for resize-like events. */
export function debounce(fn, wait = 150) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}
