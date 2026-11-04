import { renderCustomFields, collectCustomFields, showCustomFieldErrors, clearCustomFieldErrors } from './custom-fields.js';

function qs(id){ return document.getElementById(id); }

export function clearEntityForm(){
  qs('entity-id').value = '';
  qs('name').value = '';
  qs('code').value = '';
  qs('taxId').value = '';
  qs('email').value = '';
  qs('phone').value = '';
  qs('address').value = '';
  qs('category').value = '';
  qs('description').value = '';
  qs('targetDate').value = '';
  qs('creditLimit').value = '';
  qs('paymentTerms').value = '';
  clearEntityErrors();
  renderCustomFields(qs('entity-custom-fields'), 'entity');
  qs('cancel-edit').hidden = true;
  qs('submit-button').textContent = 'Guardar';
}

export function clearEntityErrors(){
  ['name', 'code', 'email', 'targetDate', 'creditLimit'].forEach(f => { qs(`error-${f}`).textContent = ''; });
  clearCustomFieldErrors(qs('entity-custom-fields'));
}

export function startEntityEdit(entity){
  renderCustomFields(qs('entity-custom-fields'), 'entity', entity);
  qs('entity-id').value = entity.id;
  qs('name').value = entity.name || '';
  qs('code').value = entity.code || '';
  qs('taxId').value = entity.taxId || '';
  qs('email').value = entity.email || '';
  qs('phone').value = entity.phone || '';
  qs('address').value = entity.address || '';
  qs('category').value = entity.category || '';
  qs('description').value = entity.description || '';
  qs('targetDate').value = entity.targetDate || '';
  qs('creditLimit').value = entity.creditLimit === undefined ? '' : entity.creditLimit;
  qs('paymentTerms').value = entity.paymentTerms || '';
  clearEntityErrors();
  qs('cancel-edit').hidden = false;
  qs('submit-button').textContent = 'Actualizar';
}

export function collectEntityPayload(){
  return {
    name: qs('name').value,
    code: qs('code').value,
    taxId: qs('taxId').value,
    email: qs('email').value,
    phone: qs('phone').value,
    address: qs('address').value,
    category: qs('category').value,
    description: qs('description').value,
    targetDate: qs('targetDate').value,
    creditLimit: qs('creditLimit').value,
    paymentTerms: qs('paymentTerms').value,
    ...collectCustomFields(qs('entity-custom-fields'), 'entity')
  };
}

export function showEntityErrors(errors){
  qs('error-name').textContent = errors.name || '';
  qs('error-code').textContent = errors.code || '';
  qs('error-email').textContent = errors.email || '';
  qs('error-targetDate').textContent = errors.targetDate || '';
  qs('error-creditLimit').textContent = errors.creditLimit || '';
  showCustomFieldErrors(qs('entity-custom-fields'), 'entity', errors);
}
