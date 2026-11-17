import { h, icon } from '../components.js?v=1.0.47';
import { reducedMotion } from '../utils.js?v=1.0.47';

/**
 * One shared <dialog> hosts every Growth Lab tool. Native showModal() provides the
 * focus trap, inert background and Escape handling; this module adds sizing,
 * scroll locking, loading/error states and focus restoration.
 */

let dialog = null;
let parts = null;
let trigger = null;
let options = {};
let onCloseHandlers = [];

function build() {
  const titleId = 'lab-modal-title';
  const descId = 'lab-modal-desc';
  parts = {
    icon: h('span', { class: 'icon-box lab-modal__icon', 'aria-hidden': 'true' }),
    title: h('h2', { class: 'lab-modal__title', id: titleId }),
    desc: h('p', { class: 'lab-modal__desc text-muted', id: descId }),
    close: h('button', { type: 'button', class: 'modal__close lab-modal__close', 'aria-label': 'Close tool' }, icon('x')),
    body: h('div', { class: 'lab-modal__body' }),
  };

  dialog = h(
    'dialog',
    { class: 'modal lab-modal', 'aria-labelledby': titleId, 'aria-describedby': descId, 'data-lab-modal': '' },
    h(
      'div',
      { class: 'lab-modal__shell' },
      h(
        'header',
        { class: 'lab-modal__header' },
        parts.icon,
        h('div', { class: 'lab-modal__heading' }, h('p', { class: 'lab-modal__eyebrow mono', text: 'Growth Lab' }), parts.title, parts.desc),
        parts.close,
      ),
      parts.body,
    ),
  );
  document.body.append(dialog);

  parts.close.addEventListener('click', () => closeLabModal());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && options.dismissOnBackdrop !== false) closeLabModal();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeLabModal();
  });
  dialog.addEventListener('close', finishClose);
}

function lockScroll(lock) {
  document.documentElement.classList.toggle('is-lab-locked', lock);
}

function finishClose() {
  dialog.classList.remove('is-closing');
  lockScroll(false);
  parts.body.replaceChildren();
  const handlers = onCloseHandlers;
  onCloseHandlers = [];
  handlers.forEach((handler) => handler());
  // Restore focus without moving the page — scroll jumps feel like the site "reset".
  if (trigger && trigger.isConnected && typeof trigger.focus === 'function') {
    trigger.focus({ preventScroll: true });
  }
  trigger = null;
}

export function closeLabModal() {
  if (!dialog?.open || dialog.classList.contains('is-closing')) return;
  if (reducedMotion.matches) {
    dialog.close();
    return;
  }
  dialog.classList.add('is-closing');
  const done = () => {
    if (dialog.open) dialog.close();
  };
  dialog.addEventListener('animationend', done, { once: true });
  window.setTimeout(done, 260);
}

export function onLabModalClose(handler) {
  onCloseHandlers.push(handler);
}

/** Updates header and size without closing (used when one tool hands off to another). */
export function setLabModalHeader({ title, description = '', iconName = 'sparkles', size = 'lg', dismissOnBackdrop = true }) {
  options = { dismissOnBackdrop };
  parts.icon.replaceChildren(icon(iconName));
  parts.title.textContent = title;
  parts.desc.textContent = description;
  parts.desc.hidden = !description;
  dialog.dataset.size = size;
}

/**
 * Opens (or re-targets) the modal and mounts content produced by render(body).
 * render may be async; a loading state shows until it resolves, an error state if it fails.
 */
export async function openLabModal({ title, description, iconName, size, dismissOnBackdrop, opener, render, onRetry }) {
  if (!dialog) build();
  if (opener !== undefined && !dialog.open) trigger = opener;
  setLabModalHeader({ title, description, iconName, size, dismissOnBackdrop });

  parts.body.replaceChildren(
    h('div', { class: 'lab-state', role: 'status' }, h('span', { class: 'lab-spinner', 'aria-hidden': 'true' }), h('span', { text: 'Loading tool…' })),
  );

  if (!dialog.open) {
    lockScroll(true);
    dialog.showModal();
    parts.close.focus();
  }
  parts.body.scrollTop = 0;

  try {
    const content = await render();
    if (!dialog.open) return;
    parts.body.replaceChildren(content);
    parts.body.scrollTop = 0;
  } catch (error) {
    console.error('Growth Lab tool could not be loaded:', error);
    const retry = h('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, icon('refresh-cw'), 'Try again');
    retry.addEventListener('click', () => onRetry?.());
    parts.body.replaceChildren(
      h(
        'div',
        { class: 'lab-state lab-state--error', role: 'alert' },
        h('p', { text: 'This tool could not be loaded. Check your connection and try again.' }),
        onRetry && retry,
      ),
    );
  }
}

export const labModalOpen = () => Boolean(dialog?.open);
