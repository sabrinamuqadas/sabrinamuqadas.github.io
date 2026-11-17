import { debounce, onScroll, qs, qsa } from './utils.js?v=1.0.19';

const MOBILE_QUERY = window.matchMedia('(max-width: 71.99rem)');

/** Header state, scroll progress, scrollspy, sliding indicator and the mobile menu. */
export function initNavigation() {
  const header = qs('[data-header]');
  const nav = qs('[data-nav]');
  const toggle = qs('[data-menu-toggle]');
  const progressBar = qs('[data-scroll-progress]');
  const list = qs('.site-nav__list', nav);
  if (!header || !nav || !list) return;

  /* ---- Scroll: header style + progress ---- */
  onScroll((y) => {
    header.classList.toggle('is-scrolled', y > 24);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar?.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1).toFixed(4) : '0');
  });

  /* ---- Sliding active indicator ---- */
  const indicator = document.createElement('span');
  indicator.className = 'site-nav__indicator';
  indicator.setAttribute('aria-hidden', 'true');
  list.append(indicator);

  const moveIndicator = (link) => {
    if (!link || MOBILE_QUERY.matches) {
      list.style.setProperty('--indicator-w', '0px');
      return;
    }
    list.style.setProperty('--indicator-x', `${link.offsetLeft}px`);
    list.style.setProperty('--indicator-w', `${link.offsetWidth}px`);
  };

  /* ---- Scrollspy ---- */
  let activeLink = null;
  const setActive = (id) => {
    const next = qs(`.site-nav__link[href="#${id}"]`, nav);
    if (!next || next === activeLink) return;
    activeLink?.removeAttribute('aria-current');
    next.setAttribute('aria-current', 'true');
    activeLink = next;
    moveIndicator(next);
  };

  const sections = qsa('main section[id]').filter((section) => !section.hidden);
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  sections.forEach((section) => spy.observe(section));

  window.addEventListener('resize', debounce(() => moveIndicator(activeLink)));
  if (document.fonts?.ready) document.fonts.ready.then(() => moveIndicator(activeLink));

  /* ---- Mobile menu ---- */
  if (!toggle) return;
  const inertTargets = [qs('main'), qs('.site-footer')].filter(Boolean);

  const setMenu = (open, { restoreFocus = false } = {}) => {
    header.classList.toggle('is-menu-open', open);
    document.body.classList.toggle('is-locked', open);
    toggle.setAttribute('aria-expanded', String(open));
    inertTargets.forEach((target) => {
      target.inert = open;
    });
    if (!open && restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false, { restoreFocus: true });
    }
  });

  MOBILE_QUERY.addEventListener('change', (event) => {
    if (!event.matches) setMenu(false);
    moveIndicator(activeLink);
  });
}
