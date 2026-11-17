import { h, icon } from '../../components.js?v=1.0.47';
import { debounce } from '../../utils.js?v=1.0.47';
import { CHANNEL_METRIC_DIRECTIONS, channelInsights, channelMetrics, isNum, rankChannels } from '../calc.js?v=1.0.47';
import { CURRENCIES, formatCurrency, formatNumber, formatPercent, formatRatio } from '../format.js?v=1.0.47';
import { clearState, loadState, saveState } from '../state.js?v=1.0.47';
import { barChart, copyButton, disclosure, downloadCsv, inputForm, nextId, notice, rangeField, resetButton, sectionHeading, selectField } from '../ui.js?v=1.0.47';

const TOOL = 'channels';

const INPUTS = [
  { key: 'prospects', label: 'Prospects contacted', max: 1000000 },
  { key: 'spend', label: 'Tools & data spend', money: true, max: 10000000 },
  { key: 'hours', label: 'Hours invested', max: 100000 },
  { key: 'hourlyRate', label: 'Cost per hour', money: true, max: 100000 },
  { key: 'responses', label: 'Positive responses', max: 1000000 },
  { key: 'qualified', label: 'Qualified opportunities', max: 1000000 },
  { key: 'customers', label: 'New customers', max: 100000 },
  { key: 'revenue', label: 'Revenue generated', money: true, max: 100000000 },
];

const ROWS = [
  { key: 'totalCost', label: 'Total cost', type: 'money' },
  { key: 'responseRate', label: 'Response rate', type: 'percent' },
  { key: 'qualificationRate', label: 'Qualification rate', type: 'percent' },
  { key: 'conversionRate', label: 'Prospect-to-customer', type: 'percent' },
  { key: 'opportunitiesPer100', label: 'Opportunities per 100 prospects', type: 'number' },
  { key: 'cac', label: 'Customer acquisition cost', type: 'money' },
  { key: 'revenueToCost', label: 'Revenue-to-cost', type: 'ratio' },
  { key: 'roi', label: 'Revenue ROI', type: 'percent' },
  { key: 'marginRoi', label: 'Gross-margin ROI', type: 'percent' },
];

function emptyRow() {
  return Object.fromEntries(INPUTS.map((input) => [input.key, null]));
}

function numberInput({ label, value, max, onChange }) {
  const id = nextId('lab-num');
  const input = h('input', { id, type: 'number', inputmode: 'decimal', min: 0, max, step: 'any', value: value ?? '', placeholder: '—' });
  input.addEventListener('input', () => {
    const raw = input.value.trim();
    const parsed = Number(raw);
    const invalid = raw !== '' && (!Number.isFinite(parsed) || parsed < 0 || parsed > max);
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    if (!invalid) onChange(raw === '' ? null : parsed);
  });
  const root = h('div', { class: 'field lab-num' }, h('label', { for: id, text: label }), input);
  root.setValue = (next) => {
    input.value = next ?? '';
    input.removeAttribute('aria-invalid');
  };
  return root;
}

export function mount({ lab, openTool }) {
  const available = lab.channels.available;
  const demo = lab.channels.demo;
  const demoRows = Object.fromEntries(available.map((channel) => [channel.id, { ...emptyRow(), ...(demo.rows.find((row) => row.id === channel.id) ?? {}), id: undefined, enabled: true }]));
  const defaults = { currency: demo.currency, grossMargin: demo.grossMargin, rows: demoRows };
  const state = loadState(TOOL, defaults);
  available.forEach((channel) => {
    state.rows[channel.id] ??= { ...emptyRow(), enabled: false };
  });

  const status = h('p', { class: 'sr-only', role: 'status' });
  const announce = debounce((text) => {
    status.textContent = text;
  }, 800);

  const money = (value) => formatCurrency(value, state.currency);
  const formatters = { money, percent: (v) => formatPercent(v), number: (v) => formatNumber(v, { digits: 1 }), ratio: formatRatio };

  const compute = () =>
    available
      .filter((channel) => state.rows[channel.id].enabled)
      .map((channel) => {
        const input = { ...state.rows[channel.id], grossMargin: state.grossMargin };
        return { id: channel.id, label: channel.label, input, metrics: channelMetrics(input) };
      });

  const tableSlot = h('div', { class: 'lab-table-wrap' });
  const chartsSlot = h('div', { class: 'lab-chart-grid' });
  const insightList = h('ul', { class: 'check-list lab-insights' });
  const warningList = h('ul', { class: 'lab-warnings' });

  const update = () => {
    const channels = compute();
    const best = rankChannels(channels);

    if (!channels.length) {
      tableSlot.replaceChildren(h('p', { class: 'lab-empty text-muted', text: 'Select at least one channel to see its metrics.' }));
    } else {
      tableSlot.replaceChildren(
        h(
          'table',
          { class: 'lab-table lab-table--compare' },
          h('caption', { class: 'sr-only', text: 'Channel comparison. Best values are marked.' }),
          h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: 'Metric' }), ...channels.map((channel) => h('th', { scope: 'col', text: channel.label })))),
          h(
            'tbody',
            {},
            ...ROWS.map((row) =>
              h(
                'tr',
                {},
                h('th', { scope: 'row' }, row.label, CHANNEL_METRIC_DIRECTIONS[row.key] && h('span', { class: 'lab-table__hint text-muted', text: CHANNEL_METRIC_DIRECTIONS[row.key] === 'lower' ? ' (lower is better)' : '' })),
                ...channels.map((channel) => {
                  const isBest = best[row.key]?.id === channel.id;
                  return h('td', { class: isBest ? 'is-best' : '' }, formatters[row.type](channel.metrics[row.key]), isBest && h('span', { class: 'lab-best', text: 'Best' }));
                }),
              ),
            ),
          ),
        ),
      );
    }

    const chartRows = (key, format) =>
      channels.map((channel) => ({ label: channel.label, value: channel.metrics[key], display: format(channel.metrics[key]), best: best[key]?.id === channel.id }));
    chartsSlot.replaceChildren(
      barChart({ title: 'Customer acquisition cost (lower is better)', rows: chartRows('cac', money) }),
      barChart({ title: 'Qualified opportunities per 100 prospects', rows: chartRows('opportunitiesPer100', formatters.number) }),
    );

    insightList.replaceChildren(...channelInsights(channels).map((text) => h('li', {}, icon('check'), h('span', { text }))));
    const warnings = channels.flatMap((channel) => channel.metrics.warnings.map((text) => `${channel.label}: ${text}`));
    warningList.replaceChildren(...warnings.map((text) => h('li', {}, icon('lightbulb'), h('span', { text }))));
    warningList.hidden = !warnings.length;

    saveState(TOOL, state);
    announce(`Comparison updated for ${channels.length} channels.`);
  };

  const cardRefs = {};
  const channelCards = available.map((channel) => {
    const row = state.rows[channel.id];
    const inputs = INPUTS.map((input) =>
      numberInput({
        label: input.label,
        value: row[input.key],
        max: input.max,
        onChange: (value) => {
          state.rows[channel.id][input.key] = value;
          update();
        },
      }),
    );
    const card = h('fieldset', { class: 'lab-channel', hidden: !row.enabled }, h('legend', { class: 'lab-channel__title', text: channel.label }), h('div', { class: 'lab-channel__grid' }, ...inputs));
    cardRefs[channel.id] = { card, inputs };
    return card;
  });

  const toggles = available.map((channel) => {
    const button = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(state.rows[channel.id].enabled), text: channel.label });
    button.addEventListener('click', () => {
      const enabled = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(enabled));
      state.rows[channel.id].enabled = enabled;
      cardRefs[channel.id].card.hidden = !enabled;
      update();
    });
    return button;
  });

  const currencyField = selectField({ label: 'Currency', value: state.currency, options: CURRENCIES.map((c) => ({ value: c.code, label: c.label })), onChange: (value) => ((state.currency = value), update()) });
  const marginField = rangeField({ label: 'Gross margin', value: state.grossMargin, min: 0, max: 100, step: 1, suffix: '%', optional: true, hint: 'Used for gross-margin ROI. Leave empty to skip.', onChange: (value) => ((state.grossMargin = value), update()) });

  const syncInputs = () => {
    available.forEach((channel, index) => {
      const row = state.rows[channel.id];
      cardRefs[channel.id].inputs.forEach((field, i) => field.setValue(row[INPUTS[i].key]));
      cardRefs[channel.id].card.hidden = !row.enabled;
      toggles[index].setAttribute('aria-pressed', String(row.enabled));
    });
    currencyField.setValue(state.currency);
    marginField.setValue(state.grossMargin);
    update();
  };

  const reset = () => {
    clearState(TOOL);
    Object.assign(state, structuredClone(defaults));
    syncInputs();
  };
  const clearAll = () => {
    available.forEach((channel) => {
      state.rows[channel.id] = { ...emptyRow(), enabled: state.rows[channel.id].enabled };
    });
    syncInputs();
  };
  const clearButton = h('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, icon('x'), 'Clear values');
  clearButton.addEventListener('click', clearAll);

  const csvRows = () => {
    const channels = compute();
    return [
      ['Metric', ...channels.map((channel) => channel.label)],
      ...INPUTS.map((input) => [input.label, ...channels.map((channel) => channel.input[input.key] ?? '')]),
      ...ROWS.map((row) => [row.label, ...channels.map((channel) => (isNum(channel.metrics[row.key]) ? Number(channel.metrics[row.key].toFixed(2)) : ''))]),
      ['Currency', ...channels.map(() => state.currency)],
    ];
  };
  const exportButton = h('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, icon('download'), 'Download CSV');
  exportButton.addEventListener('click', () => downloadCsv('channel-comparison.csv', csvRows()));

  const summaryText = () => {
    const channels = compute();
    return [
      'Outreach channel comparison (Growth Lab)',
      ...channels.map(
        (channel) =>
          `${channel.label}: cost ${money(channel.metrics.totalCost)}, response ${formatPercent(channel.metrics.responseRate)}, CAC ${money(channel.metrics.cac)}, revenue-to-cost ${formatRatio(channel.metrics.revenueToCost)}`,
      ),
      ...channelInsights(channels),
    ].join('\n');
  };

  const discuss = h('button', { type: 'button', class: 'btn btn--primary btn--sm' }, h('span', { text: 'Discuss my channels' }), icon('arrow-right'));
  discuss.addEventListener('click', () => openTool('brief', { payload: { source: 'Outreach ROI & Channel Comparison', summary: summaryText() } }));

  update();

  return h(
    'div',
    { class: 'lab-tool' },
    notice(lab.meta.demoNotice),
    inputForm(
      'Channel data',
      h('div', { class: 'lab-toolbar' }, h('p', { class: 'lab-toolbar__label', text: 'Channels to compare' }), h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Channels to compare' }, ...toggles)),
      h('div', { class: 'lab-inputs__pair' }, currencyField, marginField),
      h('div', { class: 'lab-channels' }, ...channelCards),
    ),
    sectionHeading('Comparison', 'The best value per metric is only marked when at least two channels have data and there is no tie.'),
    tableSlot,
    chartsSlot,
    insightList,
    warningList,
    notice(lab.meta.estimateNotice, 'warn'),
    disclosure(
      'How this is calculated',
      h(
        'ul',
        { class: 'plain-list lab-formulas' },
        h('li', { text: 'Total cost = tools & data spend + hours × cost per hour' }),
        h('li', { text: 'Response rate = positive responses ÷ prospects; qualification rate = qualified ÷ responses' }),
        h('li', { text: 'Customer acquisition cost (CAC) = total cost ÷ new customers' }),
        h('li', { text: 'Revenue ROI = (revenue − total cost) ÷ total cost' }),
        h('li', { text: 'Gross-margin ROI = (revenue × gross margin − total cost) ÷ total cost. This is closer to real profitability than revenue ROI.' }),
        h('li', { text: 'A metric shows "Not available" when its inputs are missing or would divide by zero.' }),
      ),
    ),
    h('div', { class: 'lab-actions' }, copyButton(summaryText), exportButton, clearButton, resetButton(reset), discuss),
    status,
  );
}
