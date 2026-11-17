import { CONFIG } from './config.js?v=1.0.47';
import { qs, qsa } from './utils.js?v=1.0.47';

const { endpoint, extraFields = {}, subjectPrefix, minFillMs, cooldownMs } = CONFIG.contact;
const COOLDOWN_KEY = 'sm-contact-last-sent';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Field validators return an error message, or an empty string when the value is valid. */
const validators = {
  name: (value) => (value.trim().length < 2 ? 'Please enter your full name.' : ''),
  email: (value) => (EMAIL_PATTERN.test(value.trim()) ? '' : 'Please enter a valid email address.'),
  purpose: (value) => (value ? '' : 'Please choose the purpose of your inquiry.'),
  message: (value) => (value.trim().length < 20 ? 'Please write at least 20 characters so I can understand your message.' : ''),
};

function setFieldError(field, message) {
  const error = document.getElementById(field.getAttribute('aria-describedby')?.split(' ').find((id) => id.endsWith('-error')));
  if (message) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');
  if (error) {
    error.textContent = message;
    error.hidden = !message;
  }
  return !message;
}

function validateField(field) {
  const validate = validators[field.name];
  return validate ? setFieldError(field, validate(field.value)) : true;
}

function buildPayload(form) {
  const data = new FormData(form);
  return {
    name: data.get('name').trim(),
    email: data.get('email').trim(),
    company: data.get('company').trim(),
    purpose: data.get('purpose'),
    message: data.get('message').trim(),
  };
}

function payloadLines(payload) {
  const lines = [`Name: ${payload.name}`, `Email: ${payload.email}`];
  if (payload.company) lines.push(`Company: ${payload.company}`);
  lines.push(`Purpose: ${payload.purpose}`, '', payload.message);
  return lines;
}

let contactEmail = qs('[data-contact-email]')?.dataset.contactEmail ?? '';

/** The address mail falls back to (portfolio.json first, then the static data-contact-email attribute). */
export const getContactEmail = () => contactEmail;

export function setStatus(element, type, message, extra) {
  element.className = `form-status${type ? ` form-status--${type}` : ''}`;
  element.replaceChildren(message);
  if (extra) element.append(' ', extra);
}

export function emailLink(email = contactEmail) {
  const link = document.createElement('a');
  link.href = `mailto:${email}`;
  link.textContent = email;
  return link;
}

/**
 * Shared spam checks for every form that sends a message (contact form, Growth Lab brief).
 * Returns { ok: true } or { ok: false, silent, message }. A filled honeypot fails silently.
 */
export function guardSubmission({ honeypot = '', startedAt = 0 } = {}) {
  if (honeypot) return { ok: false, silent: true, message: '' };
  if (startedAt && Date.now() - startedAt < minFillMs) {
    return { ok: false, silent: false, message: 'That was quick. Please review your message and send it again.' };
  }
  const lastSent = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
  if (Date.now() - lastSent < cooldownMs) {
    return { ok: false, silent: false, message: 'Please wait a moment before sending another message.' };
  }
  return { ok: true, silent: false, message: '' };
}

/**
 * Delivers a message through CONFIG.contact.endpoint (JSON POST) when configured,
 * otherwise opens the visitor's email app with a prefilled draft.
 * Resolves to 'sent' or 'mailto'; rejects when the endpoint request fails.
 */
export async function deliverMessage({ subject, lines, payload }) {
  if (!endpoint) {
    const href = `mailto:${contactEmail}?subject=${encodeURIComponent(`${subjectPrefix}: ${subject}`)}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = href;
    return 'mailto';
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...extraFields, subject: `${subjectPrefix}: ${subject}`, ...payload }),
  });
  if (!response.ok) throw new Error(`Form service responded with ${response.status}.`);
  sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  return 'sent';
}

/** Contact form: validation, spam prevention and delivery via endpoint or mailto. */
export function initContact(contact = {}) {
  initCopyButtons();

  const form = qs('[data-contact-form]');
  if (!form) return;

  form.noValidate = true;

  const status = qs('[data-form-status]', form);
  const submit = qs('[type="submit"]', form);
  const label = qs('.btn__label', submit);
  const purpose = qs('#cf-purpose', form);
  contactEmail = contact.email ?? form.dataset.contactEmail ?? contactEmail;
  let firstInteraction = 0;

  // Inquiry types come from portfolio.json; the static options remain as a fallback.
  if (purpose && contact.inquiryTypes?.length) {
    const placeholder = purpose.options[0];
    purpose.replaceChildren(placeholder, ...contact.inquiryTypes.map((type) => new Option(type, type)));
  }

  const fields = qsa('input, select, textarea', form).filter((field) => field.name in validators);

  form.addEventListener('focusin', () => {
    if (!firstInteraction) firstInteraction = Date.now();
  });

  form.addEventListener('focusout', (event) => {
    if (fields.includes(event.target) && event.target.value !== '') validateField(event.target);
  });

  form.addEventListener('input', (event) => {
    if (fields.includes(event.target) && event.target.hasAttribute('aria-invalid')) validateField(event.target);
  });

  const setBusy = (busy, text) => {
    submit.disabled = busy;
    submit.setAttribute('aria-busy', String(busy));
    label.textContent = text;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(status, '', '');

    const results = fields.map((field) => validateField(field));
    if (results.includes(false)) {
      fields.find((field) => field.hasAttribute('aria-invalid'))?.focus();
      setStatus(status, 'error', 'Please fix the highlighted fields and try again.');
      return;
    }

    // Honeypot: real visitors never see or fill this field.
    const guard = guardSubmission({ honeypot: qs('[name="website"]', form).value, startedAt: firstInteraction });
    if (!guard.ok) {
      if (!guard.silent) setStatus(status, 'error', guard.message);
      return;
    }

    const payload = buildPayload(form);
    setBusy(true, endpoint ? 'Sending…' : 'Opening email…');
    try {
      const result = await deliverMessage({ subject: payload.purpose, lines: payloadLines(payload), payload });
      if (result === 'mailto') {
        setStatus(
          status,
          'info',
          'Your email app should open with this message ready to send. Nothing is sent until you press send there. If it does not open, email me directly at',
          emailLink(),
        );
      } else {
        form.reset();
        setStatus(status, 'success', 'Thank you. Your message has been sent and I will be in touch soon.');
      }
    } catch {
      setStatus(status, 'error', 'Sorry, your message could not be sent. Please try again, or email me directly at', emailLink());
    } finally {
      if (endpoint) setBusy(false, 'Send message');
      else window.setTimeout(() => setBusy(false, 'Send message'), 1500);
    }
  });
}

/** Copy-to-clipboard for contact details (delegated, so it works for rendered buttons). */
function initCopyButtons() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;

    const defaultLabel = button.dataset.label ?? button.getAttribute('aria-label');
    button.dataset.label = defaultLabel;

    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.classList.add('is-copied');
      button.setAttribute('aria-label', 'Copied to clipboard');
    } catch {
      button.setAttribute('aria-label', 'Copy failed. Select the text to copy it manually.');
    }

    window.setTimeout(() => {
      button.classList.remove('is-copied');
      button.setAttribute('aria-label', defaultLabel);
    }, 1800);
  });
}
