import { renderCustomFields, collectCustomFields, showCustomFieldErrors, clearCustomFieldErrors } from './custom-fields.js';
import { getConfig } from '../module-config.js';

function qs(id){ return document.getElementById(id); }

function allowedStatusesFor(currentStatus){
  const lc = getConfig().statusLifecycle;
  if(!lc) return null;
  if(currentStatus === undefined || currentStatus === null || currentStatus === ''){
    return [...lc.statuses];
  }
  const next = lc.transitions[currentStatus] || [];
  return [currentStatus, ...next.filter(s => s !== currentStatus)];
}

export function renderStatusControl(currentStatus){
  const container = qs('document-status-control');
  container.innerHTML = '';
  const allowed = allowedStatusesFor(currentStatus);
  const wrap = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', 'status');
  label.textContent = 'Estado';
  wrap.appendChild(label);
  let control;
  if(allowed){
    control = document.createElement('select');
    control.id = 'status';
    control.name = 'status';
    if(currentStatus === undefined || currentStatus === null || currentStatus === ''){
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '--';
      control.appendChild(blank);
    }
    for(const s of allowed){
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      control.appendChild(opt);
    }
  } else {
    control = document.createElement('input');
    control.id = 'status';
    control.name = 'status';
    control.type = 'text';
    control.placeholder = 'p. ej., pendiente';
  }
  wrap.appendChild(control);
  const err = document.createElement('div');
  err.className = 'error';
  err.id = 'error-status';
  err.setAttribute('aria-live', 'polite');
  wrap.appendChild(err);
  container.appendChild(wrap);
}

export function clearDocumentForm(){
  qs('document-id').value = '';
  qs('series').value = '';
  qs('folio').value = '';
  qs('startDate').value = '';
  qs('endDate').value = '';
  qs('quantity').value = '';
  qs('subtotal').value = '';
  qs('discount').value = '';
  qs('taxAmount').value = '';
  qs('totalAmount').value = '';
  qs('currency').value = '';
  qs('docPaymentTerms').value = '';
  qs('notes').value = '';
  clearDocumentErrors();
  renderCustomFields(qs('document-custom-fields'), 'document');
  renderStatusControl('');
  qs('document-cancel-edit').hidden = true;
  qs('document-submit-button').textContent = 'Guardar Documento';
}

const DOCUMENT_ERROR_FIELDS = ['entityId', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'status'];

export function clearDocumentErrors(){
  DOCUMENT_ERROR_FIELDS.forEach(f => {
    const elId = f === 'entityId' ? 'error-document-entity' : `error-${f}`;
    const el = qs(elId);
    if(el) el.textContent = '';
  });
  clearCustomFieldErrors(qs('document-custom-fields'));
}

export function startDocumentEdit(doc){
  renderCustomFields(qs('document-custom-fields'), 'document', doc);
  qs('document-id').value = doc.id;
  qs('document-entity-id').value = doc.entity_id;
  qs('document-entity').value = doc.entity_id;
  qs('series').value = doc.series || '';
  qs('folio').value = doc.folio === undefined ? '' : doc.folio;
  qs('startDate').value = doc.startDate || '';
  qs('endDate').value = doc.endDate || '';
  qs('quantity').value = doc.quantity === undefined ? '' : doc.quantity;
  qs('subtotal').value = doc.subtotal === undefined ? '' : doc.subtotal;
  qs('discount').value = doc.discount === undefined ? '' : doc.discount;
  qs('taxAmount').value = doc.taxAmount === undefined ? '' : doc.taxAmount;
  qs('totalAmount').value = doc.totalAmount === undefined ? '' : doc.totalAmount;
  qs('currency').value = doc.currency || '';
  qs('docPaymentTerms').value = doc.paymentTerms || '';
  qs('notes').value = doc.notes || '';
  renderStatusControl(doc.status);
  setStatusValue(doc.status);
  clearDocumentErrors();
  qs('document-cancel-edit').hidden = false;
  qs('document-submit-button').textContent = 'Actualizar Documento';
}

function setStatusValue(value){
  const control = qs('status');
  if(control) control.value = value || '';
}

export function collectDocumentPayload(){
  return {
    entityId: qs('document-entity-id').value || qs('document-entity').value,
    series: qs('series').value,
    folio: qs('folio').value,
    startDate: qs('startDate').value,
    endDate: qs('endDate').value,
    quantity: qs('quantity').value,
    subtotal: qs('subtotal').value,
    discount: qs('discount').value,
    taxAmount: qs('taxAmount').value,
    totalAmount: qs('totalAmount').value,
    currency: qs('currency').value,
    paymentTerms: qs('docPaymentTerms').value,
    notes: qs('notes').value,
    status: qs('status') ? qs('status').value : '',
    ...collectCustomFields(qs('document-custom-fields'), 'document')
  };
}

export function showDocumentErrors(errors){
  for(const f of DOCUMENT_ERROR_FIELDS){
    const elId = f === 'entityId' ? 'error-document-entity' : `error-${f}`;
    const el = qs(elId);
    if(el) el.textContent = errors[f] || '';
  }
  showCustomFieldErrors(qs('document-custom-fields'), 'document', errors);
}
