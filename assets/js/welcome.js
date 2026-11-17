import { h, icon } from './components.js?v=1.0.47';
import { reducedMotion } from './utils.js?v=1.0.47';

/**
 * Non-modal welcome card: once per browser profile, 3s after load.
 * Defers when a <dialog> is open or the tab is hidden. Never traps focus
 * or locks scroll, so Growth Lab and other dialogs stay uninterrupted.
 */

const STORAGE_KEY = 'sm-welcome-v1';
const DELAY_MS = 3000;
const RETRY_MS = 400;
const EXIT_MS = 220;

let root = null;
let timer = null;
let cancelled = false;

function storageAvailable() {
  try {
    const probe = '__sm_welcome__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function hasBeenShown() {
  if (!storageAvailable()) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

function markShown() {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* Private mode quotas can fail mid-session; the visit still continues. */
  }
}

function blockingDialogOpen() {
  return Boolean(document.querySelector('dialog[open]'));
}

function clearTimer() {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}

function dismiss(card, { scrollToContact = false } = {}) {
  if (!card || card.dataset.closing === '1') return;
  card.dataset.closing = '1';

  const finish = () => {
    card.remove();
    if (root === card) root = null;
    if (scrollToContact) {
      const target = document.getElementById('contact');
      if (target) {
        target.scrollIntoView({
          behavior: reducedMotion.matches ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    }
  };

  if (reducedMotion.matches) {
    finish();
    return;
  }

  card.classList.remove('is-visible');
  card.classList.add('is-leaving');
  const done = () => finish();
  card.addEventListener('transitionend', done, { once: true });
  window.setTimeout(done, EXIT_MS);
}

function buildCard() {
  const closeBtn = h(
    'button',
    { type: 'button', class: 'welcome__close', 'aria-label': 'Dismiss welcome message' },
    icon('x'),
  );
  const connectBtn = h('button', { type: 'button', class: 'btn btn--primary btn--sm welcome__cta' }, "Let's Connect");
  const exploreBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm welcome__cta' }, 'Explore Portfolio');

  const card = h(
    'aside',
    {
      class: 'welcome',
      role: 'region',
      'aria-label': 'Welcome message',
      'data-welcome': '',
    },
    h(
      'header',
      { class: 'welcome__header' },
      h(
        'div',
        { class: 'welcome__heading' },
        h('p', { class: 'welcome__title', text: 'Welcome! 👋' }),
        h(
          'p',
          { class: 'welcome__status' },
          h('span', { class: 'welcome__status-dot', 'aria-hidden': 'true' }),
          h('span', { text: 'Open to Opportunities' }),
        ),
      ),
      closeBtn,
    ),
    h(
      'div',
      { class: 'welcome__body' },
      h(
        'p',
        {
          class: 'welcome__lead',
          text: "Hi, I'm Sabrina, a Business Development & Growth professional focused on building meaningful partnerships, creating qualified opportunities, and driving sustainable business growth.",
        },
      ),
      h(
        'p',
        {
          class: 'welcome__support text-muted',
          text: "I'm open to Business Development, Growth, and strategic partnership opportunities. Feel free to explore my work or connect to discuss how we can create value together.",
        },
      ),
    ),
    h('div', { class: 'welcome__actions' }, connectBtn, exploreBtn),
  );

  closeBtn.addEventListener('click', () => dismiss(card));
  exploreBtn.addEventListener('click', () => dismiss(card));
  connectBtn.addEventListener('click', () => dismiss(card, { scrollToContact: true }));

  return card;
}

function showWelcome() {
  if (cancelled || root || hasBeenShown()) return;
  if (document.hidden || blockingDialogOpen()) {
    timer = window.setTimeout(attemptShow, RETRY_MS);
    return;
  }

  markShown();
  const card = buildCard();
  root = card;
  document.body.append(card);

  if (reducedMotion.matches) {
    card.classList.add('is-visible');
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => card.classList.add('is-visible'));
  });
}

function attemptShow() {
  if (cancelled || hasBeenShown()) return;
  if (document.hidden || blockingDialogOpen()) {
    timer = window.setTimeout(attemptShow, RETRY_MS);
    return;
  }
  showWelcome();
}

function startCountdown() {
  if (cancelled || hasBeenShown()) return;
  clearTimer();
  timer = window.setTimeout(attemptShow, DELAY_MS);
}

/** Starts the once-per-browser welcome card after the window load event. */
export function initWelcome() {
  if (hasBeenShown()) return;

  const onLoad = () => startCountdown();
  if (document.readyState === 'complete') onLoad();
  else window.addEventListener('load', onLoad, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (cancelled || hasBeenShown() || root) return;
    if (!document.hidden && !blockingDialogOpen() && timer === null) {
      timer = window.setTimeout(attemptShow, RETRY_MS);
    }
  });
}
