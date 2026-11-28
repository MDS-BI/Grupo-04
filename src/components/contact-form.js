/**
 * Formulario de contacto (US-12). No escribe en el almacenamiento: recolecta
 * datos y muestra errores; `app.js` decide la persistencia.
 */

function qs(id) {
  return document.getElementById(id);
}

export function clearContactForm() {
  if (!qs('contact-form')) return;
  qs('contact-id').value = '';
  qs('contact-name').value = '';
  qs('contact-role').value = '';
  qs('contact-email').value = '';
  qs('contact-phone').value = '';
  qs('contact-primary').checked = false;
  clearContactErrors();
  qs('contact-submit').textContent = 'Agregar contacto';
  qs('contact-cancel').hidden = true;
  const message = qs('contact-message');
  if (message) {
    message.textContent = '';
    message.className = 'message';
  }
}

export function startContactEdit(contact) {
  qs('contact-id').value = contact.id;
  qs('contact-name').value = contact.name || '';
  qs('contact-role').value = contact.role || '';
  qs('contact-email').value = contact.email || '';
  qs('contact-phone').value = contact.phone || '';
  qs('contact-primary').checked = contact.isPrimary === true;
  clearContactErrors();
  qs('contact-submit').textContent = 'Actualizar contacto';
  qs('contact-cancel').hidden = false;
}

export function collectContactPayload() {
  return {
    entityId: qs('contact-entity-id') ? qs('contact-entity-id').value : '',
    name: qs('contact-name').value,
    role: qs('contact-role').value,
    email: qs('contact-email').value,
    phone: qs('contact-phone').value,
    isPrimary: Boolean(qs('contact-primary') && qs('contact-primary').checked)
  };
}

const CONTACT_ERRORS = [
  ['name', 'contact-name', 'error-contact-name'],
  ['email', 'contact-email', 'error-contact-email']
];

export function clearContactErrors() {
  for (const [, inputId, errorId] of CONTACT_ERRORS) {
    const error = qs(errorId);
    if (error) error.textContent = '';
    const input = qs(inputId);
    if (input) input.removeAttribute('aria-invalid');
  }
}

export function showContactErrors(errors = {}) {
  for (const [key, inputId, errorId] of CONTACT_ERRORS) {
    const error = qs(errorId);
    if (error) error.textContent = errors[key] || '';
    const input = qs(inputId);
    if (input) {
      if (errors[key]) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
}
