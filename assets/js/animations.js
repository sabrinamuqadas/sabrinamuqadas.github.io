import { CONFIG } from './config.js?v=1.0.15';
import { clamp, finePointer, onScroll, qs, qsa, reducedMotion } from './utils.js?v=1.0.15';

const { motion, features } = CONFIG;

/**
 * Motion layer. Everything here is progressive enhancement:
 * content is fully visible without it, and effects are skipped under prefers-reduced-motion.
 * Call the returned `refresh()` after rendering new DOM to pick up new elements.
 */
export function initAnimations() {
  const root = document.documentElement;

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: motion.revealThreshold, rootMargin: '0px 0px -6% 0px' },
  );

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);
      countUp(entry.target);
    });
  });

  /* Ambient decorative animation only runs while its container is on screen and the tab is visible. */
  const ambientObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting));
  });

  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('is-hidden', document.hidden);
  });

  /* ---- Scroll-driven: timeline progress and parallax ---- */
  const timelines = new Map();
  const parallaxItems = new Map();

  const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) timelines.set(entry.target, true);
      else timelines.delete(entry.target);
    });
  });

  const parallaxObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) parallaxItems.set(entry.target, Number(entry.target.dataset.parallax) || 0);
      else parallaxItems.delete(entry.target);
    });
  });

  onScroll(() => {
    const viewportMiddle = window.innerHeight / 2;

    timelines.forEach((_, element) => {
      const rect = element.getBoundingClientRect();
      const progress = clamp((viewportMiddle - rect.top) / rect.height, 0, 1);
      element.style.setProperty('--progress', progress.toFixed(4));
    });

    const parallaxOn = features.parallax && !reducedMotion.matches && window.innerWidth >= motion.parallaxMinWidth;
    parallaxItems.forEach((factor, element) => {
      if (!parallaxOn) {
        element.style.removeProperty('--py');
        return;
      }
      const rect = element.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - viewportMiddle) * -factor;
      element.style.setProperty('--py', `${offset.toFixed(1)}px`);
    });
  });

  /* ---- Pointer effects: one delegated listener for spotlight, tilt and magnetic buttons ---- */
  initPointerEffects();
  initRoleRotator();

  function refresh() {
    splitWords();

    qsa('[data-stagger]').forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', 'up');
        child.style.setProperty('--i', index);
      });
    });

    qsa('[data-reveal-delay]').forEach((element) => {
      element.style.setProperty('--i', element.dataset.revealDelay);
    });

    qsa('[data-reveal], [data-split]').forEach((element) => {
      if (element.dataset.bound) return;
      element.dataset.bound = 'true';
      if (reducedMotion.matches) element.classList.add('is-visible');
      else revealObserver.observe(element);
    });

    qsa('[data-count]').forEach((element) => {
      if (element.dataset.bound) return;
      element.dataset.bound = 'true';
      if (!reducedMotion.matches) {
        element.textContent = '0';
        counterObserver.observe(element);
      }
    });

    qsa('[data-ambient]').forEach((element) => {
      if (element.dataset.ambientBound) return;
      element.dataset.ambientBound = 'true';
      ambientObserver.observe(element);
    });

    qsa('[data-timeline]').forEach((element) => {
      if (element.dataset.timelineBound) return;
      element.dataset.timelineBound = 'true';
      timelineObserver.observe(element);
    });

    qsa('[data-parallax]').forEach((element) => {
      if (element.dataset.parallaxBound) return;
      element.dataset.parallaxBound = 'true';
      parallaxObserver.observe(element);
    });

    root.classList.add('is-ready');
  }

  return { refresh };
}

/** Wraps each word of [data-split] elements so it can slide up with a stagger. Idempotent. */
function splitWords() {
  qsa('[data-split]').forEach((element) => {
    if (element.dataset.splitDone === element.textContent) return;

    const words = element.textContent.trim().split(/\s+/);
    element.replaceChildren();
    words.forEach((word, index) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word__inner';
      inner.style.setProperty('--w', index);
      inner.textContent = word;
      outer.append(inner);
      element.append(outer);
      if (index < words.length - 1) element.append(' ');
    });
    element.dataset.splitDone = element.textContent;
  });
}

/** Animates an integer from 0 up to the number found in data-count. */
function countUp(element) {
  const target = Number(element.dataset.count);
  if (!Number.isFinite(target)) return;

  const start = performance.now();
  const duration = motion.counterDurationMs;

  const tick = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - (1 - t) ** 3;
    element.textContent = String(Math.round(target * eased));
    if (t < 1) window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
}

function initPointerEffects() {
  if (!finePointer.matches) return;

  let pending = null;
  let magnetic = null;
  let tilted = null;
  let frame = 0;

  const reset = (element) => {
    element.style.removeProperty('--tx');
    element.style.removeProperty('--ty');
    element.style.removeProperty('--rx');
    element.style.removeProperty('--ry');
  };

  const process = () => {
    frame = 0;
    const event = pending;
    pending = null;
    if (!event || reducedMotion.matches) return;

    const target = event.target instanceof Element ? event.target : null;

    const spotlight = target?.closest('[data-spotlight]');
    if (spotlight) {
      const rect = spotlight.getBoundingClientRect();
      spotlight.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      spotlight.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }

    const magnet = features.magneticButtons ? target?.closest('[data-magnetic]') : null;
    if (magnetic && magnetic !== magnet) reset(magnetic);
    if (magnet) {
      const rect = magnet.getBoundingClientRect();
      magnet.style.setProperty('--tx', `${((event.clientX - rect.left - rect.width / 2) * 0.22).toFixed(1)}px`);
      magnet.style.setProperty('--ty', `${((event.clientY - rect.top - rect.height / 2) * 0.3).toFixed(1)}px`);
    }
    magnetic = magnet;

    const tilt = features.cardTilt ? target?.closest('[data-tilt]') : null;
    if (tilted && tilted !== tilt) reset(tilted);
    if (tilt) {
      const rect = tilt.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tilt.style.setProperty('--ry', `${(px * 6).toFixed(2)}deg`);
      tilt.style.setProperty('--rx', `${(py * -6).toFixed(2)}deg`);
    }
    tilted = tilt;
  };

  document.addEventListener(
    'pointermove',
    (event) => {
      pending = event;
      if (!frame) frame = window.requestAnimationFrame(process);
    },
    { passive: true },
  );

  document.documentElement.addEventListener('pointerleave', () => {
    if (magnetic) reset(magnetic);
    if (tilted) reset(tilted);
    magnetic = null;
    tilted = null;
  });
}

/** Rotates the hero role labels. Runs only while visible, and never under reduced motion. */
function initRoleRotator() {
  const rotator = qs('[data-role-rotator]');
  if (!rotator || !features.rotateRoles) return;

  let index = 0;
  let timer = 0;
  let visible = false;

  const items = () => qsa('.role-rotator__item', rotator);

  const show = (next) => {
    const list = items();
    index = next % list.length;
    list.forEach((item, i) => item.classList.toggle('is-active', i === index));
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };

  const sync = () => {
    const shouldRun = visible && !document.hidden && !reducedMotion.matches && items().length > 1;
    rotator.classList.toggle('is-rotating', !reducedMotion.matches);
    if (shouldRun && !timer) timer = window.setInterval(() => show(index + 1), motion.roleIntervalMs);
    if (!shouldRun) stop();
  };

  show(0);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(rotator);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
}
