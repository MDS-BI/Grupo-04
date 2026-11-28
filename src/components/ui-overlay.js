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

/**
 * Diálogo de texto de una sola acción (p. ej. motivo de pérdida o resumen de
 * resolución). `onConfirm(value)` devuelve `true` para cerrar o un mensaje de
 * error para conservar lo escrito y seguir en el diálogo.
 */
export function openTextDialog({
  id = 'text-dialog',
  title = '',
  label = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  requiredMessage = 'Este campo es obligatorio',
  initialValue = '',
  returnFocus = null,
  onConfirm = null,
  onCancel = null
} = {}) {
  const content = document.createElement('div');
  content.className = 'overlay__confirm';

  const fieldWrap = document.createElement('div');
  const fieldLabel = document.createElement('label');
  fieldLabel.setAttribute('for', `${id}-input`);
  fieldLabel.textContent = label;
  const input = document.createElement('textarea');
  input.id = `${id}-input`;
  input.rows = 3;
  input.value = initialValue;
  input.setAttribute('aria-describedby', `${id}-error`);
  const error = document.createElement('div');
  error.className = 'error';
  error.id = `${id}-error`;
  error.setAttribute('aria-live', 'polite');
  fieldWrap.append(fieldLabel, input, error);
  content.appendChild(fieldWrap);

  const actions = document.createElement('div');
  actions.className = 'overlay__actions';
  const cancel = button(cancelLabel, 'btn btn-secondary', { 'data-dialog-cancel': '' });
  const confirm = button(confirmLabel, 'btn btn-primary', { 'data-dialog-confirm': '' });
  actions.append(cancel, confirm);
  content.appendChild(actions);

  const record = openOverlay({
    id,
    variant: 'modal',
    title,
    content,
    returnFocus: returnFocus || document.activeElement,
    isDirty: false,
    onClose: (reason) => {
      if (reason !== 'confirm' && typeof onCancel === 'function') onCancel();
    }
  });

  cancel.addEventListener('click', () => closeOverlay(id, { force: true, reason: 'cancel' }));

  confirm.addEventListener('click', () => {
    const value = String(input.value || '').trim();
    if (!value) {
      error.textContent = requiredMessage;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    let outcome = true;
    if (typeof onConfirm === 'function') outcome = onConfirm(value);
    if (outcome === true) {
      closeOverlay(id, { force: true, reason: 'confirm' });
      return;
    }
    if (typeof outcome === 'string') {
      error.textContent = outcome;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
  });

  input.focus();
  return record;
}

/** Solicita el motivo de pérdida al mover una oportunidad a Perdida. */
export function openLossReasonDialog({ onConfirm = null, onCancel = null, returnFocus = null } = {}) {
  return openTextDialog({
    id: 'loss-reason-dialog',
    title: 'Motivo de pérdida',
    label: 'Indica el motivo por el que se pierde la oportunidad',
    confirmLabel: 'Marcar como Perdida',
    requiredMessage: 'El motivo de pérdida es obligatorio',
    returnFocus,
    onConfirm,
    onCancel
  });
}

/**
 * Confirmación accesible reutilizable para acciones destructivas y para la
 * migración. `onConfirm` devuelve `true` para cerrar o una cadena de error.
 */
export function openConfirmDialog({
  id = 'confirm-dialog',
  title = 'Confirmar',
  message = [],
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  returnFocus = null,
  onConfirm = null,
  onCancel = null
} = {}) {
  const content = document.createElement('div');
  content.className = 'overlay__confirm';

  const lines = Array.isArray(message) ? message : [message];
  for (const line of lines.filter(Boolean)) {
    const text = document.createElement('p');
    text.className = 'overlay__text';
    text.textContent = line;
    content.appendChild(text);
  }

  const error = document.createElement('div');
  error.className = 'error';
  error.id = `${id}-error`;
  error.setAttribute('aria-live', 'polite');
  content.appendChild(error);

  const actions = document.createElement('div');
  actions.className = 'overlay__actions';
  const cancel = button(cancelLabel, 'btn btn-secondary', { 'data-dialog-cancel': '' });
  const confirm = button(confirmLabel, danger ? 'btn btn-danger' : 'btn btn-primary', {
    'data-dialog-confirm': ''
  });
  actions.append(cancel, confirm);
  content.appendChild(actions);

  openOverlay({
    id,
    variant: 'modal',
    title,
    content,
    returnFocus: returnFocus || document.activeElement,
    isDirty: false,
    onClose: (reason) => {
      if (reason !== 'confirm' && typeof onCancel === 'function') onCancel();
    }
  });

  cancel.addEventListener('click', () => closeOverlay(id, { force: true, reason: 'cancel' }));

  confirm.addEventListener('click', () => {
    let outcome = true;
    if (typeof onConfirm === 'function') outcome = onConfirm();
    if (outcome === true) {
      closeOverlay(id, { force: true, reason: 'confirm' });
      return;
    }
    if (typeof outcome === 'string') {
      error.textContent = outcome;
      confirm.focus();
    }
  });

  confirm.focus();
}

/**
 * Diálogo de selección de una opción. Devuelve el valor elegido en
 * `onConfirm(value)`; devolver `true` cierra el diálogo o una cadena muestra el
 * error y lo mantiene abierto.
 */
export function openSelectDialog({
  id = 'select-dialog',
  title = '',
  label = '',
  options = [],
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  requiredMessage = 'Selecciona una opción',
  returnFocus = null,
  onConfirm = null,
  onCancel = null
} = {}) {
  const content = document.createElement('div');
  content.className = 'overlay__confirm';

  const fieldWrap = document.createElement('div');
  const fieldLabel = document.createElement('label');
  fieldLabel.setAttribute('for', `${id}-select`);
  fieldLabel.textContent = label;
  const select = document.createElement('select');
  select.id = `${id}-select`;
  select.setAttribute('aria-describedby', `${id}-error`);
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Selecciona --';
  select.appendChild(placeholder);
  for (const option of options) {
    const item = document.createElement('option');
    item.value = String(option.value);
    item.textContent = option.label;
    select.appendChild(item);
  }
  const error = document.createElement('div');
  error.className = 'error';
  error.id = `${id}-error`;
  error.setAttribute('aria-live', 'polite');
  fieldWrap.append(fieldLabel, select, error);
  content.appendChild(fieldWrap);

  const actions = document.createElement('div');
  actions.className = 'overlay__actions';
  const cancel = button(cancelLabel, 'btn btn-secondary', { 'data-dialog-cancel': '' });
  const confirm = button(confirmLabel, 'btn btn-primary', { 'data-dialog-confirm': '' });
  actions.append(cancel, confirm);
  content.appendChild(actions);

  openOverlay({
    id,
    variant: 'modal',
    title,
    content,
    returnFocus: returnFocus || document.activeElement,
    isDirty: false,
    onClose: (reason) => {
      if (reason !== 'confirm' && typeof onCancel === 'function') onCancel();
    }
  });

  cancel.addEventListener('click', () => closeOverlay(id, { force: true, reason: 'cancel' }));

  confirm.addEventListener('click', () => {
    const value = String(select.value || '').trim();
    if (!value) {
      error.textContent = requiredMessage;
      select.setAttribute('aria-invalid', 'true');
      select.focus();
      return;
    }
    let outcome = true;
    if (typeof onConfirm === 'function') outcome = onConfirm(value);
    if (outcome === true) {
      closeOverlay(id, { force: true, reason: 'confirm' });
      return;
    }
    if (typeof outcome === 'string') {
      error.textContent = outcome;
      select.setAttribute('aria-invalid', 'true');
      select.focus();
    }
  });

  select.focus();
}

/**
 * Pide el contacto de destino antes de eliminar un contacto con registros
 * vinculados, para no dejar referencias huérfanas.
 */
export function openContactReassignDialog({
  contacts = [],
  contactName = '',
  count = 0,
  onConfirm = null,
  onCancel = null,
  returnFocus = null
} = {}) {
  return openSelectDialog({
    id: 'contact-reassign-dialog',
    title: 'Reasignar registros del contacto',
    label:
      `El contacto ${contactName} tiene ${count} ${count === 1 ? 'registro vinculado' : 'registros vinculados'}. ` +
      'Elige el contacto que los recibirá antes de eliminarlo:',
    options: contacts.map((contact) => ({
      value: contact.id,
      label: contact.role ? `${contact.name} — ${contact.role}` : contact.name
    })),
    confirmLabel: 'Reasignar y eliminar',
    requiredMessage: 'Selecciona el contacto de destino',
    returnFocus,
    onConfirm,
    onCancel
  });
}
