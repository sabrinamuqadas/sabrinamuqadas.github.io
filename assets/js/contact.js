import { CONFIG } from './config.js?v=1.0.13';
import { qs, qsa } from './utils.js?v=1.0.13';

const { endpoint, subjectPrefix, minFillMs, cooldownMs } = CONFIG.contact;
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

function buildMailto(email, payload) {
  const lines = [`Name: ${payload.name}`, `Email: ${payload.email}`];
  if (payload.company) lines.push(`Company: ${payload.company}`);
  lines.push(`Purpose: ${payload.purpose}`, '', payload.message);
  const body = lines.join('\n');

  return `mailto:${email}?subject=${encodeURIComponent(`${subjectPrefix}: ${payload.purpose}`)}&body=${encodeURIComponent(body)}`;
}

function setStatus(element, type, message, extra) {
  element.className = `form-status${type ? ` form-status--${type}` : ''}`;
  element.replaceChildren(message);
  if (extra) element.append(' ', extra);
}

function emailLink(email) {
  const link = document.createElement('a');
  link.href = `mailto:${email}`;
  link.textContent = email;
  return link;
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
  // Without portfolio.json the static form action still carries the address.
  const email = contact.email ?? form.getAttribute('action').replace(/^mailto:/, '');
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
    if (qs('[name="website"]', form).value) return;

    if (firstInteraction && Date.now() - firstInteraction < minFillMs) {
      setStatus(status, 'error', 'That was quick. Please review your message and send it again.');
      return;
    }

    const lastSent = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
    if (Date.now() - lastSent < cooldownMs) {
      setStatus(status, 'error', 'Please wait a moment before sending another message.');
      return;
    }

    const payload = buildPayload(form);

    if (!endpoint) {
      setBusy(true, 'Opening email…');
      window.location.href = buildMailto(email, payload);
      window.setTimeout(() => setBusy(false, 'Send message'), 1500);
      setStatus(
        status,
        'info',
        'Your email app should open with this message ready to send. Nothing is sent until you press send there. If it does not open, email me directly at',
        emailLink(email),
      );
      return;
    }

    setBusy(true, 'Sending…');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Form service responded with ${response.status}.`);
      sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      form.reset();
      setStatus(status, 'success', 'Thank you. Your message has been sent and I will be in touch soon.');
    } catch {
      setStatus(status, 'error', 'Sorry, your message could not be sent. Please try again, or email me directly at', emailLink(email));
    } finally {
      setBusy(false, 'Send message');
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
