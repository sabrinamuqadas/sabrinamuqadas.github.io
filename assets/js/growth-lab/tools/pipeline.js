import { h, icon } from '../../components.js?v=1.0.47';
import { debounce } from '../../utils.js?v=1.0.47';
import { isNum, pipelineForecast, scenarioSet } from '../calc.js?v=1.0.47';
import { CURRENCIES, describeClients, formatCurrency, formatNumber, formatPercent, formatRatio } from '../format.js?v=1.0.47';
import { clearState, loadState, saveState } from '../state.js?v=1.0.47';
import { barChart, copyButton, disclosure, inputForm, metric, notice, rangeField, resetButton, sectionHeading, selectField } from '../ui.js?v=1.0.47';

const TOOL = 'pipeline';
const SCENARIO_LABELS = { conservative: 'Conservative', base: 'Base case', optimistic: 'Optimistic' };

export function mount({ lab, openTool }) {
  const defaults = lab.pipeline.defaults;
  const multipliers = lab.pipeline.scenarios;
  const state = loadState(TOOL, defaults);

  const fields = {};
  const status = h('p', { class: 'sr-only', role: 'status' });
  const announce = debounce((text) => {
    status.textContent = text;
  }, 700);

  const metrics = {
    responses: metric({ label: 'Positive responses', value: '' }),
    opportunities: metric({ label: 'Qualified opportunities', value: '' }),
    clients: metric({ label: 'Expected clients', value: '', tone: 'accent' }),
    revenue: metric({ label: 'Expected revenue', value: '', tone: 'accent' }),
    conversion: metric({ label: 'Prospect-to-client conversion', value: '' }),
    costPerClient: metric({ label: 'Cost per client', value: '' }),
    ratio: metric({ label: 'Revenue-to-cost ratio', value: '' }),
  };
  const chartSlot = h('div', { class: 'lab-chart-slot' });
  const scenarioBody = h('tbody');
  const insightList = h('ul', { class: 'check-list lab-insights' });

  const update = () => {
    const result = pipelineForecast(state);
    const money = (value) => formatCurrency(value, state.currency);

    metrics.responses.update(formatNumber(result.responses));
    metrics.opportunities.update(formatNumber(result.opportunities));
    const whole = result.clientsWhole;
    metrics.clients.update(
      formatNumber(result.clients, { digits: 1 }),
      !isNum(whole) ? '' : whole === 0 && result.clients > 0 ? 'Less than one whole client' : `${formatNumber(whole)} whole ${whole === 1 ? 'client' : 'clients'}`,
    );
    metrics.revenue.update(money(result.revenue), 'Expected value, based on fractional clients');
    metrics.conversion.update(formatPercent(result.conversionRate, { digits: 2 }));
    metrics.costPerClient.update(
      result.cost === null ? 'Add a cost' : money(result.costPerClient),
      result.cost === null ? 'Acquisition cost is optional' : 'Total acquisition cost ÷ expected clients',
    );
    metrics.ratio.update(result.cost === null ? 'Add a cost' : formatRatio(result.revenueToCost), result.cost === null ? '' : 'Expected revenue ÷ acquisition cost');

    chartSlot.replaceChildren(
      barChart({
        title: 'Pipeline volume by stage',
        rows: [
          { label: 'Prospects', value: state.prospects, display: formatNumber(state.prospects) },
          { label: 'Responses', value: result.responses, display: formatNumber(result.responses) },
          { label: 'Qualified', value: result.opportunities, display: formatNumber(result.opportunities) },
          { label: 'Clients', value: result.clients, display: formatNumber(result.clients, { digits: 1 }) },
        ],
        summary: `${formatNumber(state.prospects)} prospects lead to ${formatNumber(result.responses)} responses, ${formatNumber(result.opportunities)} qualified opportunities and ${formatNumber(result.clients, { digits: 1 })} expected clients.`,
      }),
    );

    const scenarios = scenarioSet(state, multipliers);
    scenarioBody.replaceChildren(
      ...Object.entries(scenarios).map(([name, scenario]) =>
        h(
          'tr',
          { class: name === 'base' ? 'is-base' : '' },
          h('th', { scope: 'row' }, SCENARIO_LABELS[name] ?? name, h('span', { class: 'lab-table__hint text-muted', text: ` ×${scenario.factor} rates` })),
          h('td', { text: formatNumber(scenario.result.clients, { digits: 1 }) }),
          h('td', { text: money(scenario.result.revenue) }),
        ),
      ),
    );

    const combined = isNum(result.conversionRate) && result.conversionRate > 0 ? result.conversionRate / 100 : null;
    const per100 = isNum(state.prospects) && state.prospects > 0 && isNum(result.opportunities) ? (result.opportunities / state.prospects) * 100 : null;
    const insights = [
      per100 !== null && `Out of every 100 prospects, about ${formatNumber(per100, { digits: 1 })} become qualified opportunities.`,
      combined && `At these rates, one whole client needs roughly ${formatNumber(Math.ceil(1 / combined))} prospects contacted.`,
      isNum(state.salesCycleDays) &&
        `With a ${formatNumber(state.salesCycleDays)}-day sales cycle, revenue from this outreach would arrive roughly ${formatNumber(state.salesCycleDays / 30, { digits: 1 })} months after first contact, not in the same month.`,
      !combined && 'One of the conversion rates is 0%, so this plan produces no clients. Raise the weakest rate first.',
    ].filter(Boolean);
    insightList.replaceChildren(...insights.map((text) => h('li', {}, icon('check'), h('span', { text }))));

    saveState(TOOL, state);
    announce(`Estimate updated: ${describeClients(result.clients)}, ${money(result.revenue)} expected revenue.`);
  };

  const set = (key) => (value) => {
    state[key] = value;
    update();
  };

  fields.prospects = rangeField({ label: 'Prospects contacted', value: state.prospects, min: 1, max: 20000, step: 1, onChange: set('prospects') });
  fields.responseRate = rangeField({ label: 'Positive response rate', value: state.responseRate, min: 0, max: 100, step: 0.1, suffix: '%', onChange: set('responseRate') });
  fields.qualificationRate = rangeField({ label: 'Qualified opportunity rate', value: state.qualificationRate, min: 0, max: 100, step: 0.1, suffix: '%', hint: 'Share of positive responses that become qualified opportunities.', onChange: set('qualificationRate') });
  fields.winRate = rangeField({ label: 'Win / close rate', value: state.winRate, min: 0, max: 100, step: 0.1, suffix: '%', hint: 'Share of qualified opportunities that become clients.', onChange: set('winRate') });
  fields.dealValue = rangeField({ label: 'Average deal value', value: state.dealValue, min: 0, max: 100000, step: 50, onChange: set('dealValue') });
  fields.acquisitionCost = rangeField({ label: 'Total acquisition cost', value: state.acquisitionCost, min: 0, max: 100000, step: 50, optional: true, hint: 'Tools, data, ads and time spent on this outreach.', onChange: set('acquisitionCost') });
  fields.salesCycleDays = rangeField({ label: 'Average sales cycle', value: state.salesCycleDays, min: 1, max: 365, step: 1, suffix: 'days', optional: true, onChange: set('salesCycleDays') });
  fields.currency = selectField({
    label: 'Currency',
    value: state.currency,
    options: CURRENCIES.map((currency) => ({ value: currency.code, label: currency.label })),
    onChange: set('currency'),
  });

  const reset = () => {
    clearState(TOOL);
    Object.assign(state, structuredClone(defaults));
    Object.entries(fields).forEach(([key, field]) => field.setValue(state[key]));
    update();
  };

  const summaryText = () => {
    const result = pipelineForecast(state);
    const money = (value) => formatCurrency(value, state.currency);
    return [
      'Pipeline & Revenue estimate (Growth Lab)',
      `Prospects: ${formatNumber(state.prospects)}; response ${formatPercent(state.responseRate)}; qualified ${formatPercent(state.qualificationRate)}; win ${formatPercent(state.winRate)}`,
      `Average deal value: ${money(state.dealValue)}`,
      `Expected responses: ${formatNumber(result.responses)}`,
      `Qualified opportunities: ${formatNumber(result.opportunities)}`,
      `Expected clients: ${describeClients(result.clients)}`,
      `Expected revenue: ${money(result.revenue)}`,
      result.cost !== null ? `Cost per client: ${money(result.costPerClient)}; revenue-to-cost: ${formatRatio(result.revenueToCost)}` : '',
      'Estimate only, based on the assumptions above.',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const discuss = h('button', { type: 'button', class: 'btn btn--primary btn--sm' }, h('span', { text: 'Discuss this forecast' }), icon('arrow-right'));
  discuss.addEventListener('click', () => openTool('brief', { payload: { source: 'Pipeline & Revenue Calculator', summary: summaryText() } }));

  update();

  return h(
    'div',
    { class: 'lab-tool lab-tool--split' },
    inputForm(
      'Pipeline assumptions',
      notice(lab.meta.demoNotice),
      fields.prospects,
      fields.responseRate,
      fields.qualificationRate,
      fields.winRate,
      h('div', { class: 'lab-inputs__pair' }, fields.dealValue, fields.currency),
      fields.acquisitionCost,
      fields.salesCycleDays,
    ),
    h(
      'div',
      { class: 'lab-results' },
      sectionHeading('Your estimate'),
      h('div', { class: 'lab-metrics' }, ...Object.values(metrics)),
      chartSlot,
      insightList,
      sectionHeading('Scenarios', 'Every conversion rate scaled by the same factor, capped at 100%.'),
      h(
        'div',
        { class: 'lab-table-wrap' },
        h(
          'table',
          { class: 'lab-table' },
          h('caption', { class: 'sr-only', text: 'Scenario comparison' }),
          h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: 'Scenario' }), h('th', { scope: 'col', text: 'Clients' }), h('th', { scope: 'col', text: 'Revenue' }))),
          scenarioBody,
        ),
      ),
      notice(lab.meta.estimateNotice, 'warn'),
      disclosure(
        'How this is calculated',
        h(
          'ul',
          { class: 'plain-list lab-formulas' },
          h('li', { text: 'Responses = prospects × response rate' }),
          h('li', { text: 'Qualified opportunities = responses × qualification rate' }),
          h('li', { text: 'Clients = qualified opportunities × win rate' }),
          h('li', { text: 'Revenue = clients × average deal value' }),
          h('li', { text: 'Cost per client = acquisition cost ÷ clients; revenue-to-cost = revenue ÷ acquisition cost' }),
          h('li', { text: 'Fractional clients are expected values averaged over many similar campaigns; only whole clients ever sign.' }),
        ),
      ),
      h('div', { class: 'lab-actions' }, copyButton(summaryText), resetButton(reset), discuss),
      status,
    ),
  );
}
