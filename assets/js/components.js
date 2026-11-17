import { CONFIG } from './config.js?v=1.0.47';
import { getPath, qs, qsa, reducedMotion } from './utils.js?v=1.0.47';

/* ==========================================================================
   DOM helpers. All dynamic content is created with createElement/textContent,
   so nothing from portfolio.json is ever parsed as HTML.
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Allows relative/hash links and a short list of safe protocols; anything else becomes "#". */
function safeHref(url) {
  const value = String(url);
  if (/^(#|\.{0,2}\/)/.test(value)) return value;
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol) ? value : '#';
  } catch {
    return '#';
  }
}

function appendAll(parent, children) {
  children.flat(Infinity).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
}

/**
 * Tiny hyperscript helper.
 * props: class, text, href, style (custom properties), dataset, or any attribute.
 */
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);

  Object.entries(props).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'class') element.className = value;
    else if (key === 'text') element.textContent = value;
    else if (key === 'href') element.setAttribute('href', safeHref(value));
    else if (key === 'dataset') Object.entries(value).forEach(([name, item]) => (element.dataset[name] = item));
    else if (key === 'style') Object.entries(value).forEach(([name, item]) => element.style.setProperty(name, item));
    else element.setAttribute(key, value === true ? '' : value);
  });

  appendAll(element, children);
  return element;
}

function svgElement(tag, attributes) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

/** Creates an icon from the shared sprite. brand-* glyphs are filled, everything else is stroked. */
export function icon(name, extraClass = '') {
  const svg = svgElement('svg', {
    class: ['icon', name.startsWith('brand-') && 'icon--fill', extraClass].filter(Boolean).join(' '),
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.append(svgElement('use', { href: `${CONFIG.assets.sprite}#${name}` }));
  return svg;
}

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const externalProps = (external) => (external ? { target: '_blank', rel: 'noopener noreferrer' } : {});

const sectionEnabled = (data, key) =>
  key === null ||
  key === undefined ||
  (data.sectionVisibility[key] !== false && !(key === 'projects' && data.projects.length === 0));

/* ==========================================================================
   Page-level binding
   ========================================================================== */

/** Normalizes copy for comparison so split headlines with `|` line breaks still match rendered text. */
function normalizeBindText(value) {
  return String(value).replace(/\|/g, ' ').trim().replace(/\s+/g, ' ');
}

/** Fills [data-bind="path.to.value"] elements, leaving them untouched when the text already matches. */
function bindText(data) {
  qsa('[data-bind]').forEach((element) => {
    const value = getPath(data, element.dataset.bind);
    if (typeof value !== 'string' || normalizeBindText(element.textContent) === normalizeBindText(value)) return;
    element.textContent = value;
    delete element.dataset.splitDone;
  });
}

function applySectionVisibility(data) {
  qsa('[data-section]').forEach((section) => {
    section.hidden = !sectionEnabled(data, section.dataset.section);
  });
}

/** Photos sit over a monogram placeholder; a photo that fails to load is dropped so the placeholder shows. */
function keepPlaceholderOnError(img, onFail) {
  const fail = () => {
    img.remove();
    onFail?.();
  };
  if (img.complete && img.naturalWidth === 0) fail();
  else img.addEventListener('error', fail, { once: true });
}

/** Hero: profile photo (when provided) and the rotating role labels. */
function bindHero(data) {
  const { photo, photoAlt, roles } = data.profile;

  const portrait = qs('.hero__visual .portrait');
  if (photo && portrait) {
    const src = CONFIG.assets.withVersion(photo);
    let img = qs('.portrait__img', portrait);
    if (!img) {
      img = h('img', { class: 'portrait__img', decoding: 'async', fetchpriority: 'high' });
      portrait.append(img);
    }
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    img.alt = photoAlt || '';
    portrait.classList.add('has-photo');
    portrait.removeAttribute('aria-hidden');
    keepPlaceholderOnError(img, () => {
      portrait.classList.remove('has-photo');
      portrait.setAttribute('aria-hidden', 'true');
    });
  }

  const rotator = qs('[data-role-rotator]');
  if (rotator && roles.join('|') !== qsa('.role-rotator__item', rotator).map((item) => item.textContent).join('|')) {
    rotator.replaceChildren(...roles.map((role) => h('span', { class: 'role-rotator__item', text: role })));
  }
}

/** Switches CV buttons to a "Request CV" email link when the PDF is not on the server yet. */
export async function setupCvLinks(data) {
  const { cv } = data.profile;
  let available = true;

  if (CONFIG.features.verifyCvFile) {
    try {
      const response = await fetch(new URL(cv.file, document.baseURI), { method: 'HEAD' });
      available = response.ok;
    } catch {
      available = false;
    }
  }

  qsa('[data-cv-link]').forEach((link) => {
    const label = qs('[data-cv-label]', link);
    if (available) {
      link.setAttribute('href', cv.file);
      link.setAttribute('download', '');
      if (label) label.textContent = cv.label;
    } else {
      link.removeAttribute('download');
      link.setAttribute('href', `mailto:${data.contact.email}?subject=${encodeURIComponent(cv.requestSubject)}`);
      if (label) label.textContent = cv.requestLabel;
    }
  });
}

export function showDataNotice() {
  const notice = h('p', {
    class: 'data-notice',
    role: 'status',
    text: 'Some sections could not be loaded, so a simplified version is shown. Please refresh the page, or use the contact details below.',
  });
  qs('#snapshot')?.before(notice);
}

/* ==========================================================================
   Shared interactive pattern: disclosure (expand / collapse)
   ========================================================================== */

function bindDisclosures(container) {
  container.addEventListener('click', (event) => {
    const toggle = event.target.closest('.disclosure__toggle');
    if (!toggle || !container.contains(toggle)) return;

    const host = toggle.closest('[data-disclosure]');
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    const open = toggle.getAttribute('aria-expanded') !== 'true';

    toggle.setAttribute('aria-expanded', String(open));
    host.classList.toggle('is-open', open);
    panel.inert = !open;
    qs('.disclosure__label', toggle).textContent = open ? toggle.dataset.openLabel : toggle.dataset.closedLabel;
  });
}

function disclosure({ id, open, openLabel, closedLabel, content }) {
  const panelId = `${id}-panel`;
  const toggle = h(
    'button',
    {
      class: 'disclosure__toggle',
      type: 'button',
      'aria-expanded': String(open),
      'aria-controls': panelId,
      dataset: { openLabel, closedLabel },
    },
    h('span', { class: 'disclosure__label', text: open ? openLabel : closedLabel }),
    icon('plus'),
  );
  const panel = h(
    'div',
    { class: 'disclosure__panel', id: panelId, inert: !open },
    h('div', { class: 'disclosure__inner' }, content),
  );
  return { toggle, panel };
}

/* ==========================================================================
   Section renderers: each receives its container and the full data set
   ========================================================================== */

function renderNav(list, data) {
  const items = data.navigation.filter((item) => !item.footerOnly && sectionEnabled(data, item.section));
  list.replaceChildren(
    ...items.map((item) => h('li', {}, h('a', { class: 'site-nav__link', href: item.href, text: item.label }))),
  );
}

function renderFooterNav(list, data) {
  const items = data.navigation.filter(
    (item) => item.section && item.section !== 'contact' && sectionEnabled(data, item.section),
  );
  list.replaceChildren(...items.map((item) => h('li', {}, h('a', { href: item.href, text: item.label }))));
}

function renderSocialLinks(list, data) {
  list.replaceChildren(
    ...data.socialLinks
      .filter((link) => link.enabled)
      .map((link) =>
        h(
          'li',
          {},
          h('a', { class: 'social-link', href: link.url, 'aria-label': link.label, ...externalProps(true) }, icon(link.icon)),
        ),
      ),
  );
}

const countFor = {
  roles: (data) => data.experience.reduce((total, group) => total + group.roles.length, 0),
  employers: (data) => data.experience.length,
  channels: (data) => data.channels.length,
  markets: (data) => data.markets.length,
  industries: (data) => data.industries.length,
  tools: (data) => data.tools.length,
};

function renderHighlights(container, data) {
  const cards = data.highlights.map((item) => {
    const value = item.stat ? countFor[item.stat.count]?.(data) : null;
    return h(
      'article',
      { class: 'highlight-card', dataset: { spotlight: '' } },
      h(
        'div',
        { class: 'highlight-card__top' },
        h('span', { class: 'icon-box' }, icon(item.icon)),
        value !== null &&
          h(
            'p',
            { class: 'stat' },
            h('span', { class: 'stat__value', dataset: { count: value }, text: String(value) }),
            h('span', { class: 'stat__label', text: item.stat.label }),
          ),
      ),
      h('h3', { class: 'highlight-card__title', text: item.title }),
      h('p', { class: 'highlight-card__text text-muted', text: item.text }),
    );
  });

  const markets = h(
    'div',
    { class: 'market-strip', dataset: { reveal: 'up' } },
    h('p', { class: 'market-strip__label mono', text: 'International markets' }),
    h(
      'ul',
      { class: 'market-strip__list' },
      ...data.markets.map((market) =>
        h(
          'li',
          { class: 'market-chip' },
          h('span', { class: 'market-chip__code mono', text: market.code }),
          h('span', { text: market.name }),
        ),
      ),
    ),
  );

  container.replaceChildren(h('div', { class: 'highlights', dataset: { stagger: '' } }, ...cards), markets);
}

function renderAboutAside(container, data) {
  const { name } = data.profile;
  const { aside, visual, visualAlt } = data.about;
  const cover = visual || data.profile.photo;
  const coverAlt = visualAlt || data.profile.photoAlt || name;

  const coverImg = cover
    ? h('img', {
        src: CONFIG.assets.withVersion(cover),
        alt: coverAlt,
        loading: 'lazy',
        decoding: 'async',
      })
    : null;
  if (coverImg) keepPlaceholderOnError(coverImg);

  const frameContent = [h('span', { class: 'monogram', 'aria-hidden': 'true', text: initialsOf(name) }), coverImg];

  container.replaceChildren(
    h(
      'div',
      { class: 'about-visual' },
      h('span', { class: 'about-visual__layer about-visual__layer--back', 'aria-hidden': 'true' }),
      h('span', { class: 'about-visual__layer about-visual__layer--mid', 'aria-hidden': 'true' }),
      h('div', { class: 'about-visual__frame' }, frameContent),
    ),
    h(
      'div',
      { class: 'career' },
      h('h3', { class: 'career__title mono', text: aside.title }),
      h(
        'ol',
        { class: 'career__steps' },
        ...aside.steps.map((step) =>
          h(
            'li',
            { class: step.current ? 'career__step career__step--current' : 'career__step' },
            h('span', { class: 'career__dot', 'aria-hidden': 'true' }),
            h(
              'div',
              {},
              h('strong', { text: step.label }),
              h('span', { class: 'career__role', text: step.role }),
              h('span', { class: 'career__period mono', text: step.period }),
            ),
          ),
        ),
      ),
      h('p', { class: 'career__caption text-muted', text: aside.caption }),
    ),
  );
}

function renderAboutStory(container, data) {
  container.replaceChildren(
    ...data.about.story.map((paragraph, index) => h('p', { class: index === 0 ? 'about__lead' : null, text: paragraph })),
  );
}

function renderAboutFacts(container, data) {
  container.replaceChildren(
    ...data.about.facts.map((fact) =>
      h(
        'div',
        { class: 'fact' },
        icon(fact.icon),
        h('div', {}, h('dt', { class: 'fact__label mono', text: fact.label }), h('dd', { class: 'fact__value', text: fact.value })),
      ),
    ),
  );
}

function renderAboutPillars(container, data) {
  container.replaceChildren(
    ...data.about.pillars.map((pillar) =>
      h(
        'article',
        { class: 'pillar' },
        h('span', { class: 'icon-box icon-box--sm' }, icon(pillar.icon)),
        h('h3', { class: 'pillar__title', text: pillar.title }),
        h('p', { class: 'text-muted', text: pillar.text }),
      ),
    ),
  );
}

function renderExpertise(container, data) {
  const PREVIEW_TAGS = 3;

  const tiles = data.expertise.map((category, index) => {
    const { toggle, panel } = disclosure({
      id: `expertise-${category.id}`,
      open: false,
      openLabel: 'Show less',
      closedLabel: 'Explore',
      content: [
        h('p', { class: 'tile__details', text: category.details }),
        h('ul', { class: 'check-list' }, ...category.items.map((item) => h('li', {}, icon('check'), item))),
      ],
    });

    const extra = category.items.length - PREVIEW_TAGS;

    return h(
      'article',
      { class: `bento__tile bento__tile--${index + 1}`, dataset: { spotlight: '', disclosure: '' } },
      h(
        'div',
        { class: 'tile__top' },
        h('span', { class: 'icon-box' }, icon(category.icon)),
        h('span', { class: 'tile__focus mono', text: category.focus }),
      ),
      h('h3', { class: 'tile__title', text: category.title }),
      h('p', { class: 'tile__summary text-muted', text: category.summary }),
      h(
        'ul',
        { class: 'tag-list', 'aria-label': 'Highlights' },
        // Wide tiles (see CSS) have room to show every item; narrow tiles show a preview + "+N more".
        ...category.items.map((item, i) => h('li', { class: i < PREVIEW_TAGS ? 'tag' : 'tag tag--extra', text: item })),
        extra > 0 && h('li', { class: 'tag tag--more', text: `+${extra} more` }),
      ),
      toggle,
      panel,
    );
  });

  container.replaceChildren(...tiles);
  bindDisclosures(container);
}

/** "Label: text" bullets get a bold lead-in so recruiters can scan responsibilities quickly. */
function labelled(text) {
  const match = text.match(/^([^:.]{3,40}):\s+(.+)$/);
  return match ? h('span', {}, h('strong', { class: 'check-list__label', text: match[1] }), ` ${match[2]}`) : text;
}

const roleAnchor = (group, index) => `role-${group.id}-${index}`;
const monthIndex = (value) => {
  const [year, month] = value.split('-').map(Number);
  return year * 12 + (month - 1);
};

/** Gantt-style overview of every role. Overlapping roles are stacked in separate lanes. */
function renderCareerChart(data) {
  const now = new Date();
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const items = data.experience.flatMap((group) =>
    group.roles.map((role, index) => ({
      role,
      anchor: roleAnchor(group, index),
      from: monthIndex(role.start),
      // End months are inclusive, so the bar runs to the end of that month.
      to: (role.end ? monthIndex(role.end) : nowIndex) + 1,
    })),
  );

  const rangeStart = Math.floor(Math.min(...items.map((item) => item.from)) / 12) * 12;
  const rangeEnd = (Math.floor(nowIndex / 12) + 1) * 12;
  const span = rangeEnd - rangeStart;

  const laneEnds = [];
  [...items]
    .sort((a, b) => a.from - b.from)
    .forEach((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.from);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = item.to;
      item.lane = lane;
    });

  const years = Array.from({ length: span / 12 }, (_, i) => rangeStart / 12 + i);
  const percent = (value) => `${((value - rangeStart) / span) * 100}%`;
  const first = years[0];
  const last = years[years.length - 1];

  return h(
    'figure',
    { class: 'career-chart', dataset: { reveal: 'up' } },
    h('figcaption', { class: 'career-chart__title mono', text: `Career path, ${first} – ${last}` }),
    h(
      'div',
      { class: 'career-chart__plot', style: { '--lanes': laneEnds.length } },
      ...years.map((year) =>
        h('span', { class: 'career-chart__year mono', 'aria-hidden': 'true', style: { '--x': percent(year * 12) }, text: String(year) }),
      ),
      h(
        'ol',
        { class: 'career-chart__bars' },
        ...items.map((item) =>
          h(
            'li',
            { style: { '--x': percent(item.from), '--w': `${((item.to - item.from) / span) * 100}%`, '--lane': item.lane } },
            h(
              'a',
              {
                class: `career-bar${item.role.current ? ' career-bar--current' : ''}${item.role.concurrent ? ' career-bar--concurrent' : ''}`,
                href: `#${item.anchor}`,
                title: `${item.role.title} (${item.role.period})`,
                'aria-label': `${item.role.title}, ${item.role.period}`,
                text: item.role.short ?? item.role.title,
              },
            ),
          ),
        ),
      ),
    ),
  );
}

function renderExperienceRole(group, role, index, groupIndex) {
  // The most recent role starts expanded; the rest are one click away.
  const open = groupIndex === 0 && index === 0;
  const id = `${group.id}-role-${index}`;

  const { toggle, panel } = disclosure({
    id,
    open,
    openLabel: 'Hide details',
    closedLabel: 'Responsibilities & tools',
    content: [
      h('p', { class: 'exp-role__sub mono', text: 'Key responsibilities' }),
      h('ul', { class: 'check-list' }, ...role.responsibilities.map((item) => h('li', {}, icon('check'), labelled(item)))),
      h('p', { class: 'exp-role__sub mono', text: 'Skills' }),
      h('ul', { class: 'tag-list' }, ...role.skills.map((skill) => h('li', { class: 'tag', text: skill }))),
      h('p', { class: 'exp-role__sub mono', text: 'Tools' }),
      h('ul', { class: 'tag-list' }, ...role.tools.map((tool) => h('li', { class: 'tag tag--tool', text: tool }))),
    ],
  });

  return h(
    'article',
    { class: `exp-role${open ? ' is-open' : ''}`, id: roleAnchor(group, index), dataset: { disclosure: '' } },
    h(
      'div',
      { class: 'exp-role__top' },
      h(
        'div',
        { class: 'exp-role__badges' },
        h('span', { class: 'badge', text: role.badge }),
        role.current && h('span', { class: 'badge badge--live', text: 'Current' }),
        role.concurrent && h('span', { class: 'badge badge--soft', text: 'Concurrent' }),
      ),
      h('span', { class: 'exp-role__period mono' }, icon('calendar'), role.period),
    ),
    h('h4', { class: 'exp-role__title', text: role.title }),
    role.level && h('p', { class: 'exp-role__level', text: role.level }),
    h('p', { class: 'exp-role__overview text-muted', text: role.overview }),
    toggle,
    panel,
  );
}

function renderExperience(container, data) {
  const groups = data.experience.map((group, groupIndex) => {
    const roles = group.roles.map((role, index) => renderExperienceRole(group, role, index, groupIndex));

    // A progression marker sits between roles inside the same organisation.
    const withProgression = roles.flatMap((role, index) =>
      index > 0 && group.progression
        ? [h('div', { class: 'exp-progress' }, icon('arrow-up'), h('span', { text: group.progression })), role]
        : [role],
    );

    return h(
      'li',
      { class: 'exp-group', dataset: { reveal: 'up' } },
      h('span', { class: 'exp-group__marker', 'aria-hidden': 'true' }),
      h(
        'header',
        { class: 'exp-group__head' },
        h('span', { class: 'mark-tile', 'aria-hidden': 'true', text: group.mark }),
        h(
          'div',
          {},
          h('h3', { class: 'exp-group__company', text: group.company }),
          h('p', { class: 'exp-group__meta' }, icon('map-pin'), `${group.location} · ${group.period}`),
        ),
      ),
      h('div', { class: 'exp-group__roles' }, ...withProgression),
    );
  });

  const chart = renderCareerChart(data);
  const timeline = h(
    'div',
    { class: 'timeline', dataset: { timeline: '' } },
    h('span', { class: 'timeline__rail', 'aria-hidden': 'true' }, h('span', { class: 'timeline__progress' })),
    h('ol', { class: 'timeline__list' }, ...groups),
  );

  container.replaceChildren(chart, timeline);
  bindDisclosures(container);

  // Chart bars jump to a role card and expand it if it is collapsed.
  chart.addEventListener('click', (event) => {
    const bar = event.target.closest('.career-bar');
    if (!bar) return;
    const card = document.getElementById(bar.getAttribute('href').slice(1));
    const toggle = card && qs('.disclosure__toggle', card);
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
  });
}

function renderGrowthStrategy(container, data) {
  const stages = data.growthStrategy;
  const panel = h('div', { class: 'lifecycle__panel', id: 'stage-panel', role: 'tabpanel', tabindex: '0' });

  const tabs = stages.map((stage, index) =>
    h(
      'button',
      {
        class: 'stage-tab',
        type: 'button',
        role: 'tab',
        id: `stage-tab-${stage.id}`,
        'aria-selected': String(index === 0),
        'aria-controls': 'stage-panel',
        tabindex: index === 0 ? '0' : '-1',
        style: { '--i': index },
      },
      h('span', { class: 'stage-tab__num mono', text: String(index + 1).padStart(2, '0') }),
      icon(stage.icon),
      h('span', { class: 'stage-tab__label', text: stage.title }),
    ),
  );

  const tablist = h(
    'div',
    { class: 'lifecycle__tabs', role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': 'Business development stages' },
    ...tabs,
  );

  const drawPanel = (index, { animate = true } = {}) => {
    const stage = stages[index];
    const ring = svgElement('svg', { class: 'ring', viewBox: '0 0 64 64', 'aria-hidden': 'true' });
    ring.append(
      svgElement('circle', { class: 'ring__track', cx: 32, cy: 32, r: 28, pathLength: 1 }),
      svgElement('circle', { class: 'ring__value', cx: 32, cy: 32, r: 28, pathLength: 1 }),
    );
    ring.style.setProperty('--offset', String(1 - (index + 1) / stages.length));

    panel.setAttribute('aria-labelledby', tabs[index].id);
    panel.replaceChildren(
      h(
        'div',
        { class: 'stage-detail__head' },
        h('span', { class: 'stage-detail__ring' }, ring, icon(stage.icon)),
        h(
          'div',
          {},
          h('p', { class: 'mono stage-detail__step', text: `Stage ${index + 1} of ${stages.length}` }),
          h('h3', { class: 'stage-detail__title', text: stage.title }),
        ),
      ),
      stage.channels?.length > 0 &&
        h(
          'ul',
          { class: 'channel-tags', 'aria-label': 'Channels used in this stage' },
          ...stage.channels.map((id) => {
            const channel = data.channels.find((item) => item.id === id);
            return channel && h('li', { class: 'channel-tag' }, icon(channel.icon), channel.label);
          }),
        ),
      h('p', { class: 'stage-detail__description', text: stage.description }),
      h('p', { class: 'mono stage-detail__label', text: 'Key activities' }),
      h('ul', { class: 'check-list' }, ...stage.activities.map((item) => h('li', {}, icon('check'), item))),
      h(
        'div',
        { class: 'stage-detail__outcome' },
        icon('target'),
        h('div', {}, h('p', { class: 'mono', text: 'Purpose' }), h('p', { text: stage.outcome })),
      ),
    );

    // Opacity only — vertical motion here was shifting the page every autoplay tick.
    if (animate && !reducedMotion.matches) {
      panel.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 280, easing: EASE });
    }
  };

  /** Keep the panel tall enough for every stage so autoplay never resizes the page. */
  const lockPanelHeight = () => {
    const previous = current;
    panel.style.minHeight = '';
    let max = 0;
    stages.forEach((_, index) => {
      drawPanel(index, { animate: false });
      max = Math.max(max, panel.getBoundingClientRect().height);
    });
    panel.style.minHeight = `${Math.ceil(max)}px`;
    drawPanel(previous, { animate: false });
  };

  const AUTO_MS = 3000;
  let current = 0;
  let timer = null;
  const pauseReasons = new Set();

  const lifecycle = h(
    'div',
    {
      class: 'lifecycle',
      dataset: { reveal: 'up' },
      style: { '--auto-ms': `${AUTO_MS}ms` },
    },
    tablist,
    panel,
  );

  const restartProgress = () => {
    lifecycle.classList.remove('is-playing');
    // Force a reflow so the progress animation restarts from zero.
    void lifecycle.offsetWidth;
    if (!pauseReasons.size && !document.hidden) lifecycle.classList.add('is-playing');
  };

  const stopAuto = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    lifecycle.classList.remove('is-playing');
  };

  const startAuto = () => {
    stopAuto();
    if (pauseReasons.size || document.hidden) return;
    restartProgress();
    timer = window.setInterval(() => {
      current = (current + 1) % stages.length;
      select(current);
    }, AUTO_MS);
  };

  const setPaused = (reason, paused) => {
    if (paused) pauseReasons.add(reason);
    else pauseReasons.delete(reason);
    lifecycle.classList.toggle('is-paused', pauseReasons.size > 0);
    if (pauseReasons.size || document.hidden) stopAuto();
    else startAuto();
  };

  const select = (index, { focus = false, user = false, animate = true } = {}) => {
    current = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    drawPanel(index, { animate });
    container.style.setProperty('--stage', index);
    if (focus) tabs[index].focus();
    if (user) setPaused('interact', true);
    else restartProgress();
  };

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) return;
    select(tabs.indexOf(tab), { user: true });
  });

  tablist.addEventListener('keydown', (event) => {
    const active = tabs.indexOf(document.activeElement);
    if (active < 0) return;
    const last = tabs.length - 1;
    const moves = {
      ArrowDown: active === last ? 0 : active + 1,
      ArrowRight: active === last ? 0 : active + 1,
      ArrowUp: active === 0 ? last : active - 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key], { focus: true, user: true });
  });

  // Hover or keyboard focus pauses autoplay; leaving the block resumes it.
  lifecycle.addEventListener('pointerenter', () => setPaused('hover', true));
  lifecycle.addEventListener('pointerleave', () => {
    setPaused('hover', false);
    setPaused('interact', false);
  });
  lifecycle.addEventListener('focusin', () => setPaused('focus', true));
  lifecycle.addEventListener('focusout', (event) => {
    if (lifecycle.contains(event.relatedTarget)) return;
    setPaused('focus', false);
    setPaused('interact', false);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto();
    else if (!pauseReasons.size) startAuto();
  });

  container.replaceChildren(lifecycle);
  select(0, { animate: false });
  lockPanelHeight();
  let resizeTimer = 0;
  window.addEventListener(
    'resize',
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(lockPanelHeight, 150);
    },
    { passive: true },
  );
  // Autoplay is off when the visitor prefers reduced motion; tabs still work manually.
  if (!reducedMotion.matches) startAuto();
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) stopAuto();
    else if (!pauseReasons.size) startAuto();
  });
}

/** Marker positions are percentages of the map; arcs are drawn in the map's 1000 x 397 coordinate space. */
function renderMarkets(container, data) {
  const MAP_W = 1000;
  const MAP_H = 397;
  const home = data.profile.mapPosition;
  const toPoint = (position) => [(position.x / 100) * MAP_W, (position.y / 100) * MAP_H];
  const [hx, hy] = toPoint(home);

  const arcs = data.markets.map((market) => {
    const [mx, my] = toPoint(market.map);
    const lift = Math.hypot(mx - hx, my - hy) * 0.28;
    const control = `${(hx + mx) / 2} ${(hy + my) / 2 - lift}`;
    return svgElement('path', {
      class: 'world-map__arc draw',
      d: `M${hx.toFixed(1)} ${hy.toFixed(1)} Q${control} ${mx.toFixed(1)} ${my.toFixed(1)}`,
      pathLength: 1,
      'data-market': market.id,
    });
  });

  const arcLayer = svgElement('svg', {
    class: 'world-map__arcs',
    viewBox: `0 0 ${MAP_W} ${MAP_H}`,
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
  });
  arcLayer.append(...arcs);

  const markers = data.markets.map((market) =>
    h(
      'button',
      {
        class: 'map-marker',
        type: 'button',
        'aria-label': `${market.name}: ${market.text}`,
        dataset: { market: market.id, label: market.map.label ?? 'top' },
        style: { left: `${market.map.x}%`, top: `${market.map.y}%` },
      },
      h('span', { class: 'map-marker__pulse', 'aria-hidden': 'true' }),
      h('span', { class: 'map-marker__dot', 'aria-hidden': 'true' }),
      h('span', { class: 'map-marker__label mono', 'aria-hidden': 'true', text: market.code }),
    ),
  );

  const map = h(
    'div',
    { class: 'world-map', role: 'group', 'aria-label': 'World map showing target markets', dataset: { reveal: 'scale', ambient: '' } },
    h('span', {
      class: 'world-map__dots',
      'aria-hidden': 'true',
      style: { '--map-url': `url("${new URL(CONFIG.assets.worldMap, document.baseURI).href}")` },
    }),
    arcLayer,
    h(
      'span',
      { class: 'world-map__home', style: { left: `${home.x}%`, top: `${home.y}%` }, 'aria-hidden': 'true' },
      h('span', { class: 'world-map__home-label mono', text: data.profile.location.split(',')[0] }),
    ),
    ...markers,
  );

  const cards = data.markets.map((market) =>
    h(
      'li',
      { class: 'market-card', tabindex: '0', dataset: { market: market.id } },
      h('span', { class: 'market-card__code mono', text: market.code }),
      h('div', {}, h('h3', { class: 'market-card__name', text: market.name }), h('p', { class: 'text-muted', text: market.text })),
    ),
  );

  const groups = data.industryGroups.map((group) =>
    h(
      'div',
      { class: `industry-group industry-group--${group.id}` },
      h('h3', { class: 'industry-group__title', text: group.title }),
      h('p', { class: 'industry-group__text text-muted', text: group.text }),
      h(
        'ul',
        { class: 'industry-list' },
        ...data.industries
          .filter((industry) => industry.group === group.id)
          .map((industry) => h('li', { class: 'industry-chip' }, icon(industry.icon), industry.title)),
      ),
    ),
  );

  const stage = h(
    'div',
    { class: 'markets__layout' },
    map,
    h('ul', { class: 'market-cards', dataset: { stagger: '' } }, ...cards),
  );
  const industries = h('div', { class: 'industries', dataset: { stagger: '' } }, ...groups);

  container.replaceChildren(stage, industries);

  // Hovering or focusing a marker or card highlights its counterpart.
  const setActive = (id) => {
    qsa('[data-market]', container).forEach((element) => element.classList.toggle('is-active', element.dataset.market === id));
  };
  stage.addEventListener('pointerover', (event) => setActive(event.target.closest('[data-market]')?.dataset.market));
  stage.addEventListener('focusin', (event) => setActive(event.target.closest('[data-market]')?.dataset.market));
  stage.addEventListener('click', (event) => setActive(event.target.closest('[data-market]')?.dataset.market));
  stage.addEventListener('pointerleave', () => setActive(null));
  setActive(null);
}

function toolMonogram(name) {
  const words = name.split(/[\s.]+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return name[0].toUpperCase() + name[1].toLowerCase();
}

function toolIcon(tool) {
  const box = h('span', { class: 'tool-icon', 'aria-hidden': 'true', style: { '--brand': tool.color } });
  if (tool.icon) {
    box.classList.add('tool-icon--mask');
    const iconHref = CONFIG.assets.withVersion(CONFIG.assets.toolIcons + tool.icon);
    box.style.setProperty('--icon-url', `url("${new URL(iconHref, document.baseURI).href}")`);
  } else {
    box.append(h('span', { class: 'tool-icon__mono', text: toolMonogram(tool.name) }));
  }
  return box;
}

function renderTools(container, data) {
  const categories = [...new Set(data.tools.map((tool) => tool.category))];

  const cards = data.tools.map((tool, index) => {
    const tipId = `tool-tip-${index}`;
    return h(
      'li',
      { class: 'tool-card', tabindex: '0', 'aria-describedby': tipId, dataset: { category: tool.category } },
      toolIcon(tool),
      h('div', { class: 'tool-card__body' }, h('h3', { class: 'tool-card__name', text: tool.name }), h('p', { class: 'tool-card__category mono', text: tool.category })),
      h('p', { class: 'tool-card__tip', id: tipId, role: 'tooltip', text: tool.description }),
    );
  });

  const filterOptions = [{ id: 'all', label: 'All', count: data.tools.length }].concat(
    categories.map((category) => ({
      id: category,
      label: category,
      count: data.tools.filter((tool) => tool.category === category).length,
    })),
  );

  const buttons = filterOptions.map((option, index) =>
    h(
      'button',
      { class: 'chip-btn', type: 'button', 'aria-pressed': String(index === 0), dataset: { filter: option.id } },
      option.label,
      h('span', { class: 'chip-btn__count', text: String(option.count) }),
    ),
  );

  const status = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const grid = h('ul', { class: 'tool-grid' }, ...cards);
  const filters = h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Filter tools by category' }, ...buttons);

  let token = 0;
  const applyFilter = async (category) => {
    const current = ++token;
    const duration = reducedMotion.matches ? 0 : CONFIG.motion.filterDurationMs;
    const matches = (card) => category === 'all' || card.dataset.category === category;

    const leaving = cards.filter((card) => !card.hidden && !matches(card));
    await Promise.all(
      leaving.map(
        (card) =>
          card.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.94)' }], { duration, easing: EASE }).finished.catch(() => {}),
      ),
    );
    if (current !== token) return;

    leaving.forEach((card) => {
      card.hidden = true;
    });
    let order = 0;
    cards.filter(matches).forEach((card) => {
      const wasHidden = card.hidden;
      card.hidden = false;
      if (wasHidden && duration) {
        card.animate(
          [
            { opacity: 0, transform: 'translateY(10px) scale(0.96)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: duration * 1.6, delay: order++ * 22, easing: EASE, fill: 'backwards' },
        );
      }
    });

    const shown = cards.filter(matches).length;
    status.textContent = `Showing ${shown} ${shown === 1 ? 'tool' : 'tools'}${category === 'all' ? '' : ` in ${category}`}.`;
  };

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('.chip-btn');
    if (!button) return;
    buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    applyFilter(button.dataset.filter);
  });

  container.replaceChildren(filters, grid, status);
}

/** Four skill groups (as on the CV), each with the tools used for that group. */
function renderSkills(container, data) {
  container.replaceChildren(
    ...data.skills.map((group) => {
      const tools = data.tools.filter((tool) => tool.category === group.title);
      return h(
        'article',
        { class: 'skill-card', dataset: { spotlight: '' } },
        h(
          'div',
          { class: 'skill-card__head' },
          h('span', { class: 'icon-box icon-box--sm' }, icon(group.icon)),
          h('h3', { class: 'skill-card__title', text: group.title }),
        ),
        h('ul', { class: 'check-list' }, ...group.items.map((item) => h('li', {}, icon('check'), item))),
        tools.length > 0 &&
          h(
            'div',
            { class: 'skill-card__tools' },
            h('p', { class: 'skill-card__label mono', text: 'Tools' }),
            h('ul', { class: 'mini-tools' }, ...tools.map((tool) => h('li', { class: 'mini-tool' }, toolIcon(tool), tool.name))),
          ),
      );
    }),
  );
}

function renderValueProposition(container, data) {
  container.replaceChildren(
    ...data.valueProposition.map((item, index) =>
      h(
        'article',
        { class: 'value-item' },
        h('span', { class: 'value-item__index mono', text: String(index + 1).padStart(2, '0') }),
        h('span', { class: 'icon-box icon-box--sm' }, icon(item.icon)),
        h('div', {}, h('h3', { class: 'value-item__title', text: item.title }), h('p', { class: 'text-muted', text: item.text })),
      ),
    ),
  );
}

function renderEducation(container, data) {
  container.replaceChildren(
    h(
      'div',
      { class: 'edu-layout' },
      h(
        'ol',
        { class: 'edu-track', dataset: { stagger: '' } },
        ...data.education.map((entry) =>
          h(
            'li',
            { class: 'edu-card' },
            h('span', { class: 'edu-card__year mono', text: entry.year }),
            h('h3', { class: 'edu-card__level', text: entry.level }),
            h('p', { class: 'text-muted', text: entry.institution }),
          ),
        ),
      ),
      h(
        'aside',
        { class: 'lang-card', dataset: { reveal: 'up' } },
        h('span', { class: 'icon-box' }, icon('languages')),
        h('h3', { class: 'lang-card__title', text: 'Languages' }),
        h(
          'ul',
          { class: 'lang-list' },
          ...data.languages.map((language) =>
            h('li', {}, language.name, language.level && h('span', { class: 'lang-list__level', text: ` · ${language.level}` })),
          ),
        ),
      ),
    ),
  );
}

function renderInterests(container, data) {
  container.replaceChildren(
    ...data.interests.map((interest) =>
      h(
        'article',
        {
          class: `interest-card${interest.featured ? ' interest-card--featured' : ''}`,
          dataset: { spotlight: '' },
        },
        h(
          'div',
          { class: 'interest-card__top' },
          h('span', { class: 'interest-card__icon' }, icon(interest.icon)),
          interest.tag && h('span', { class: 'interest-card__tag mono', text: interest.tag }),
        ),
        h('h3', { class: 'interest-card__title', text: interest.title }),
        h('p', { class: 'interest-card__text text-muted', text: interest.text }),
      ),
    ),
  );
}

function renderContactList(container, data) {
  container.replaceChildren(
    ...data.contact.items.map((item) =>
      h(
        'li',
        { class: 'contact-item' },
        icon(item.icon),
        h(
          'div',
          { class: 'contact-item__body' },
          h('span', { class: 'contact-item__label mono', text: item.label }),
          item.href
            ? h('a', { class: 'contact-item__value', href: item.href, text: item.value, ...externalProps(item.external) })
            : h('span', { class: 'contact-item__value', text: item.value }),
        ),
        item.copy &&
          h(
            'button',
            { class: 'copy-btn', type: 'button', 'aria-label': `Copy ${item.label.toLowerCase()}`, dataset: { copy: item.value } },
            icon('copy', 'copy-btn__copy'),
            icon('check', 'copy-btn__done'),
          ),
      ),
    ),
  );
}

/* ---- Projects (disabled by default through sectionVisibility.projects) ---- */

function projectDetail(label, content) {
  return h('section', { class: 'modal__block' }, h('h3', { class: 'modal__label mono', text: label }), content);
}

function buildProjectModal(project, dialog) {
  const list = (items) => h('ul', { class: 'check-list' }, ...items.map((item) => h('li', {}, icon('check'), item)));
  const links = [project.link, project.download].filter(Boolean);

  dialog.replaceChildren(
    h(
      'div',
      { class: 'modal__content' },
      h('button', { class: 'modal__close', type: 'button', 'aria-label': 'Close case study', dataset: { close: '' } }, icon('x')),
      project.image && h('img', { class: 'modal__image', src: project.image.src, alt: project.image.alt, loading: 'lazy', decoding: 'async' }),
      h('p', { class: 'badge', text: project.category }),
      h('h2', { class: 'modal__title', id: 'project-modal-title', text: project.title }),
      project.challenge && projectDetail('Business challenge', h('p', { text: project.challenge })),
      project.approach && projectDetail('Approach', h('p', { text: project.approach })),
      project.tools?.length > 0 &&
        projectDetail('Tools used', h('ul', { class: 'tag-list' }, ...project.tools.map((tool) => h('li', { class: 'tag tag--tool', text: tool })))),
      project.deliverables?.length > 0 && projectDetail('Deliverables', list(project.deliverables)),
      project.outcomes?.length > 0 && projectDetail('Verified outcomes', list(project.outcomes)),
      project.caseStudy?.length > 0 && projectDetail('Case study', h('div', { class: 'modal__prose' }, ...project.caseStudy.map((text) => h('p', { text })))),
      links.length > 0 &&
        h(
          'div',
          { class: 'modal__actions' },
          ...links.map((link) =>
            h('a', { class: 'btn btn--ghost', href: link.url, ...externalProps(true) }, link.label, icon('arrow-up-right')),
          ),
        ),
    ),
  );
}

function renderProjects(container, data) {
  const projects = data.projects;
  const dialog = qs('[data-project-modal]');
  if (projects.length === 0 || !dialog) {
    container.replaceChildren();
    return;
  }

  const categories = [...new Set(projects.map((project) => project.category))];
  const cards = projects.map((project, index) =>
    h(
      'li',
      { class: 'project-card', dataset: { category: project.category } },
      project.image && h('img', { class: 'project-card__image', src: project.image.src, alt: project.image.alt, loading: 'lazy', decoding: 'async' }),
      h('div', { class: 'project-card__body' },
        h('p', { class: 'badge', text: project.category }),
        h('h3', { class: 'project-card__title', text: project.title }),
        project.challenge && h('p', { class: 'text-muted', text: project.challenge }),
        h('ul', { class: 'tag-list' }, ...(project.tools ?? []).slice(0, 4).map((tool) => h('li', { class: 'tag', text: tool }))),
        h('button', { class: 'link-arrow', type: 'button', dataset: { project: index } }, h('span', { text: 'View case study' }), icon('arrow-right')),
      ),
    ),
  );

  const options = ['All', ...categories];
  const buttons = options.map((label, index) =>
    h('button', { class: 'chip-btn', type: 'button', 'aria-pressed': String(index === 0), dataset: { filter: label } }, label),
  );
  const filters = h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Filter projects by category' }, ...buttons);
  const grid = h('ul', { class: 'project-grid' }, ...cards);

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('.chip-btn');
    if (!button) return;
    buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    cards.forEach((card) => {
      card.hidden = !(button.dataset.filter === 'All' || card.dataset.category === button.dataset.filter);
    });
  });

  grid.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-project]');
    if (!trigger) return;
    buildProjectModal(projects[Number(trigger.dataset.project)], dialog);
    document.body.classList.add('is-locked');
    dialog.showModal();
  });

  if (!dialog.dataset.bound) {
    dialog.dataset.bound = 'true';
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
    });
    dialog.addEventListener('close', () => document.body.classList.remove('is-locked'));
  }

  container.replaceChildren(categories.length > 1 ? filters : '', grid);
}

/* ==========================================================================
   Public API
   ========================================================================== */

const renderers = {
  nav: renderNav,
  footerNav: renderFooterNav,
  socialLinks: renderSocialLinks,
  highlights: renderHighlights,
  aboutAside: renderAboutAside,
  aboutStory: renderAboutStory,
  aboutFacts: renderAboutFacts,
  aboutPillars: renderAboutPillars,
  expertise: renderExpertise,
  skills: renderSkills,
  experience: renderExperience,
  growthStrategy: renderGrowthStrategy,
  markets: renderMarkets,
  tools: renderTools,
  valueProposition: renderValueProposition,
  projects: renderProjects,
  education: renderEducation,
  interests: renderInterests,
  contactList: renderContactList,
};

/** Binds text, applies section visibility and renders every [data-render] container. */
export function renderPortfolio(data) {
  bindText(data);
  bindHero(data);
  applySectionVisibility(data);

  qsa('[data-render]').forEach((container) => {
    const render = renderers[container.dataset.render];
    if (!render) return;
    try {
      render(container, data);
    } catch (error) {
      // The static HTML fallback inside the container stays in place.
      console.error(`Could not render "${container.dataset.render}":`, error);
    }
  });
}
