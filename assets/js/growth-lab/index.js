import { CONFIG } from '../config.js?v=1.0.47';
import { h, icon } from '../components.js?v=1.0.47';
import { closeLabModal, labModalOpen, onLabModalClose, openLabModal } from './modal.js?v=1.0.47';

/**
 * Growth Lab entry point: renders the tool cards and opens tools in the shared modal.
 * Tool modules and growth-lab.json load on first use, so the section costs nothing up front.
 */

const LAB_DATA_URL = './assets/content/growth-lab.json';
const TOOL_PARAM = 'tool';

const loaders = {
  pipeline: () => import('./tools/pipeline.js?v=1.0.47'),
  readiness: () => import('./tools/readiness.js?v=1.0.47'),
  funnel: () => import('./tools/funnel.js?v=1.0.47'),
  channels: () => import('./tools/channels.js?v=1.0.47'),
  cases: () => import('./tools/cases.js?v=1.0.47'),
  outreach: () => import('./tools/outreach.js?v=1.0.47'),
  brief: () => import('./tools/brief.js?v=1.0.47'),
};

const SIZES = { pipeline: 'lg', readiness: 'md', funnel: 'lg', channels: 'xl', cases: 'xl', outreach: 'xl', brief: 'md' };

let labDataPromise = null;
let portfolio = null;
let toolsById = new Map();

function loadLabData() {
  if (!labDataPromise) {
    labDataPromise = fetch(CONFIG.assets.withVersion(LAB_DATA_URL), { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Growth Lab content request failed (${response.status}).`);
        return response.json();
      })
      .catch((error) => {
        labDataPromise = null;
        throw error;
      });
  }
  return labDataPromise;
}

function setToolParam(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(TOOL_PARAM, id);
  else url.searchParams.delete(TOOL_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Opens a tool. options.opener is the element focus returns to on close;
 * options.payload is passed to the tool (e.g. a hand-off from another tool).
 */
export function openTool(id, options = {}) {
  const tool = toolsById.get(id);
  if (!tool || !loaders[id]) return;
  const wasOpen = labModalOpen();

  openLabModal({
    title: tool.title,
    description: tool.modalDescription || tool.description,
    iconName: tool.icon,
    size: SIZES[id] || 'lg',
    dismissOnBackdrop: id !== 'brief',
    opener: options.opener ?? null,
    onRetry: () => openTool(id, options),
    render: async () => {
      const [module, lab] = await Promise.all([loaders[id](), loadLabData()]);
      return module.mount({ lab, portfolio, payload: options.payload, openTool, close: closeLabModal });
    },
  });

  setToolParam(id);
  if (!wasOpen) onLabModalClose(() => setToolParam(null));
}

function previewFor(type) {
  const counts = { bars: 4, ring: 0, funnel: 4, columns: 4, stack: 3, chat: 3, steps: 4 };
  const pieces = Array.from({ length: counts[type] ?? 0 }, (_, index) => h('span', { style: { '--i': index } }));
  return h('span', { class: `lab-preview lab-preview--${type}`, 'aria-hidden': 'true' }, ...pieces);
}

function renderCard(tool) {
  const titleId = `lab-card-${tool.id}`;
  return h(
    'article',
    { class: `lab-card${tool.featured ? ' lab-card--featured' : ''}`, 'aria-labelledby': titleId, 'data-spotlight': '' },
    h('div', { class: 'lab-card__top' }, h('span', { class: 'icon-box' }, icon(tool.icon)), previewFor(tool.preview)),
    h('h3', { class: 'lab-card__title', id: titleId, text: tool.title }),
    h('p', { class: 'lab-card__text', text: tool.description }),
    h(
      'button',
      {
        type: 'button',
        class: `btn ${tool.featured ? 'btn--primary' : 'btn--ghost'} btn--sm lab-card__action`,
        'data-lab-open': tool.id,
        'aria-haspopup': 'dialog',
      },
      h('span', { text: tool.action }),
      icon('arrow-right'),
    ),
  );
}

function bindLabTriggers() {
  if (document.documentElement.dataset.labTriggersBound) return;
  document.documentElement.dataset.labTriggersBound = '1';

  // Document delegation survives card re-renders and matches the Inixio modal pattern.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-lab-open]');
    if (button) {
      event.preventDefault();
      openTool(button.dataset.labOpen, { opener: button });
      return;
    }
    const link = event.target.closest('[data-open-tool]');
    if (!link) return;
    event.preventDefault();
    openTool(link.dataset.openTool, { opener: link });
  });
}

/** Renders the Growth Lab cards into [data-render="growthLab"] and wires deep links. */
export function initGrowthLab(data) {
  const container = document.querySelector('[data-render="growthLab"]');
  const tools = data?.growthLab?.tools;
  if (!container || !Array.isArray(tools) || container.closest('[hidden]')) return;

  portfolio = data;
  toolsById = new Map(tools.map((tool) => [tool.id, tool]));
  container.replaceChildren(...tools.filter((tool) => loaders[tool.id]).map(renderCard));
  container.setAttribute('data-stagger', '');
  bindLabTriggers();

  const requested = new URL(window.location.href).searchParams.get(TOOL_PARAM);
  if (requested && toolsById.has(requested)) {
    const opener = container.querySelector(`[data-lab-open="${CSS.escape(requested)}"]`);
    openTool(requested, { opener });
  } else if (requested) {
    setToolParam(null);
  }
}
