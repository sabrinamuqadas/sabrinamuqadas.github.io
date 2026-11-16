import { CONFIG } from './config.js';
import { loadPortfolio } from './data.js';
import { renderPortfolio, setupCvLinks, showDataNotice } from './components.js';
import { initAnimations } from './animations.js';
import { initNavigation } from './navigation.js';
import { initTheme } from './theme.js';
import { initContact } from './contact.js';
import { qsa } from './utils.js';

/** Loads an optional, privacy-friendly analytics script only when explicitly enabled in config.js. */
function loadAnalytics() {
  const { provider, domain, scriptUrl } = CONFIG.analytics;
  if (provider !== 'plausible' || !domain) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = scriptUrl;
  script.dataset.domain = domain;
  document.head.append(script);
}

/** Rendering content changes the page height, so a deep link (e.g. /#tools) needs re-aligning afterwards. */
function realignHash() {
  const { hash } = window.location;
  if (hash.length < 2) return;
  let target = null;
  try {
    target = document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return;
  }
  if (!target) return;
  requestAnimationFrame(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
}

async function init() {
  initTheme();
  qsa('[data-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  // Static hero content is already in the HTML, so its entrance can start before the data arrives.
  const animations = initAnimations();
  animations.refresh();

  let data = null;
  try {
    data = await loadPortfolio(CONFIG.dataUrl, CONFIG.dataTimeoutMs);
    renderPortfolio(data);
  } catch (error) {
    console.error('Portfolio content could not be loaded; showing static fallback.', error);
    showDataNotice();
  }

  initNavigation();
  animations.refresh();
  realignHash();

  initContact(data?.contact);
  if (data) setupCvLinks(data);

  loadAnalytics();
}

init();
