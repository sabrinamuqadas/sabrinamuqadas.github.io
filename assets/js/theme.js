import { CONFIG } from './config.js?v=1.0.26';
import { qs } from './utils.js?v=1.0.26';

const { storageKey, metaColors } = CONFIG.theme;

function save(theme) {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    /* Persistence is a nicety; the theme still applies for this visit. */
  }
}

/** Applies a theme to the document and keeps the toggle's label and the browser UI colour in sync. */
function applyTheme(theme, toggle) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);

  const meta = qs('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', metaColors[theme]);

  if (toggle) {
    const next = theme === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `Switch to ${next} theme`);
  }
}

export function initTheme() {
  const root = document.documentElement;
  const toggle = qs('[data-theme-toggle]');
  // Dark is the site default. Light only sticks after an explicit toggle (saved in localStorage).
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', toggle);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      // Briefly enable colour transitions so the switch feels smooth without slowing normal interactions.
      root.classList.add('theme-transition');
      applyTheme(next, toggle);
      save(next);
      window.setTimeout(() => root.classList.remove('theme-transition'), 600);
    });
  }
}
