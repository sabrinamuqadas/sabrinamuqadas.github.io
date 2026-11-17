/**
 * Growth Lab business maths. Pure functions only: no DOM, no imports.
 * Rates are expressed in percent (0–100). Any value that cannot be computed is `null`, never 0 or Infinity.
 */

export const isNum = (value) => typeof value === 'number' && Number.isFinite(value);

/** Parses user input into a finite number inside [min, max], or null when empty or invalid. */
export function toNumber(value, { min = -Infinity, max = Infinity } = {}) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(number, min), max);
}

export function safeDivide(numerator, denominator) {
  if (!isNum(numerator) || !isNum(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

const rate = (value) => (isNum(value) ? Math.min(Math.max(value, 0), 100) / 100 : null);
const times = (a, b) => (isNum(a) && isNum(b) ? a * b : null);
const asPercent = (ratio) => (isNum(ratio) ? ratio * 100 : null);

/* ==========================================================================
   Tool 1: Sales pipeline & revenue forecast
   ========================================================================== */

/**
 * @param {{prospects:number, responseRate:number, qualificationRate:number, winRate:number,
 *          dealValue:number, acquisitionCost?:number|null}} input
 */
export function pipelineForecast(input) {
  const responses = times(input.prospects, rate(input.responseRate));
  const opportunities = times(responses, rate(input.qualificationRate));
  const clients = times(opportunities, rate(input.winRate));
  const revenue = times(clients, input.dealValue);
  const conversionRate = asPercent(safeDivide(clients, input.prospects));

  const cost = isNum(input.acquisitionCost) && input.acquisitionCost > 0 ? input.acquisitionCost : null;
  const costPerClient = cost === null ? null : safeDivide(cost, clients);
  const revenueToCost = cost === null ? null : safeDivide(revenue, cost);

  return {
    responses,
    opportunities,
    clients,
    clientsWhole: isNum(clients) ? Math.floor(clients) : null,
    revenue,
    conversionRate,
    cost,
    costPerClient,
    revenueToCost,
  };
}

export const DEFAULT_SCENARIO_MULTIPLIERS = Object.freeze({ conservative: 0.75, base: 1, optimistic: 1.25 });

/** Applies a multiplier to every conversion rate (capped at 100%) and forecasts each scenario. */
export function scenarioSet(input, multipliers = DEFAULT_SCENARIO_MULTIPLIERS) {
  const scale = (value, factor) => (isNum(value) && isNum(factor) ? Math.min(value * factor, 100) : null);
  return Object.fromEntries(
    Object.entries(multipliers).map(([name, factor]) => {
      const scenario = {
        ...input,
        responseRate: scale(input.responseRate, factor),
        qualificationRate: scale(input.qualificationRate, factor),
        winRate: scale(input.winRate, factor),
      };
      return [name, { factor, inputs: scenario, result: pipelineForecast(scenario) }];
    }),
  );
}

/* ==========================================================================
   Tool 4: Outreach ROI & channel comparison
   ========================================================================== */

/**
 * @param {{prospects?:number, spend?:number, hours?:number, hourlyRate?:number, responses?:number,
 *          qualified?:number, customers?:number, revenue?:number, grossMargin?:number}} input
 */
export function channelMetrics(input) {
  const spend = isNum(input.spend) ? input.spend : 0;
  const labour = isNum(input.hours) && isNum(input.hourlyRate) ? input.hours * input.hourlyRate : 0;
  const hasCostData = isNum(input.spend) || (isNum(input.hours) && isNum(input.hourlyRate));
  const totalCost = hasCostData ? spend + labour : null;

  const responseRate = asPercent(safeDivide(input.responses, input.prospects));
  const qualificationRate = asPercent(safeDivide(input.qualified, input.responses));
  const conversionRate = asPercent(safeDivide(input.customers, input.prospects));
  const opportunitiesPer100 = asPercent(safeDivide(input.qualified, input.prospects));
  const cac = input.customers > 0 ? safeDivide(totalCost, input.customers) : null;
  const revenueToCost = safeDivide(input.revenue, totalCost);
  const roi = isNum(input.revenue) ? asPercent(safeDivide(input.revenue - (totalCost ?? NaN), totalCost)) : null;

  const margin = rate(input.grossMargin);
  const grossProfit = isNum(input.revenue) && margin !== null ? input.revenue * margin : null;
  const marginRoi = isNum(grossProfit) ? asPercent(safeDivide(grossProfit - (totalCost ?? NaN), totalCost)) : null;

  const warnings = [];
  if (isNum(input.responses) && isNum(input.prospects) && input.responses > input.prospects) {
    warnings.push('Positive responses exceed prospects contacted.');
  }
  if (isNum(input.qualified) && isNum(input.responses) && input.qualified > input.responses) {
    warnings.push('Qualified opportunities exceed positive responses.');
  }
  if (isNum(input.customers) && isNum(input.qualified) && input.customers > input.qualified) {
    warnings.push('New customers exceed qualified opportunities.');
  }
  if (isNum(input.hours) && input.hours > 0 && !isNum(input.hourlyRate)) {
    warnings.push('Hours are recorded without an hourly cost, so labour is not included in total cost.');
  }

  return {
    totalCost,
    labourCost: hasCostData ? labour : null,
    responseRate,
    qualificationRate,
    conversionRate,
    opportunitiesPer100,
    cac,
    revenueToCost,
    roi,
    grossProfit,
    marginRoi,
    warnings,
  };
}

/** Direction of "better" for each comparable metric. */
export const CHANNEL_METRIC_DIRECTIONS = Object.freeze({
  responseRate: 'higher',
  qualificationRate: 'higher',
  conversionRate: 'higher',
  opportunitiesPer100: 'higher',
  cac: 'lower',
  revenueToCost: 'higher',
  roi: 'higher',
  marginRoi: 'higher',
});

/**
 * Finds the best channel per metric. A metric only gets a winner when at least two channels have data,
 * and ties produce no winner, so the tool never declares a "best" channel on insufficient evidence.
 * @param {{id:string, label:string, metrics:object}[]} channels
 */
export function rankChannels(channels) {
  return Object.fromEntries(
    Object.entries(CHANNEL_METRIC_DIRECTIONS).map(([key, direction]) => {
      const scored = channels.filter((channel) => isNum(channel.metrics[key]));
      if (scored.length < 2) return [key, null];
      const sorted = [...scored].sort((a, b) =>
        direction === 'higher' ? b.metrics[key] - a.metrics[key] : a.metrics[key] - b.metrics[key],
      );
      if (sorted[0].metrics[key] === sorted[1].metrics[key]) return [key, null];
      return [key, { id: sorted[0].id, label: sorted[0].label, value: sorted[0].metrics[key], compared: scored.length }];
    }),
  );
}

/** Deterministic, evidence-based sentences derived from rankChannels(). */
export function channelInsights(channels) {
  const best = rankChannels(channels);
  const insights = [];
  if (best.cac) {
    insights.push(
      `${best.cac.label} has the lowest acquisition cost among the ${best.cac.compared} channels with recorded customers and costs.`,
    );
  }
  if (best.opportunitiesPer100) {
    insights.push(`${best.opportunitiesPer100.label} generates the most qualified opportunities per 100 prospects.`);
  }
  if (best.responseRate) {
    insights.push(`${best.responseRate.label} has the highest positive response rate.`);
  }
  if (best.revenueToCost) {
    insights.push(`${best.revenueToCost.label} returns the most revenue for every unit of acquisition cost.`);
  }
  const noCustomers = channels.filter((channel) => channel.input && channel.input.customers === 0);
  if (noCustomers.length) {
    insights.push(
      `${noCustomers.map((channel) => channel.label).join(', ')} recorded no customers yet, so acquisition cost cannot be calculated there.`,
    );
  }
  if (!insights.length) {
    insights.push('Add data for at least two channels to compare them; there is not enough evidence to rank channels yet.');
  }
  return insights;
}

/* ==========================================================================
   Tool 5: Sales funnel simulator
   ========================================================================== */

export const FUNNEL_STAGES = Object.freeze(['Prospects', 'Responses', 'Qualified leads', 'Meetings', 'Proposals', 'Won customers']);

/**
 * @param {{prospects:number, rates:number[], dealValue?:number}} input  rates: 5 stage-to-stage conversions in %.
 */
export function funnelRun(input) {
  const volumes = [isNum(input.prospects) ? input.prospects : null];
  input.rates.forEach((value, index) => volumes.push(times(volumes[index], rate(value))));
  const customers = volumes[volumes.length - 1];
  return {
    volumes,
    dropOff: input.rates.map((value) => (isNum(value) ? 100 - Math.min(Math.max(value, 0), 100) : null)),
    customers,
    overallConversion: asPercent(safeDivide(customers, input.prospects)),
    revenue: times(customers, input.dealValue),
  };
}

export function funnelCompare(baseline, improved) {
  const a = funnelRun(baseline);
  const b = funnelRun(improved);
  const extraCustomers = isNum(a.customers) && isNum(b.customers) ? b.customers - a.customers : null;
  return {
    baseline: a,
    improved: b,
    extraCustomers,
    extraRevenue: isNum(a.revenue) && isNum(b.revenue) ? b.revenue - a.revenue : null,
    relativeImprovement: asPercent(safeDivide(extraCustomers, a.customers)),
  };
}

/** Applies a percentage-point or relative change to a rate, capped to 0–100. */
export function adjustRate(value, { type, amount }) {
  if (!isNum(value) || !isNum(amount)) return null;
  const next = type === 'relative' ? value * (1 + amount / 100) : value + amount;
  return Math.min(Math.max(next, 0), 100);
}

/**
 * Raises one stage at a time by the same number of percentage points and reports the customer gain for each.
 * Sorted by gain (largest first). Stages already at 100% gain nothing.
 */
export function funnelSensitivity(input, points = 5) {
  const base = funnelRun(input);
  const results = input.rates.map((value, index) => {
    const rates = input.rates.map((current, i) => (i === index ? adjustRate(current, { type: 'pp', amount: points }) : current));
    const run = funnelRun({ ...input, rates });
    return {
      index,
      from: FUNNEL_STAGES[index],
      to: FUNNEL_STAGES[index + 1],
      gain: isNum(run.customers) && isNum(base.customers) ? run.customers - base.customers : null,
      revenueGain: isNum(run.revenue) && isNum(base.revenue) ? run.revenue - base.revenue : null,
    };
  });
  return [...results].sort((a, b) => (b.gain ?? -Infinity) - (a.gain ?? -Infinity));
}

/* ==========================================================================
   Tool 2: Growth readiness assessment
   ========================================================================== */

/**
 * @param {{id:string, category:string, options:{score:number}[]}[]} questions
 * @param {Record<string, number>} answers  question id -> selected option index
 * @param {{id:string, label:string}[]} categories
 */
export function readinessScore(questions, answers, categories = []) {
  const answered = questions.filter((question) => Number.isInteger(answers[question.id]) && question.options[answers[question.id]]);
  const maxPer = (question) => Math.max(...question.options.map((option) => option.score));

  const earned = answered.reduce((total, question) => total + question.options[answers[question.id]].score, 0);
  const max = questions.reduce((total, question) => total + maxPer(question), 0);
  const complete = answered.length === questions.length;

  const categoryIds = categories.length ? categories.map((category) => category.id) : [...new Set(questions.map((q) => q.category))];
  const categoryScores = categoryIds.map((id) => {
    const inCategory = questions.filter((question) => question.category === id);
    const catMax = inCategory.reduce((total, question) => total + maxPer(question), 0);
    const catEarned = inCategory.reduce(
      (total, question) => total + (Number.isInteger(answers[question.id]) ? question.options[answers[question.id]]?.score ?? 0 : 0),
      0,
    );
    const label = categories.find((category) => category.id === id)?.label ?? id;
    return { id, label, earned: catEarned, max: catMax, score: catMax ? Math.round((catEarned / catMax) * 100) : null };
  });

  const priorities = answered
    .map((question, order) => {
      const optionIndex = answers[question.id];
      const option = question.options[optionIndex];
      return { questionId: question.id, category: question.category, optionIndex, score: option.score, gap: maxPer(question) - option.score, order };
    })
    .filter((item) => item.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.order - b.order)
    .slice(0, 3);

  return {
    complete,
    answeredCount: answered.length,
    earned,
    max,
    score: complete && max ? Math.round((earned / max) * 100) : null,
    categories: categoryScores,
    strengths: categoryScores.filter((category) => isNum(category.score) && category.score >= 67),
    weaknesses: categoryScores.filter((category) => isNum(category.score) && category.score < 50),
    priorities,
  };
}

/** Band labels for the overall score. */
export function readinessBand(score) {
  if (!isNum(score)) return null;
  if (score >= 80) return 'Scalable';
  if (score >= 60) return 'Structured';
  if (score >= 40) return 'Developing';
  return 'Early stage';
}
