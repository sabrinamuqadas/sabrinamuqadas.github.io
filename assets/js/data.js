/** Loads and validates the centralized portfolio content. */

const EXPECTED_SHAPE = Object.freeze({
  profile: 'object',
  branding: 'object',
  navigation: 'array',
  channels: 'array',
  highlights: 'array',
  about: 'object',
  expertise: 'array',
  skills: 'array',
  experience: 'array',
  growthStrategy: 'array',
  industries: 'array',
  industryGroups: 'array',
  markets: 'array',
  tools: 'array',
  valueProposition: 'array',
  projects: 'array',
  education: 'array',
  languages: 'array',
  interests: 'array',
  contact: 'object',
  socialLinks: 'array',
  sectionVisibility: 'object',
});

function validate(data) {
  if (data === null || typeof data !== 'object') {
    throw new Error('Portfolio data is not an object.');
  }

  Object.entries(EXPECTED_SHAPE).forEach(([key, type]) => {
    const value = data[key];
    const valid = type === 'array' ? Array.isArray(value) : value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!valid) throw new Error(`Portfolio data is missing a valid "${key}" ${type}.`);
  });
}

/**
 * Fetches portfolio.json with a timeout.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<object>}
 */
export async function loadPortfolio(url, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Portfolio request failed with status ${response.status}.`);
    const data = await response.json();
    validate(data);
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}
