import { CONFIG } from './config.js?v=1.0.47';
import { loadPortfolio } from './data.js?v=1.0.47';
import { renderPortfolio, setupCvLinks, showDataNotice } from './components.js?v=1.0.47';
import { initAnimations } from './animations.js?v=1.0.47';
import { initNavigation } from './navigation.js?v=1.0.47';
import { initTheme } from './theme.js?v=1.0.47';
import { initContact } from './contact.js?v=1.0.47';
import { initGrowthLab } from './growth-lab/index.js?v=1.0.47';
import { initWelcome } from './welcome.js?v=1.0.47';
import { qs, qsa } from './utils.js?v=1.0.47';

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

/** Keeps copyright and Inixio dialog version labels in sync with SM_ASSET_VERSION. */
function bindAssetVersion() {
  const label = `v${CONFIG.version}`;
  qsa('[data-asset-version]').forEach((element) => {
    element.textContent = label;
  });
}

/** Developer credit dialog: open from the footer, close via button, backdrop or Escape. */
function initInixioModal() {
  const dialog = qs('[data-inixio-modal]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const closeBtn = qs('[data-close]', dialog);
  let lastTrigger = null;

  const open = (trigger) => {
    lastTrigger = trigger || null;
    document.body.classList.add('is-locked');
    if (!dialog.open) dialog.showModal();
    closeBtn?.focus();
  };

  const unlock = () => {
    document.body.classList.remove('is-locked');
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  };

  // Delegated so the footer credit stays clickable even if the node is re-rendered.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-inixio]');
    if (!trigger) return;
    event.preventDefault();
    open(trigger);
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
  });

  dialog.addEventListener('close', unlock);
}

async function init() {
  initTheme();
  qsa('[data-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
  bindAssetVersion();
  initInixioModal();

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

  try {
    if (data) initGrowthLab(data);
  } catch (error) {
    console.error('Growth Lab could not be initialised.', error);
  }

  initNavigation();
  animations.refresh();
  realignHash();

  initContact(data?.contact);
  if (data) setupCvLinks(data);

  initWelcome();

  loadAnalytics();
  registerServiceWorker();
}

/** Registers the offline/installable service worker (HTTPS or localhost only). */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register(`./sw.js?v=${CONFIG.version}`).catch(() => {
      // Offline support is optional; a failed registration must not break the site.
    });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}

init();
