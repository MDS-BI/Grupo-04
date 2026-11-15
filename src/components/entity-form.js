import {
  renderCustomFields,
  collectCustomFields,
  showCustomFieldErrors,
  clearCustomFieldErrors
} from './custom-fields.js';

function qs(id) {
  return document.getElementById(id);
}

const ENTITY_ERROR_FIELDS = ['name', 'code', 'category', 'email', 'targetDate', 'creditLimit'];

export function clearEntityForm() {
  qs('entity-id').value = '';
  qs('name').value = '';
  qs('code').value = '';
  const category = qs('category');
  if (category) category.value = '';
  qs('email').value = '';
  qs('phone').value = '';
  qs('description').value = '';
  qs('targetDate').value = '';
  if (qs('taxId')) qs('taxId').value = '';
  if (qs('address')) qs('address').value = '';
  if (qs('creditLimit')) qs('creditLimit').value = '';
  if (qs('paymentTerms')) qs('paymentTerms').value = '';
  clearEntityErrors();
  renderCustomFields(qs('entity-custom-fields'), 'entity');
  qs('cancel-edit').hidden = true;
  qs('submit-button').textContent = 'Guardar';
  const message = qs('entity-message');
  if (message) {
    message.textContent = '';
    message.className = 'message';
  }
}

export function clearEntityErrors() {
  ENTITY_ERROR_FIELDS.forEach((f) => {
    const el = qs(`error-${f}`);
    if (el) el.textContent = '';
    const input = qs(f);
    if (input) input.removeAttribute('aria-invalid');
  });
  clearCustomFieldErrors(qs('entity-custom-fields'));
}

export function startEntityEdit(entity) {
  renderCustomFields(qs('entity-custom-fields'), 'entity', entity);
  qs('entity-id').value = entity.id;
  qs('name').value = entity.name || '';
  qs('code').value = entity.code || '';
  if (qs('category')) qs('category').value = entity.category || '';
  qs('email').value = entity.email || '';
  qs('phone').value = entity.phone || '';
  qs('description').value = entity.description || '';
  qs('targetDate').value = entity.targetDate || '';
  if (qs('taxId')) qs('taxId').value = entity.taxId || '';
  if (qs('address')) qs('address').value = entity.address || '';
  if (qs('creditLimit')) qs('creditLimit').value = entity.creditLimit === undefined ? '' : entity.creditLimit;
  if (qs('paymentTerms')) qs('paymentTerms').value = entity.paymentTerms || '';
  clearEntityErrors();
  qs('cancel-edit').hidden = false;
  qs('submit-button').textContent = 'Actualizar';
  const message = qs('entity-message');
  if (message) {
    message.textContent = '';
    message.className = 'message';
  }
}

export function collectEntityPayload() {
  return {
    name: qs('name').value,
    code: qs('code').value,
    category: qs('category') ? qs('category').value : '',
    email: qs('email').value,
    phone: qs('phone').value,
    description: qs('description').value,
    targetDate: qs('targetDate').value,
    taxId: qs('taxId') ? qs('taxId').value : '',
    address: qs('address') ? qs('address').value : '',
    creditLimit: qs('creditLimit') ? qs('creditLimit').value : '',
    paymentTerms: qs('paymentTerms') ? qs('paymentTerms').value : '',
    ...collectCustomFields(qs('entity-custom-fields'), 'entity')
  };
}

export function showEntityErrors(errors = {}) {
  ENTITY_ERROR_FIELDS.forEach((f) => {
    const el = qs(`error-${f}`);
    if (el) el.textContent = errors[f] || '';
    const input = qs(f);
    if (input) {
      if (errors[f]) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  });
  showCustomFieldErrors(qs('entity-custom-fields'), 'entity', errors);
}
