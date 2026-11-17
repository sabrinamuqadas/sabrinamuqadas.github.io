import { h, icon } from '../components.js?v=1.0.47';
import { reducedMotion } from '../utils.js?v=1.0.47';
import { toCsv } from './format.js?v=1.0.47';

/** Small DOM building blocks shared by every Growth Lab tool. */

let uid = 0;
export const nextId = (prefix) => `${prefix}-${(uid += 1)}`;

/**
 * Slider + number input pair kept in sync. The number field is the source of truth;
 * invalid entries show an inline error and keep the last valid value.
 */
export function rangeField({ label, value, min = 0, max = 100, step = 1, suffix = '', prefix = '', hint = '', optional = false, onChange }) {
  const id = nextId('lab-field');
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const slider = h('input', { type: 'range', min, max, step, value: value ?? min, 'aria-hidden': 'true', tabindex: '-1', class: 'lab-range__slider' });
  const number = h('input', {
    id,
    type: 'number',
    inputmode: 'decimal',
    min,
    max,
    step,
    value: value ?? '',
    class: 'lab-range__number',
    'aria-describedby': [hint && hintId, errorId].filter(Boolean).join(' '),
  });
  const error = h('p', { class: 'field__error', id: errorId, hidden: true });

  const sync = (raw, from) => {
    const empty = raw === '' || raw === null;
    const parsed = Number(raw);
    if (empty && optional) {
      number.removeAttribute('aria-invalid');
      error.hidden = true;
      onChange(null);
      return;
    }
    if (empty || !Number.isFinite(parsed) || parsed < min || parsed > max) {
      number.setAttribute('aria-invalid', 'true');
      error.textContent = `Enter a value between ${min.toLocaleString('en-US')} and ${max.toLocaleString('en-US')}.`;
      error.hidden = false;
      return;
    }
    number.removeAttribute('aria-invalid');
    error.hidden = true;
    if (from !== 'number') number.value = String(parsed);
    if (from !== 'slider') slider.value = String(parsed);
    onChange(parsed);
  };

  slider.addEventListener('input', () => sync(slider.value, 'slider'));
  number.addEventListener('input', () => sync(number.value, 'number'));

  const root = h(
    'div',
    { class: 'field lab-range' },
    h('label', { for: id }, label, optional && h('span', { class: 'field__opt', text: ' (optional)' })),
    h(
      'div',
      { class: 'lab-range__row' },
      slider,
      h('div', { class: 'lab-range__input' }, prefix && h('span', { class: 'lab-range__affix', text: prefix }), number, suffix && h('span', { class: 'lab-range__affix', text: suffix })),
    ),
    hint && h('p', { class: 'field__hint text-muted', id: hintId, text: hint }),
    error,
  );
  root.setValue = (next) => {
    number.value = next ?? '';
    slider.value = next ?? min;
    number.removeAttribute('aria-invalid');
    error.hidden = true;
  };
  return root;
}

/** Form wrapper for live calculators: Enter never submits or navigates. */
export function inputForm(label, ...children) {
  const form = h('form', { class: 'lab-panel lab-inputs', novalidate: true, 'aria-label': label }, ...children);
  form.addEventListener('submit', (event) => event.preventDefault());
  return form;
}

export function selectField({ label, value, options, onChange }) {
  const id = nextId('lab-select');
  const select = h(
    'select',
    { id },
    ...options.map((option) => {
      const item = h('option', { value: option.value, text: option.label });
      if (option.value === value) item.selected = true;
      return item;
    }),
  );
  select.addEventListener('change', () => onChange(select.value));
  const root = h('div', { class: 'field' }, h('label', { for: id, text: label }), select);
  root.setValue = (next) => {
    select.value = next;
  };
  return root;
}

export function metric({ label, value, sub = '', tone = '' }) {
  const valueEl = h('p', { class: 'lab-metric__value', text: value });
  const subEl = h('p', { class: 'lab-metric__sub text-muted', text: sub });
  const root = h('div', { class: `lab-metric${tone ? ` lab-metric--${tone}` : ''}` }, h('p', { class: 'lab-metric__label mono', text: label }), valueEl, subEl);
  root.update = (nextValue, nextSub = '') => {
    if (valueEl.textContent !== nextValue) {
      valueEl.textContent = nextValue;
      flash(valueEl);
    }
    subEl.textContent = nextSub;
    subEl.hidden = !nextSub;
  };
  subEl.hidden = !sub;
  return root;
}

export function flash(element) {
  if (reducedMotion.matches) return;
  element.classList.remove('is-updated');
  void element.offsetWidth;
  element.classList.add('is-updated');
}

export function notice(text, tone = 'info') {
  return h('p', { class: `lab-notice lab-notice--${tone}` }, icon(tone === 'warn' ? 'lightbulb' : 'sparkles'), h('span', { text }));
}

/** Accessible tabs (roving tabindex, arrow keys). Returns { root, select(index) }. */
export function tabs({ label, items, onSelect, initial = 0, className = '' }) {
  const baseId = nextId('lab-tabs');
  const buttons = items.map((item, index) =>
    h('button', {
      type: 'button',
      role: 'tab',
      class: 'lab-tab',
      id: `${baseId}-${index}`,
      'aria-selected': String(index === initial),
      tabindex: index === initial ? '0' : '-1',
      text: item.label,
    }),
  );
  const list = h('div', { class: `lab-tabs ${className}`.trim(), role: 'tablist', 'aria-label': label }, ...buttons);
  const select = (index, focus = false) => {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    if (focus) buttons[index].focus();
    onSelect(index, buttons[index].id);
  };
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[role="tab"]');
    if (button) select(buttons.indexOf(button));
  });
  list.addEventListener('keydown', (event) => {
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    const last = buttons.length - 1;
    const moves = { ArrowRight: current === last ? 0 : current + 1, ArrowLeft: current === 0 ? last : current - 1, Home: 0, End: last };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key], true);
  });
  return { root: list, select, ids: buttons.map((button) => button.id) };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = h('textarea', { class: 'sr-only', 'aria-hidden': 'true' });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/** Button that copies text and confirms the result, both visually and to screen readers. */
export function copyButton(getText, label = 'Copy results', { small = true } = {}) {
  const text = h('span', { text: label });
  const button = h('button', { type: 'button', class: `btn btn--ghost${small ? ' btn--sm' : ''} lab-copy` }, icon('copy'), text);
  const status = h('span', { class: 'sr-only', role: 'status' });
  button.addEventListener('click', async () => {
    const ok = await copyText(getText());
    text.textContent = ok ? 'Copied' : 'Copy failed';
    status.textContent = ok ? 'Copied to clipboard.' : 'Copy failed. Select the text to copy it manually.';
    button.classList.toggle('is-copied', ok);
    window.setTimeout(() => {
      text.textContent = label;
      button.classList.remove('is-copied');
    }, 1800);
  });
  return h('span', { class: 'lab-copy-wrap' }, button, status);
}

export function downloadCsv(filename, rows) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = h('a', { download: filename, class: 'sr-only' });
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function resetButton(onReset, label = 'Reset example') {
  const button = h('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, icon('refresh-cw'), label);
  button.addEventListener('click', onReset);
  return button;
}

/**
 * Horizontal bar chart built from plain elements so it stays readable and accessible.
 * rows: { label, value, display, best? }
 */
export function barChart({ title, rows, summary }) {
  const max = Math.max(...rows.map((row) => (Number.isFinite(row.value) ? Math.abs(row.value) : 0)), 0);
  return h(
    'figure',
    { class: 'lab-bars' },
    h('figcaption', { class: 'lab-bars__title mono', text: title }),
    h(
      'ul',
      { class: 'lab-bars__list' },
      ...rows.map((row) =>
        h(
          'li',
          { class: `lab-bars__row${row.best ? ' is-best' : ''}` },
          h('span', { class: 'lab-bars__label', text: row.label }),
          h(
            'span',
            { class: 'lab-bars__track', 'aria-hidden': 'true' },
            h('span', {
              class: 'lab-bars__fill',
              style: { '--w': max > 0 && Number.isFinite(row.value) && row.value !== 0 ? `${Math.max((Math.abs(row.value) / max) * 100, 2)}%` : '0%' },
            }),
          ),
          h('span', { class: 'lab-bars__value' }, row.display, row.best && h('span', { class: 'lab-best', text: 'Best' })),
        ),
      ),
    ),
    summary && h('p', { class: 'sr-only', text: summary }),
  );
}

export function sectionHeading(text, sub = '') {
  return h('div', { class: 'lab-heading' }, h('h3', { class: 'lab-heading__title', text }), sub && h('p', { class: 'lab-heading__sub text-muted', text: sub }));
}

export function disclosure(label, ...content) {
  const panelId = nextId('lab-disc');
  const toggle = h('button', { type: 'button', class: 'disclosure__toggle', 'aria-expanded': 'false', 'aria-controls': panelId }, icon('plus'), h('span', { text: label }));
  const root = h(
    'div',
    { class: 'lab-disclosure' },
    toggle,
    h('div', { class: 'disclosure__panel', id: panelId }, h('div', { class: 'disclosure__inner' }, ...content)),
  );
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    root.classList.toggle('is-open', open);
  });
  return root;
}
