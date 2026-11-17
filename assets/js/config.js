/**
 * Central configuration: URLs, feature flags and tunable settings.
 * Content (copy, links, tools, experience) lives in assets/content/portfolio.json.
 * Cache-busting version lives in assets/js/version.js (SM_ASSET_VERSION).
 */

const ASSET_VERSION =
  (typeof globalThis !== 'undefined' && globalThis.SM_ASSET_VERSION) || '1.0.26';

function withVersion(url) {
  if (typeof globalThis !== 'undefined' && typeof globalThis.smAssetUrl === 'function') {
    return globalThis.smAssetUrl(url);
  }
  if (!url || !ASSET_VERSION) return url;
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}v=${ASSET_VERSION}${hash}`;
}

export const CONFIG = Object.freeze({
  siteUrl: 'https://sabrinamuqadas.github.io/',
  version: ASSET_VERSION,
  dataUrl: withVersion('./assets/content/portfolio.json'),
  dataTimeoutMs: 8000,

  assets: Object.freeze({
    sprite: withVersion('./assets/image/icons.svg'),
    toolIcons: './assets/image/tools/',
    worldMap: withVersion('./assets/image/illustrations/world-dots.svg'),
    withVersion,
  }),

  theme: Object.freeze({
    storageKey: 'sabrina-muqadas',
    metaColors: Object.freeze({ dark: '#0B1220', light: '#F8FAFC' }),
  }),
  
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
