import { h, icon } from '../../components.js?v=1.0.47';
import { CONFIG } from '../../config.js?v=1.0.47';
import { deliverMessage, emailLink, guardSubmission, setStatus } from '../../contact.js?v=1.0.47';
import { clearState, loadState, saveState } from '../state.js?v=1.0.47';
import { copyButton, nextId, notice } from '../ui.js?v=1.0.47';

const TOOL = 'brief';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EXTRA_CHANNELS = ['Referrals', 'Paid ads', 'Events', 'No active channel yet'];

const EMPTY = { name: '', email: '', company: '', companyUrl: '', inquiry: '', channels: [], challenges: [], goal: '', timeline: '', budget: '' };

function field({ label, required = false, hint = '', control }) {
  const id = control.id || nextId('lab-brief');
  control.id = id;
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : '';
  control.setAttribute('aria-describedby', [hintId, errorId].filter(Boolean).join(' '));
  if (required) control.setAttribute('aria-required', 'true');
  const error = h('p', { class: 'field__error', id: errorId, hidden: true });
  const root = h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label, required ? h('span', { class: 'field__req', 'aria-hidden': 'true', text: ' *' }) : h('span', { class: 'field__opt', text: ' (optional)' })),
    control,
    hint && h('p', { class: 'field__hint text-muted', id: hintId, text: hint }),
    error,
  );
  root.showError = (message) => {
    error.textContent = message;
    error.hidden = !message;
    if (message) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  };
  return root;
}

function checkGroup({ legend, options, selected, required = false, onChange }) {
  const errorId = nextId('lab-group-error');
  const error = h('p', { class: 'field__error', id: errorId, hidden: true });
  const inputs = options.map((option) => {
    const input = h('input', { type: 'checkbox', value: option });
    input.checked = selected.includes(option);
    input.addEventListener('change', () => onChange(inputs.filter((item) => item.checked).map((item) => item.value)));
    return { input, label: h('label', { class: 'lab-check' }, input, h('span', { text: option })) };
  });
  const root = h(
    'fieldset',
    { class: 'lab-fieldset lab-checks', 'aria-describedby': errorId },
    h('legend', {}, legend, required ? h('span', { class: 'field__req', 'aria-hidden': 'true', text: ' *' }) : h('span', { class: 'field__opt', text: ' (optional)' })),
    h('div', { class: 'lab-checks__grid' }, ...inputs.map((item) => item.label)),
    error,
  );
  root.showError = (message) => {
    error.textContent = message;
    error.hidden = !message;
  };
  root.focusFirst = () => inputs[0]?.input.focus();
  return root;
}

const select = (options, value, placeholder) => {
  const element = h('select', {}, h('option', { value: '', text: placeholder }), ...options.map((option) => h('option', { value: option, text: option })));
  element.value = value;
  return element;
};

export function mount({ lab, portfolio, payload }) {
  const config = lab.brief;
  const state = loadState(TOOL, EMPTY);
  const channelOptions = [...lab.channels.available.map((channel) => channel.label), ...EXTRA_CHANNELS];
  const inquiryTypes = config.inquiryTypes;
  const email = portfolio?.contact?.email ?? '';
  let startedAt = 0;

  const controls = {
    name: h('input', { type: 'text', name: 'name', autocomplete: 'name', maxlength: 120, value: state.name }),
    email: h('input', { type: 'email', name: 'email', autocomplete: 'email', maxlength: 160, value: state.email }),
    company: h('input', { type: 'text', name: 'company', autocomplete: 'organization', maxlength: 160, value: state.company }),
    companyUrl: h('input', { type: 'url', name: 'companyUrl', autocomplete: 'url', inputmode: 'url', maxlength: 200, placeholder: 'https://', value: state.companyUrl }),
    inquiry: select(inquiryTypes, state.inquiry, 'Choose one'),
    goal: h('textarea', { name: 'goal', rows: 5, maxlength: 2000 }),
    timeline: select(config.timelines, state.timeline, 'Choose one'),
    budget: select(config.budgets, state.budget, 'Choose one'),
  };
  controls.goal.value = state.goal;
  Object.entries(controls).forEach(([key, control]) => {
    control.name = key;
  });

  const fields = {
    name: field({ label: 'Name', required: true, control: controls.name }),
    email: field({ label: 'Email', required: true, control: controls.email }),
    company: field({ label: 'Company', control: controls.company }),
    companyUrl: field({ label: 'Website', control: controls.companyUrl }),
    inquiry: field({ label: 'What is this about?', required: true, control: controls.inquiry }),
    goal: field({ label: 'Main goal for the next 3–6 months', required: true, hint: 'For example: "Book 10 qualified discovery calls a month with UK agencies."', control: controls.goal }),
    timeline: field({ label: 'Timeline', required: true, control: controls.timeline }),
    budget: field({ label: 'Monthly budget range', control: controls.budget }),
  };

  const channels = checkGroup({ legend: 'Current acquisition channels', options: channelOptions, selected: state.channels, onChange: (value) => ((state.channels = value), saveState(TOOL, state)) });
  const challenges = checkGroup({
    legend: 'Biggest challenges',
    options: config.challenges,
    selected: state.challenges,
    required: true,
    onChange: (value) => {
      state.challenges = value;
      if (value.length) challenges.showError('');
      saveState(TOOL, state);
    },
  });

  const contactConsent = h('input', { type: 'checkbox', name: 'consent' });
  const consentError = h('p', { class: 'field__error', hidden: true, text: 'Please confirm so I can reply to your brief.' });
  const consentField = h('div', { class: 'lab-consent' }, h('label', { class: 'lab-check' }, contactConsent, h('span', { text: 'I agree that the details above can be used to reply to this inquiry.' })), consentError);

  const includeSummary = h('input', { type: 'checkbox', name: 'includeSummary' });
  const handoff = payload?.summary
    ? h(
        'div',
        { class: 'lab-handoff' },
        h('label', { class: 'lab-check' }, includeSummary, h('span', { text: `Include my ${payload.source} results with this brief` })),
        h('pre', { class: 'lab-handoff__preview', text: payload.summary }),
        h('p', { class: 'field__hint text-muted', text: 'Off by default. Your results are only attached if you tick this box.' }),
      )
    : '';

  const honeypot = h('input', { type: 'text', name: 'fax', tabindex: '-1', autocomplete: 'off' });
  const status = h('div', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
  const submitLabel = h('span', { text: CONFIG.contact.endpoint ? 'Send brief' : 'Send brief by email' });
  const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, submitLabel, icon('send'));

  const validators = {
    name: (value) => (value.trim().length < 2 ? 'Please enter your name.' : ''),
    email: (value) => (EMAIL_PATTERN.test(value.trim()) ? '' : 'Please enter a valid email address.'),
    companyUrl: (value) => {
      if (!value.trim()) return '';
      try {
        const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
        return url.hostname.includes('.') ? '' : 'Please enter a valid website address.';
      } catch {
        return 'Please enter a valid website address.';
      }
    },
    inquiry: (value) => (value ? '' : 'Please choose what this is about.'),
    goal: (value) => (value.trim().length < 20 ? 'Please write at least 20 characters so I understand your goal.' : ''),
    timeline: (value) => (value ? '' : 'Please choose a timeline.'),
  };

  const validate = (key) => {
    const message = validators[key]?.(controls[key].value) ?? '';
    fields[key].showError(message);
    return !message;
  };

  const linesFor = (data) => {
    const lines = [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      data.company ? `Company: ${data.company}` : null,
      data.companyUrl ? `Website: ${data.companyUrl}` : null,
      `Inquiry: ${data.inquiry}`,
      `Timeline: ${data.timeline}`,
      data.budget ? `Budget: ${data.budget}` : null,
      data.channels.length ? `Current channels: ${data.channels.join(', ')}` : null,
      `Challenges: ${data.challenges.join(', ')}`,
      '',
      'Main goal:',
      data.goal,
    ];
    if (data.toolSummary) lines.push('', '---', data.toolSummary);
    return lines.filter((line) => line !== null);
  };

  const collect = () => ({
    name: controls.name.value.trim(),
    email: controls.email.value.trim(),
    company: controls.company.value.trim(),
    companyUrl: controls.companyUrl.value.trim(),
    inquiry: controls.inquiry.value,
    timeline: controls.timeline.value,
    budget: controls.budget.value,
    channels: state.channels,
    challenges: state.challenges,
    goal: controls.goal.value.trim(),
    toolSummary: payload?.summary && includeSummary.checked ? payload.summary : '',
  });

  const form = h(
    'form',
    { class: 'lab-brief', novalidate: true, 'aria-label': 'Strategy brief' },
    notice('Required fields are marked with *. Your draft is kept in this browser tab only until you send it or close the tab.'),
    h('div', { class: 'lab-inputs__pair' }, fields.name, fields.email),
    h('div', { class: 'lab-inputs__pair' }, fields.company, fields.companyUrl),
    fields.inquiry,
    channels,
    challenges,
    fields.goal,
    h('div', { class: 'lab-inputs__pair' }, fields.timeline, fields.budget),
    handoff,
    consentField,
    h('div', { class: 'hp', 'aria-hidden': 'true' }, h('label', {}, 'Leave this field empty', honeypot)),
    h('div', { class: 'lab-actions' }, submit),
    status,
  );

  form.addEventListener('focusin', () => {
    if (!startedAt) startedAt = Date.now();
  });
  form.addEventListener('input', (event) => {
    const key = event.target.name;
    if (key in EMPTY && key !== 'channels' && key !== 'challenges') {
      state[key] = event.target.value;
      saveState(TOOL, state);
    }
    if (key in validators && event.target.hasAttribute('aria-invalid')) validate(key);
  });
  form.addEventListener('focusout', (event) => {
    const key = event.target.name;
    if (key in validators && event.target.value !== '') validate(key);
  });
  contactConsent.addEventListener('change', () => {
    consentError.hidden = contactConsent.checked;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(status, '', '');

    const results = Object.keys(validators).map(validate);
    const hasChallenges = state.challenges.length > 0;
    challenges.showError(hasChallenges ? '' : 'Choose at least one challenge.');
    consentError.hidden = contactConsent.checked;

    if (results.includes(false) || !hasChallenges || !contactConsent.checked) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      else if (!hasChallenges) challenges.focusFirst();
      else contactConsent.focus();
      setStatus(status, 'error', 'Please fix the highlighted fields and try again.');
      return;
    }

    const guard = guardSubmission({ honeypot: honeypot.value, startedAt });
    if (!guard.ok) {
      if (!guard.silent) setStatus(status, 'error', guard.message);
      return;
    }

    const data = collect();
    const lines = linesFor(data);
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submitLabel.textContent = CONFIG.contact.endpoint ? 'Sending…' : 'Opening email…';

    try {
      const result = await deliverMessage({ subject: `Strategy brief: ${data.inquiry}`, lines, payload: { type: 'strategy-brief', ...data } });
      if (result === 'sent') {
        clearState(TOOL);
        form.replaceChildren(
          h(
            'div',
            { class: 'lab-state lab-state--success', role: 'status', tabindex: '-1' },
            icon('badge-check'),
            h('p', { text: 'Thank you. Your brief has been sent and I will reply by email soon.' }),
          ),
        );
        form.firstElementChild.focus();
        return;
      }
      setStatus(status, 'info', 'Your email app should open with the brief ready to send. Nothing is sent until you press send there. If it does not open, copy the brief below and email it to', emailLink(email || undefined));
      status.append(h('span', { class: 'lab-status-copy' }, copyButton(() => lines.join('\n'), 'Copy brief')));
    } catch {
      setStatus(status, 'error', 'Sorry, your brief could not be sent. Please try again, or email me directly at', emailLink(email || undefined));
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submitLabel.textContent = CONFIG.contact.endpoint ? 'Send brief' : 'Send brief by email';
    }
  });

  return h('div', { class: 'lab-tool' }, form);
}
