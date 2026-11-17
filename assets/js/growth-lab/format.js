/** Growth Lab display formatting. Pure functions (Intl only), safe to unit-test under Node. */

export const NOT_AVAILABLE = 'Not available';

export const CURRENCIES = Object.freeze([
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'PKR', label: 'Pakistani Rupee (PKR)' },
]);

const valid = (value) => typeof value === 'number' && Number.isFinite(value);

export function formatCurrency(value, currency = 'USD', { compact = false } = {}) {
  if (!valid(value)) return NOT_AVAILABLE;
  const abs = Math.abs(value);
  const cents = abs < 1000 && !compact && !Number.isInteger(Math.round(value * 100) / 100);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact && abs >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: cents ? 2 : 0,
    minimumFractionDigits: cents ? 2 : 0,
  }).format(value);
}

/** Whole numbers stay whole; small fractional values keep one decimal so "0.4 clients" is not shown as 0. */
export function formatNumber(value, { digits } = {}) {
  if (!valid(value)) return NOT_AVAILABLE;
  const fraction = digits ?? (Math.abs(value) < 100 && !Number.isInteger(value) ? 1 : 0);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: fraction, minimumFractionDigits: 0 }).format(value);
}

/** Expects a value already in percent units (e.g. 12.5 for 12.5%). */
export function formatPercent(value, { digits = 1 } = {}) {
  if (!valid(value)) return NOT_AVAILABLE;
  const fraction = Math.abs(value) >= 100 ? 0 : digits;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: fraction }).format(value)}%`;
}

export function formatRatio(value) {
  if (!valid(value)) return NOT_AVAILABLE;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}x`;
}

/** Expected (fractional) customers vs the whole customers that would actually exist. */
export function describeClients(expected) {
  if (!valid(expected)) return NOT_AVAILABLE;
  const whole = Math.floor(expected);
  const expectedText = formatNumber(expected, { digits: 1 });
  if (expected > 0 && whole === 0) return `${expectedText} expected (less than one whole client)`;
  return `${expectedText} expected (${whole} whole ${whole === 1 ? 'client' : 'clients'})`;
}

/** CSV cell escaping for exports. */
export function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
