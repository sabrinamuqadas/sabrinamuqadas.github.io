import { h, icon } from '../../components.js?v=1.0.47';
import { loadState, saveState } from '../state.js?v=1.0.47';
import { nextId, notice, tabs } from '../ui.js?v=1.0.47';

const TOOL = 'cases';

const TABS = [
  { id: 'challenge', label: 'Challenge' },
  { id: 'research', label: 'Audience & research' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'execution', label: 'Execution' },
  { id: 'results', label: 'Results' },
  { id: 'learnings', label: 'Learnings' },
];

const bulletList = (items) => h('ul', { class: 'check-list' }, ...items.map((text) => h('li', {}, icon('check'), h('span', { text }))));

function tabContent(item, tabId) {
  const { tabs: content } = item;
  switch (tabId) {
    case 'challenge':
      return [h('p', { class: 'lab-prose', text: content.challenge })];
    case 'research':
      return [h('p', { class: 'lab-prose', text: content.audience }), h('h4', { class: 'lab-subhead mono', text: 'Research' }), bulletList(content.research)];
    case 'strategy':
      return [bulletList(content.strategy)];
    case 'execution':
      return [
        h(
          'ol',
          { class: 'lab-steps' },
          ...content.execution.map((step, index) =>
            h('li', { class: 'lab-steps__item' }, h('span', { class: 'lab-steps__num mono', text: String(index + 1).padStart(2, '0') }), h('div', {}, h('p', { class: 'lab-steps__title', text: step.step }), h('p', { class: 'text-muted', text: step.detail }))),
          ),
        ),
      ];
    case 'results':
      return [h('p', { class: 'badge', text: content.results.metricsStatus }), bulletList(content.results.points)];
    case 'learnings':
      return [bulletList(content.learnings)];
    default:
      return [];
  }
}

export function mount({ lab }) {
  const { items, notice: caseNotice } = lab.caseStudies;
  const state = loadState(TOOL, { selected: items[0]?.id, filter: 'all', tab: 0 });
  const channels = [...new Set(items.flatMap((item) => item.channels))];

  const list = h('ul', { class: 'lab-case-list', 'aria-label': 'Case studies' });
  const detail = h('article', { class: 'lab-case' });
  const filterButtons = [{ id: 'all', label: 'All' }, ...channels.map((channel) => ({ id: channel, label: channel }))].map((option) => {
    const button = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(state.filter === option.id), text: option.label });
    button.addEventListener('click', () => {
      state.filter = option.id;
      filterButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      renderList();
      const visible = filtered();
      if (!visible.some((item) => item.id === state.selected)) select(visible[0]?.id);
      saveState(TOOL, state);
    });
    return button;
  });

  const filtered = () => (state.filter === 'all' ? items : items.filter((item) => item.channels.includes(state.filter)));

  const renderDetail = () => {
    const item = items.find((entry) => entry.id === state.selected) ?? items[0];
    if (!item) {
      detail.replaceChildren(h('p', { class: 'lab-empty text-muted', text: 'No case studies match this filter.' }));
      return;
    }
    const panelId = nextId('lab-case-panel');
    const panel = h('div', { class: 'lab-case__panel', role: 'tabpanel', id: panelId, tabindex: '0' });
    const tabSet = tabs({
      label: `${item.title} sections`,
      items: TABS,
      initial: state.tab,
      onSelect: (index, tabId) => {
        state.tab = index;
        panel.setAttribute('aria-labelledby', tabId);
        panel.replaceChildren(...tabContent(item, TABS[index].id));
        saveState(TOOL, state);
      },
    });
    tabSet.root.querySelectorAll('[role="tab"]').forEach((tab) => tab.setAttribute('aria-controls', panelId));

    detail.replaceChildren(
      h(
        'header',
        { class: 'lab-case__head' },
        h('p', { class: 'mono text-muted', text: item.category }),
        h('h3', { class: 'lab-case__title', text: item.title }),
        h('p', { class: 'lab-case__meta' }, h('strong', { text: item.organisation }), ` · ${item.role} · ${item.period}`),
        h('div', { class: 'tag-list' }, ...item.channels.map((channel) => h('span', { class: 'tag', text: channel })), ...item.tools.map((tool) => h('span', { class: 'tag tag--tool', text: tool }))),
      ),
      tabSet.root,
      panel,
    );
    tabSet.select(Math.min(state.tab, TABS.length - 1));
  };

  const select = (id) => {
    state.selected = id;
    state.tab = 0;
    list.querySelectorAll('[data-case]').forEach((button) => button.setAttribute('aria-current', String(button.dataset.case === id)));
    renderDetail();
    saveState(TOOL, state);
  };

  const renderList = () => {
    const visible = filtered();
    list.replaceChildren(
      ...visible.map((item) => {
        const button = h(
          'button',
          { type: 'button', class: 'lab-case-list__item', 'data-case': item.id, 'aria-current': String(item.id === state.selected) },
          h('span', { class: 'lab-case-list__org mono', text: item.organisation }),
          h('span', { class: 'lab-case-list__title', text: item.title }),
          h('span', { class: 'lab-case-list__meta text-muted', text: item.period }),
        );
        button.addEventListener('click', () => {
          select(item.id);
          detail.querySelector('[role="tab"]')?.focus();
        });
        return h('li', {}, button);
      }),
    );
  };

  renderList();
  renderDetail();

  return h(
    'div',
    { class: 'lab-tool' },
    notice(caseNotice),
    h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Filter case studies by channel' }, ...filterButtons),
    h('div', { class: 'lab-cases' }, h('nav', { class: 'lab-cases__nav', 'aria-label': 'Choose a case study' }, list), detail),
  );
}
