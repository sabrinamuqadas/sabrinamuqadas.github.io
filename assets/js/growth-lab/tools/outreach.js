import { h, icon } from '../../components.js?v=1.0.47';
import { loadState, saveState } from '../state.js?v=1.0.47';
import { copyButton, disclosure, nextId, notice, selectField, tabs } from '../ui.js?v=1.0.47';

const TOOL = 'outreach';

/** Renders message text with [placeholders] highlighted, without parsing any HTML. */
function messageText(text) {
  const parts = text.split(/(\[[^\]]+\])/g).filter(Boolean);
  return parts.map((part) => (/^\[[^\]]+\]$/.test(part) ? h('mark', { class: 'lab-placeholder', text: part }) : part));
}

function exampleCard(example, categories, personas) {
  const category = categories.find((item) => item.id === example.category)?.label ?? example.category;
  const fullText = [example.subject && `Subject: ${example.subject}`, example.body].filter(Boolean).join('\n\n');
  return h(
    'article',
    { class: 'lab-message' },
    h(
      'header',
      { class: 'lab-message__head' },
      h('p', { class: 'mono text-muted', text: category }),
      h('h3', { class: 'lab-message__title', text: example.title }),
      h('div', { class: 'tag-list' }, ...example.personas.map((id) => h('span', { class: 'tag', text: personas.find((p) => p.id === id)?.label ?? id }))),
    ),
    example.subject &&
      h(
        'div',
        { class: 'lab-message__subject' },
        h('p', {}, h('span', { class: 'mono text-muted', text: 'Subject ' }), ...messageText(example.subject)),
        example.subjectAlternatives?.length > 0 && h('p', { class: 'text-muted lab-message__alts' }, 'Alternatives: ', example.subjectAlternatives.join(' · ')),
      ),
    h('div', { class: 'lab-message__body' }, ...messageText(example.body)),
    h('div', { class: 'lab-actions' }, copyButton(() => fullText, 'Copy message')),
    disclosure(
      'Why this works',
      h(
        'dl',
        { class: 'lab-dl' },
        h('dt', { text: 'Structure' }),
        h('dd', { text: example.why }),
        h('dt', { text: 'Personalization' }),
        h('dd', { text: example.personalization }),
        h('dt', { text: 'Call to action' }),
        h('dd', { text: example.cta }),
        h('dt', { text: 'Follow-up' }),
        h('dd', { text: example.followUp }),
      ),
    ),
  );
}

function comparisonCard(comparison) {
  return h(
    'article',
    { class: 'lab-compare' },
    h('h3', { class: 'lab-compare__title', text: comparison.title }),
    h(
      'div',
      { class: 'lab-compare__grid' },
      h('div', { class: 'lab-compare__col lab-compare__col--weak' }, h('p', { class: 'lab-compare__label mono' }, icon('x'), 'Generic'), h('p', { class: 'lab-message__body', text: comparison.generic })),
      h('div', { class: 'lab-compare__col lab-compare__col--strong' }, h('p', { class: 'lab-compare__label mono' }, icon('check'), 'Personalized'), h('p', { class: 'lab-message__body' }, ...messageText(comparison.personalized))),
    ),
    h('h4', { class: 'lab-subhead mono', text: 'What changed' }),
    h('ul', { class: 'check-list' }, ...comparison.improvements.map((text) => h('li', {}, icon('check'), h('span', { text })))),
  );
}

export function mount({ lab }) {
  const { notice: libraryNotice, personas, categories, examples, comparisons } = lab.outreach;
  const state = loadState(TOOL, { view: 0, category: 'all', persona: 'all' });

  const countEl = h('p', { class: 'lab-count text-muted', role: 'status' });
  const grid = h('div', { class: 'lab-messages' });

  const renderExamples = () => {
    const matches = examples.filter(
      (example) => (state.category === 'all' || example.category === state.category) && (state.persona === 'all' || example.personas.includes(state.persona)),
    );
    countEl.textContent = `${matches.length} ${matches.length === 1 ? 'example' : 'examples'}`;
    grid.replaceChildren(...(matches.length ? matches.map((example) => exampleCard(example, categories, personas)) : [h('p', { class: 'lab-empty text-muted', text: 'No examples match these filters. Try another message type or persona.' })]));
    saveState(TOOL, state);
  };

  const filters = h(
    'div',
    { class: 'lab-inputs__pair lab-filters' },
    selectField({
      label: 'Message type',
      value: state.category,
      options: [{ value: 'all', label: 'All message types' }, ...categories.map((item) => ({ value: item.id, label: item.label }))],
      onChange: (value) => ((state.category = value), renderExamples()),
    }),
    selectField({
      label: 'Persona',
      value: state.persona,
      options: [{ value: 'all', label: 'All personas' }, ...personas.map((item) => ({ value: item.id, label: item.label }))],
      onChange: (value) => ((state.persona = value), renderExamples()),
    }),
  );

  const examplesView = h('div', { class: 'lab-view' }, filters, countEl, grid);
  const compareView = h('div', { class: 'lab-view lab-compares' }, ...comparisons.map(comparisonCard));
  const views = [examplesView, compareView];
  const panelId = nextId('lab-outreach-panel');
  const panel = h('div', { class: 'lab-view-panel', role: 'tabpanel', id: panelId });

  const viewTabs = tabs({
    label: 'Outreach library views',
    items: [{ label: 'Message examples' }, { label: 'Generic vs personalized' }],
    initial: state.view,
    onSelect: (index, tabId) => {
      state.view = index;
      panel.setAttribute('aria-labelledby', tabId);
      panel.replaceChildren(views[index]);
      saveState(TOOL, state);
    },
  });
  viewTabs.root.querySelectorAll('[role="tab"]').forEach((tab) => tab.setAttribute('aria-controls', panelId));

  renderExamples();
  viewTabs.select(state.view === 1 ? 1 : 0);

  return h('div', { class: 'lab-tool' }, notice(libraryNotice), viewTabs.root, panel);
}
