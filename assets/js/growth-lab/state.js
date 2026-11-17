/**
 * Session-only persistence for Growth Lab inputs. Nothing leaves the browser;
 * sessionStorage is cleared when the tab closes.
 */

const PREFIX = 'sm-lab-';
const HANDOFF_KEY = `${PREFIX}handoff`;

export function loadState(tool, defaults) {
  try {
    const raw = sessionStorage.getItem(PREFIX + tool);
    if (!raw) return structuredClone(defaults);
    const saved = JSON.parse(raw);
    return saved && typeof saved === 'object' ? { ...structuredClone(defaults), ...saved } : structuredClone(defaults);
  } catch {
    return structuredClone(defaults);
  }
}

export function saveState(tool, value) {
  try {
    sessionStorage.setItem(PREFIX + tool, JSON.stringify(value));
  } catch {
    /* Storage can be full or blocked; the tool still works for this view. */
  }
}

export function clearState(tool) {
  try {
    sessionStorage.removeItem(PREFIX + tool);
  } catch {
    /* ignore */
  }
}

/**
 * Context offered to the Strategy Brief by another tool (e.g. an assessment summary).
 * It is only attached to a brief after the visitor explicitly opts in.
 */
export function setHandoff(source, summary) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ source, summary, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function getHandoff() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearHandoff() {
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}
