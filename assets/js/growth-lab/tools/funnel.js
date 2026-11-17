import { h, icon } from '../../components.js?v=1.0.47';
import { debounce } from '../../utils.js?v=1.0.47';
import { FUNNEL_STAGES, adjustRate, funnelCompare, funnelSensitivity, isNum } from '../calc.js?v=1.0.47';
import { CURRENCIES, formatCurrency, formatNumber, formatPercent } from '../format.js?v=1.0.47';
import { clearState, loadState, saveState } from '../state.js?v=1.0.47';
import { barChart, copyButton, disclosure, inputForm, metric, notice, rangeField, resetButton, sectionHeading, selectField } from '../ui.js?v=1.0.47';

const TOOL = 'funnel';
const SENSITIVITY_POINTS = 5;

const transition = (index) => `${FUNNEL_STAGES[index]} → ${FUNNEL_STAGES[index + 1]}`;

export function mount({ lab, openTool }) {
  const config = lab.funnel;
  const defaults = { ...config.defaults, scenario: config.whatIfs[0]?.id ?? 'custom', custom: { stage: 3, type: 'pp', amount: 10 } };
  const state = loadState(TOOL, defaults);
  if (!Array.isArray(state.rates) || state.rates.length !== 5) state.rates = [...defaults.rates];

  const status = h('p', { class: 'sr-only', role: 'status' });
  const announce = debounce((text) => {
    status.textContent = text;
  }, 700);

  const improvement = () => {
    if (state.scenario === 'custom') return state.custom;
    return config.whatIfs.find((item) => item.id === state.scenario) ?? config.whatIfs[0];
  };

  const improvedInput = () => {
    const change = improvement();
    const rates = state.rates.map((value, index) => (index === Number(change.stage) ? adjustRate(value, { type: change.type, amount: Number(change.amount) }) : value));
    return { ...state, rates };
  };

  const metrics = {
    baseline: metric({ label: 'Baseline customers', value: '' }),
    improved: metric({ label: 'Improved customers', value: '', tone: 'accent' }),
    extra: metric({ label: 'Additional customers', value: '', tone: 'accent' }),
    revenue: metric({ label: 'Additional revenue', value: '' }),
  };
  const stageList = h('ol', { class: 'lab-funnel' });
  const bottleneck = h('div', { class: 'lab-callout' });
  const sensitivitySlot = h('div', { class: 'lab-chart-slot' });

  const update = () => {
    const money = (value) => formatCurrency(value, state.currency);
    const comparison = funnelCompare(state, improvedInput());
    const { baseline, improved } = comparison;
    const changed = Number(improvement().stage);

    metrics.baseline.update(formatNumber(baseline.customers, { digits: 1 }), `${formatPercent(baseline.overallConversion, { digits: 2 })} of prospects`);
    metrics.improved.update(formatNumber(improved.customers, { digits: 1 }), `${formatPercent(improved.overallConversion, { digits: 2 })} of prospects`);
    metrics.extra.update(
      isNum(comparison.extraCustomers) ? `+${formatNumber(comparison.extraCustomers, { digits: 1 })}` : formatNumber(null),
      isNum(comparison.relativeImprovement) ? `${formatPercent(comparison.relativeImprovement)} more than baseline` : '',
    );
    metrics.revenue.update(isNum(comparison.extraRevenue) ? `+${money(comparison.extraRevenue)}` : formatNumber(null), `Baseline revenue ${money(baseline.revenue)}`);

    stageList.replaceChildren(
      ...FUNNEL_STAGES.map((stage, index) => {
        const rate = state.rates[index];
        const nextRate = improvedInput().rates[index];
        const isChanged = index === changed && isNum(rate) && nextRate !== rate;
        return h(
          'li',
          { class: `lab-funnel__stage${isChanged ? ' is-changed' : ''}` },
          h(
            'div',
            { class: 'lab-funnel__head' },
            h('span', { class: 'lab-funnel__name', text: stage }),
            h(
              'span',
              { class: 'lab-funnel__volume' },
              formatNumber(baseline.volumes[index]),
              improved.volumes[index] !== baseline.volumes[index] && h('span', { class: 'lab-funnel__next', text: ` → ${formatNumber(improved.volumes[index])}` }),
            ),
          ),
          index < 5 &&
            h(
              'div',
              { class: 'lab-funnel__rate' },
              h('span', { class: 'lab-funnel__track', 'aria-hidden': 'true' }, h('span', { class: 'lab-funnel__fill', style: { '--w': `${Math.max(rate ?? 0, 1)}%` } }), isChanged && h('span', { class: 'lab-funnel__gain', style: { '--from': `${rate}%`, '--w': `${nextRate - rate}%` } })),
              h(
                'span',
                { class: 'lab-funnel__label text-muted' },
                `${formatPercent(rate)} convert, ${formatPercent(baseline.dropOff[index])} drop off`,
                isChanged && h('strong', { text: ` (improved to ${formatPercent(nextRate)})` }),
              ),
            ),
        );
      }),
    );

    const ranked = funnelSensitivity(state, SENSITIVITY_POINTS);
    const top = ranked[0];
    const weakest = state.rates.reduce((low, value, index) => (isNum(value) && (low === null || value < state.rates[low]) ? index : low), null);
    bottleneck.replaceChildren(
      icon('target'),
      h(
        'div',
        {},
        h('p', { class: 'lab-callout__title', text: 'Where to focus first' }),
        top && isNum(top.gain) && top.gain > 0
          ? h('p', { text: `Raising ${transition(top.index)} by ${SENSITIVITY_POINTS} percentage points adds the most customers (+${formatNumber(top.gain, { digits: 1 })}, about ${money(top.revenueGain)}).` })
          : h('p', { text: 'Every stage is already at 100%, or a zero rate blocks the funnel. Check the stage rates.' }),
        weakest !== null && h('p', { class: 'text-muted', text: `Lowest conversion: ${transition(weakest)} at ${formatPercent(state.rates[weakest])}.` }),
      ),
    );

    sensitivitySlot.replaceChildren(
      barChart({
        title: `Customers gained from +${SENSITIVITY_POINTS} points at each stage`,
        rows: ranked.map((item, position) => ({
          label: transition(item.index),
          value: item.gain,
          display: isNum(item.gain) ? `+${formatNumber(item.gain, { digits: 1 })}` : formatNumber(null),
          best: position === 0 && isNum(item.gain) && item.gain > 0 && item.gain !== ranked[1]?.gain,
        })),
      }),
    );

    saveState(TOOL, state);
    announce(`Baseline ${formatNumber(baseline.customers, { digits: 1 })} customers, improved ${formatNumber(improved.customers, { digits: 1 })}.`);
  };

  const fields = {
    prospects: rangeField({ label: 'Prospects', value: state.prospects, min: 1, max: 50000, step: 1, onChange: (value) => ((state.prospects = value), update()) }),
    dealValue: rangeField({ label: 'Average deal value', value: state.dealValue, min: 0, max: 100000, step: 50, onChange: (value) => ((state.dealValue = value), update()) }),
    currency: selectField({ label: 'Currency', value: state.currency, options: CURRENCIES.map((c) => ({ value: c.code, label: c.label })), onChange: (value) => ((state.currency = value), update()) }),
  };
  const rateFields = state.rates.map((value, index) =>
    rangeField({
      label: transition(index),
      value,
      min: 0,
      max: 100,
      step: 0.5,
      suffix: '%',
      onChange: (next) => {
        state.rates[index] = next;
        update();
      },
    }),
  );

  const custom = {
    stage: selectField({
      label: 'Stage to improve',
      value: String(state.custom.stage),
      options: FUNNEL_STAGES.slice(0, 5).map((_, index) => ({ value: String(index), label: transition(index) })),
      onChange: (value) => ((state.custom.stage = Number(value)), update()),
    }),
    type: selectField({
      label: 'Change type',
      value: state.custom.type,
      options: [
        { value: 'pp', label: 'Percentage points' },
        { value: 'relative', label: 'Relative %' },
      ],
      onChange: (value) => ((state.custom.type = value), update()),
    }),
    amount: rangeField({ label: 'Amount', value: state.custom.amount, min: 0, max: 100, step: 1, onChange: (value) => ((state.custom.amount = value), update()) }),
  };
  const customFields = h('div', { class: 'lab-custom', hidden: state.scenario !== 'custom' }, custom.stage, h('div', { class: 'lab-inputs__pair' }, custom.type, custom.amount));
  const scenarioField = selectField({
    label: 'Improvement scenario',
    value: state.scenario,
    options: [...config.whatIfs.map((item) => ({ value: item.id, label: item.label })), { value: 'custom', label: 'Custom improvement' }],
    onChange: (value) => {
      state.scenario = value;
      customFields.hidden = value !== 'custom';
      update();
    },
  });

  const reset = () => {
    clearState(TOOL);
    Object.assign(state, structuredClone(defaults));
    fields.prospects.setValue(state.prospects);
    fields.dealValue.setValue(state.dealValue);
    fields.currency.setValue(state.currency);
    rateFields.forEach((field, index) => field.setValue(state.rates[index]));
    scenarioField.setValue(state.scenario);
    custom.stage.setValue(String(state.custom.stage));
    custom.type.setValue(state.custom.type);
    custom.amount.setValue(state.custom.amount);
    customFields.hidden = state.scenario !== 'custom';
    update();
  };

  const summaryText = () => {
    const comparison = funnelCompare(state, improvedInput());
    const money = (value) => formatCurrency(value, state.currency);
    const change = improvement();
    return [
      'Funnel simulation (Growth Lab)',
      `Prospects: ${formatNumber(state.prospects)}; deal value ${money(state.dealValue)}`,
      ...state.rates.map((value, index) => `${transition(index)}: ${formatPercent(value)}`),
      `Improvement: ${transition(Number(change.stage))} ${change.type === 'pp' ? `+${change.amount} percentage points` : `+${change.amount}% relative`}`,
      `Customers: ${formatNumber(comparison.baseline.customers, { digits: 1 })} → ${formatNumber(comparison.improved.customers, { digits: 1 })}`,
      `Additional revenue: ${money(comparison.extraRevenue)}`,
      'Estimate only, based on the assumptions above.',
    ].join('\n');
  };

  const discuss = h('button', { type: 'button', class: 'btn btn--primary btn--sm' }, h('span', { text: 'Discuss my funnel' }), icon('arrow-right'));
  discuss.addEventListener('click', () => openTool('brief', { payload: { source: 'Funnel Simulator', summary: summaryText() } }));

  update();

  return h(
    'div',
    { class: 'lab-tool lab-tool--split' },
    inputForm(
      'Funnel assumptions',
      notice(lab.meta.demoNotice),
      fields.prospects,
      h('fieldset', { class: 'lab-fieldset' }, h('legend', { text: 'Stage conversion rates' }), ...rateFields),
      h('div', { class: 'lab-inputs__pair' }, fields.dealValue, fields.currency),
      h('fieldset', { class: 'lab-fieldset' }, h('legend', { text: 'What if' }), scenarioField, customFields),
    ),
    h(
      'div',
      { class: 'lab-results' },
      sectionHeading('Baseline vs improved'),
      h('div', { class: 'lab-metrics' }, ...Object.values(metrics)),
      stageList,
      bottleneck,
      sensitivitySlot,
      notice(lab.meta.estimateNotice, 'warn'),
      disclosure(
        'How this is calculated',
        h(
          'ul',
          { class: 'plain-list lab-formulas' },
          h('li', { text: 'Each stage volume = previous stage volume × that stage conversion rate.' }),
          h('li', { text: 'Drop-off = 100% − conversion rate for that step.' }),
          h('li', { text: 'Percentage points add directly (30% + 10 points = 40%); relative changes scale (30% + 20% relative = 36%). Rates are capped at 100%.' }),
          h('li', { text: `Focus ranking raises one step at a time by ${SENSITIVITY_POINTS} points and compares the customers gained.` }),
        ),
      ),
      h('div', { class: 'lab-actions' }, copyButton(summaryText), resetButton(reset), discuss),
      status,
    ),
  );
}
