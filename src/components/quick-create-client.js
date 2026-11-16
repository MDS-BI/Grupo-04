import { getConfig } from '../module-config.js';
import { validateClient } from '../crm-rules.js';
import { loadEntities, addEntity } from '../storage.js';
import { openOverlay, closeOverlay } from './ui-overlay.js';

/**
 * Alta mínima de cliente para no abandonar el formulario de oportunidad.
 *
 * Reutiliza `validateClient` y `addEntity`: no introduce reglas nuevas ni
 * escribe directamente en el almacenamiento. El formulario vive en un modal
 * de `ui-overlay`, de modo que se apila sobre el drawer de oportunidad.
 */

const ID = 'quick-create-client';

const REQUIRED_FIELDS = [
  ['name', 'qc-name', 'error-qc-name', 'Nombre'],
  ['code', 'qc-code', 'error-qc-code', 'Código'],
  ['category', 'qc-category', 'error-qc-category', 'Tipo'],
  ['accountOwner', 'qc-account-owner', 'error-qc-account-owner', 'Responsable'],
  ['acquisitionSource', 'qc-acquisition-source', 'error-qc-acquisition-source', 'Origen']
];

const OPTIONAL_FIELDS = [
  ['email', 'qc-email', 'error-qc-email', 'Correo electrónico', 'email'],
  ['phone', 'qc-phone', null, 'Teléfono', 'text']
];

const FIELD_IDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(([, inputId]) => inputId);

const CATALOG_BY_FIELD = {
  category: 'category',
  accountOwner: 'accountOwner',
  acquisitionSource: 'acquisitionSource'
};

function buildField({ inputId, errorId, labelText, type = 'text', required = false, options = [] }) {
  const wrap = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', inputId);
  label.textContent = labelText;
  if (required) {
    const mark = document.createElement('span');
    mark.className = 'req';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = ' *';
    label.appendChild(mark);
  }
  wrap.appendChild(label);

  let control;
  if (options.length > 0) {
    control = document.createElement('select');
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '--';
    control.appendChild(blank);
    options.forEach((option) => {
      const node = document.createElement('option');
      node.value = option;
      node.textContent = option;
      control.appendChild(node);
    });
  } else {
    control = document.createElement('input');
    control.type = type;
  }
  control.id = inputId;
  control.name = inputId;
  if (required) control.setAttribute('aria-required', 'true');
  if (errorId) control.setAttribute('aria-describedby', errorId);
  wrap.appendChild(control);

  if (errorId) {
    const error = document.createElement('div');
    error.className = 'error';
    error.id = errorId;
    error.setAttribute('aria-live', 'polite');
    wrap.appendChild(error);
  }

  return wrap;
}

function catalogOptions(name) {
  const catalogs = (getConfig() && getConfig().catalogs) || {};
  return Array.isArray(catalogs[name]) ? catalogs[name] : [];
}

function readValues() {
  const values = {};
  FIELD_IDS.forEach((id) => {
    const control = document.getElementById(id);
    values[id] = control ? control.value : '';
  });
  return {
    name: values['qc-name'],
    code: values['qc-code'],
    category: values['qc-category'],
    accountOwner: values['qc-account-owner'],
    acquisitionSource: values['qc-acquisition-source'],
    email: values['qc-email'],
    phone: values['qc-phone']
  };
}

function showErrors(errors = {}) {
  REQUIRED_FIELDS.forEach(([key, inputId, errorId]) => {
    const error = document.getElementById(errorId);
    if (error) error.textContent = errors[key] || '';
    const control = document.getElementById(inputId);
    if (control) {
      if (errors[key]) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
  });
  OPTIONAL_FIELDS.forEach(([key, inputId, errorId]) => {
    if (!errorId) return;
    const error = document.getElementById(errorId);
    if (error) error.textContent = errors[key] || '';
    const control = document.getElementById(inputId);
    if (control) {
      if (errors[key]) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
  });
}

function focusFirstInvalid(form) {
  const invalid = form.querySelector('[aria-invalid="true"]');
  if (invalid && typeof invalid.focus === 'function') invalid.focus();
}

function buildForm() {
  const form = document.createElement('form');
  form.id = 'quick-create-form';
  form.noValidate = true;

  REQUIRED_FIELDS.forEach(([key, inputId, errorId, labelText]) => {
    form.appendChild(
      buildField({
        inputId,
        errorId,
        labelText,
        required: true,
        options: catalogOptions(CATALOG_BY_FIELD[key])
      })
    );
  });

  OPTIONAL_FIELDS.forEach(([, inputId, errorId, labelText, type]) => {
    form.appendChild(buildField({ inputId, errorId, labelText, type }));
  });

  const message = document.createElement('div');
  message.className = 'message';
  message.id = 'quick-create-message';
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  form.appendChild(message);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'btn btn-primary';
  save.setAttribute('data-quick-create-save', '');
  save.textContent = 'Guardar cliente';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-secondary';
  cancel.setAttribute('data-quick-create-cancel', '');
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', () => {
    closeOverlay(ID, { force: true });
  });

  actions.append(save, cancel);
  form.appendChild(actions);
  return form;
}

/**
 * Abre el modal de alta mínima. Devuelve el registro del overlay o `null` si
 * no hay un perfil CRM configurado.
 */
export function openQuickCreateClient({ onCreated = null, returnFocus = null } = {}) {
  const form = buildForm();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = readValues();
    let entities = [];
    try {
      entities = loadEntities();
    } catch (error) {
      const message = document.getElementById('quick-create-message');
      if (message) {
        message.textContent = error && error.message ? error.message : 'No se pudo leer la información guardada.';
        message.className = 'message message-error';
      }
      return;
    }

    const errors = validateClient(payload, { entities, currentId: null }).errors;
    showErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(form);
      return;
    }

    let created;
    try {
      created = addEntity(payload);
    } catch (error) {
      const message = document.getElementById('quick-create-message');
      if (message) {
        message.textContent = error && error.message ? error.message : 'No se pudo guardar el cliente.';
        message.className = 'message message-error';
      }
      focusFirstInvalid(form);
      return;
    }

    closeOverlay(ID, { force: true });
    if (typeof onCreated === 'function') onCreated(created);
  });

  return openOverlay({
    id: ID,
    variant: 'modal',
    title: 'Nuevo cliente',
    content: form,
    returnFocus: returnFocus || document.activeElement,
    isDirty: () => false
  });
}
