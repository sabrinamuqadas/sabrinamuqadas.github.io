/**
 * Central configuration: URLs, feature flags and tunable settings.
 * Content (copy, links, tools, experience) lives in assets/data/portfolio.json.
 */
export const CONFIG = Object.freeze({
  siteUrl: 'https://sabrinamuqadas.github.io/',
  dataUrl: './assets/data/portfolio.json',
  dataTimeoutMs: 8000,

  assets: Object.freeze({
    sprite: './assets/image/icons.svg',
    toolIcons: './assets/image/tools/',
    worldMap: './assets/image/illustrations/world-dots.svg',
  }),

  theme: Object.freeze({
    storageKey: 'sm-theme',
    metaColors: Object.freeze({ dark: '#0B1220', light: '#F8FAFC' }),
  }),

  /**
   * Contact form delivery.
   * - endpoint empty  -> opens the visitor's email app with a prefilled message (mailto).
   * - endpoint set    -> POSTs JSON to a form service (e.g. https://formspree.io/f/xxxx).
   *   Remember to allow the endpoint in the Content-Security-Policy meta tag in index.html.
   */
  contact: Object.freeze({
    endpoint: '',
    subjectPrefix: 'Portfolio inquiry',
    minFillMs: 3000,
    cooldownMs: 30000,
  }),

  features: Object.freeze({
    magneticButtons: true,
    cardTilt: true,
    parallax: true,
    rotateRoles: true,
    verifyCvFile: true,
  }),

  motion: Object.freeze({
    revealThreshold: 0.14,
    roleIntervalMs: 2800,
    counterDurationMs: 1400,
    parallaxMinWidth: 768,
    filterDurationMs: 220,
  }),

  /** Optional privacy-friendly analytics. Off by default; no tracking unless enabled. */
  analytics: Object.freeze({
    provider: 'none', // 'none' | 'plausible'
    domain: '',
    scriptUrl: 'https://plausible.io/js/script.js',
  }),
});
