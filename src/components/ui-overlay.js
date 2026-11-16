/**
 * Controlador de overlays accesibles (drawer y modal).
 *
 * Mantiene una pila en memoria: solo el overlay superior responde a teclado,
 * velo y cierre. El contenido es un nodo del DOM ya construido; el controlador
 * no interpreta HTML ni conoce el dominio.
 */

const stack = [];
let listening = false;
let titleSequence = 0;

function overlayRoot() {
  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }
  return root;
}

function workspaceElement() {
  return document.querySelector('.workspace');
}

function setBackgroundBlocked(blocked) {
  const workspace = workspaceElement();
  if (workspace) {
    if (blocked) workspace.setAttribute('aria-hidden', 'true');
    else workspace.removeAttribute('aria-hidden');
  }
  if (document.body) document.body.classList.toggle('has-overlay', blocked);
}

function focusableWithin(container) {
  if (!container) return [];
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  return [...container.querySelectorAll(selector)].filter(
    (element) => !element.hasAttribute('hidden') && !element.closest('[hidden]')
  );
}

function editableFieldsWithin(container) {
  if (!container) return [];
  return [
    ...container.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
  ].filter((element) => element.type !== 'hidden' && !element.hasAttribute('hidden') && !element.closest('[hidden]'));
}

function focusFirst(record) {
  const fields = editableFieldsWithin(record.body);
  if (fields.length > 0) {
    fields[0].focus();
    return;
  }
  if (record.titleEl) {
    record.titleEl.setAttribute('tabindex', '-1');
    record.titleEl.focus();
    return;
  }
  const candidates = focusableWithin(record.body);
  if (candidates.length > 0) candidates[0].focus();
}

function focusInside(record) {
  if (!record) return;
  const candidates = focusableWithin(record.body);
  const target = record.lastFocused && record.body.contains(record.lastFocused) ? record.lastFocused : candidates[0];
  if (target) target.focus();
  else if (record.titleEl) record.titleEl.focus();
}

function onKeydown(event) {
  const top = getTopOverlay();
  if (!top) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeOverlay(top.id);
    return;
  }

  if (event.key !== 'Tab') return;

  const candidates = focusableWithin(top.body);
  if (candidates.length === 0) {
    event.preventDefault();
    if (top.titleEl) {
      top.titleEl.setAttribute('tabindex', '-1');
      top.titleEl.focus();
    }
    return;
  }

  const first = candidates[0];
  const last = candidates[candidates.length - 1];
  const active = document.activeElement;
  const inside = top.element.contains(active);
  const onTitle = active === top.titleEl;

  if (event.shiftKey) {
    if (!inside || onTitle || active === first) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (!inside || onTitle || active === last) {
    event.preventDefault();
    first.focus();
  }
}

function onFocusIn(event) {
  const top = getTopOverlay();
  if (!top) return;
  if (top.element.contains(event.target)) return;
  event.stopPropagation();
  focusInside(top);
}

function startListening() {
  if (listening) return;
  listening = true;
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('focusin', onFocusIn);
}

function stopListening() {
  if (!listening) return;
  listening = false;
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('focusin', onFocusIn);
}

function afterStackChange() {
  if (stack.length === 0) {
    setBackgroundBlocked(false);
    stopListening();
    return;
  }
  setBackgroundBlocked(true);
  startListening();
}

/**
 * El overlay superior conserva el id `overlay-title`; los inferiores usan un
 * id único para no duplicar identificadores en el documento.
 */
function syncTitleIds() {
  stack.forEach((record, index) => {
    const id = index === stack.length - 1 ? 'overlay-title' : `overlay-title-${record.sequence}`;
    record.titleEl.id = id;
    record.element.setAttribute('aria-labelledby', id);
  });
}

function button(label, className, attributes = {}) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = label;
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

function openDiscardConfirmation(target) {
  if (stack.some((record) => record.id === 'confirm-discard')) {
    const existing = stack.find((record) => record.id === 'confirm-discard');
    focusInside(existing);
    return existing;
  }

  const content = document.createElement('div');
  content.className = 'overlay__confirm';

  const text = document.createElement('p');
  text.className = 'overlay__text';
  text.textContent = 'Tienes cambios sin guardar. Si descartas, se perderán.';
  content.appendChild(text);

  const actions = document.createElement('div');
  actions.className = 'overlay__actions';
  const keep = button('Seguir editando', 'btn btn-secondary', { 'data-cancel-discard': '' });
  const discard = button('Descartar', 'btn btn-danger', { 'data-confirm-discard': '' });
  actions.append(keep, discard);
  content.appendChild(actions);

  const record = openOverlay({
    id: 'confirm-discard',
    variant: 'modal',
    title: 'Descartar cambios',
    content,
    returnFocus: document.activeElement,
    isDirty: false
  });

  keep.addEventListener('click', () => {
    closeOverlay('confirm-discard', { force: true });
    focusInside(target);
  });

  discard.addEventListener('click', () => {
    closeOverlay('confirm-discard', { force: true });
    closeOverlay(target.id, { force: true, reason: 'discard' });
  });

  return record;
}

function requestDismiss(record) {
  if (getTopOverlay() !== record) return false;
  if (typeof record.isDirty === 'function' && record.isDirty()) {
    openDiscardConfirmation(record);
    return false;
  }
  return closeOverlay(record.id);
}

/**
 * Abre un overlay y lo apila sobre los existentes.
 *
 * @returns registro del overlay con `{ id, element, body, titleEl }`.
 */
export function openOverlay({
  id,
  variant = 'modal',
  title = '',
  content = null,
  returnFocus = null,
  onClose = null,
  isDirty = null
} = {}) {
  const existing = stack.find((record) => record.id === id);
  if (existing) closeOverlay(id, { force: true });

  titleSequence += 1;
  const layer = document.createElement('div');
  layer.className = 'overlay-layer';
  layer.dataset.overlayId = id || `overlay-${titleSequence}`;

  const backdrop = document.createElement('div');
  backdrop.className = 'overlay-backdrop';
  backdrop.setAttribute('data-overlay-backdrop', '');

  const dialog = document.createElement('div');
  dialog.className = 'overlay';
  if (id) dialog.id = id;
  dialog.dataset.variant = variant;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const header = document.createElement('header');
  header.className = 'overlay__header';
  const heading = document.createElement('h2');
  heading.className = 'overlay__title';
  heading.textContent = title;

  const closeButton = button('Cerrar', 'btn btn-ghost overlay__close', { 'data-close-overlay': '' });
  header.append(heading, closeButton);

  const body = document.createElement('div');
  body.className = 'overlay__body';
  if (content) body.appendChild(content);
  dialog.append(header, body);

  const record = {
    id: id || layer.dataset.overlayId,
    sequence: titleSequence,
    variant,
    element: dialog,
    layer,
    body,
    titleEl: heading,
    returnFocus,
    onClose,
    isDirty,
    lastFocused: null
  };

  layer.append(backdrop, dialog);
  overlayRoot().appendChild(layer);
  stack.push(record);
  syncTitleIds();

  backdrop.addEventListener('click', () => {
    requestDismiss(record);
  });
  closeButton.addEventListener('click', () => {
    requestDismiss(record);
  });
  dialog.addEventListener('focusin', (event) => {
    record.lastFocused = event.target;
  });

  afterStackChange();
  focusFirst(record);
  return record;
}

/**
 * Cierra un overlay por id. Si el overlay está sucio y no se fuerza, abre el
 * modal `confirm-discard` en lugar de cerrarlo.
 */
export function closeOverlay(id, { force = false, reason = 'close' } = {}) {
  const index = stack.findIndex((record) => record.id === id);
  if (index === -1) return false;

  const record = stack[index];
  const wasTop = index === stack.length - 1;
  if (!force && wasTop && typeof record.isDirty === 'function' && record.isDirty()) {
    openDiscardConfirmation(record);
    return false;
  }

  stack.splice(index, 1);
  record.layer.remove();
  syncTitleIds();
  afterStackChange();

  if (typeof record.onClose === 'function') record.onClose(reason);
  if (wasTop && record.returnFocus && document.contains(record.returnFocus)) {
    record.returnFocus.focus();
  }
  return true;
}

/** Devuelve el overlay superior o `null`. */
export function getTopOverlay() {
  return stack.length > 0 ? stack[stack.length - 1] : null;
}

/** Indica si algún overlay declara cambios sin guardar. */
export function hasDirtyOverlay() {
  return stack.some((record) => typeof record.isDirty === 'function' && record.isDirty());
}
