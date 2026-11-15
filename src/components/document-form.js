import {
  renderCustomFields,
  collectCustomFields,
  showCustomFieldErrors,
  clearCustomFieldErrors
} from './custom-fields.js';
import { getConfig, isCrmProfile, labelFor } from '../module-config.js';

function qs(id) {
  return document.getElementById(id);
}

function allowedStatusesFor(currentStatus) {
  const lc = getConfig().statusLifecycle;
  if (!lc) return null;
  if (currentStatus === undefined || currentStatus === null || currentStatus === '') {
    return [...lc.statuses];
  }
  const next = lc.transitions[currentStatus] || [];
  return [currentStatus, ...next.filter((s) => s !== currentStatus)];
}

function saveButtonLabel(editing) {
  if (isCrmProfile(getConfig())) {
    return `${editing ? 'Actualizar' : 'Guardar'} ${labelFor('document').toLowerCase()}`;
  }
  return editing ? 'Actualizar Documento' : 'Guardar Documento';
}

/** Muestra el motivo de pérdida solo cuando la etapa elegida es Perdida. */
export function syncLossReasonVisibility() {
  const input = qs('cf-lossReason');
  if (!input) return;
  const wrap = input.closest('.custom-field');
  const status = qs('status') ? qs('status').value : '';
  const visible = isCrmProfile(getConfig()) && status === 'Perdida';
  if (wrap) wrap.hidden = !visible;
  if (!visible) input.removeAttribute('aria-required');
  else input.setAttribute('aria-required', 'true');
}

export function renderStatusControl(currentStatus) {
  const container = qs('document-status-control');
  if (!container) return;
  container.innerHTML = '';
  const crm = isCrmProfile(getConfig());
  const wrap = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', 'status');
  label.textContent = crm ? 'Etapa' : 'Estado';
  wrap.appendChild(label);
  let control;
  if (crm && (currentStatus === undefined || currentStatus === null || currentStatus === '')) {
    control = document.createElement('input');
    control.type = 'hidden';
    control.id = 'status';
    control.name = 'status';
    control.value = 'Nueva';
    wrap.appendChild(control);
    const display = document.createElement('p');
    display.className = 'fixed-value';
    display.id = 'status-display';
    display.textContent = 'Nueva (se fija al crear la oportunidad)';
    wrap.appendChild(display);
  } else {
    const allowed = allowedStatusesFor(currentStatus);
    if (allowed) {
      control = document.createElement('select');
      control.id = 'status';
      control.name = 'status';
      if (currentStatus === undefined || currentStatus === null || currentStatus === '') {
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '--';
        control.appendChild(blank);
      }
      for (const s of allowed) {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        control.appendChild(opt);
      }
      control.addEventListener('change', syncLossReasonVisibility);
    } else {
      control = document.createElement('input');
      control.id = 'status';
      control.name = 'status';
      control.type = 'text';
      control.placeholder = 'p. ej., pendiente';
    }
    wrap.appendChild(control);
  }

  const err = document.createElement('div');
  err.className = 'error';
  err.id = 'error-status';
  err.setAttribute('aria-live', 'polite');
  const statusControl = wrap.querySelector('#status');
  if (statusControl) statusControl.setAttribute('aria-describedby', 'error-status');
  wrap.appendChild(err);
  container.appendChild(wrap);
  syncLossReasonVisibility();
}

export function clearDocumentForm() {
  qs('document-id').value = '';
  const fixed = qs('document-fixed');
  if (fixed && isCrmProfile(getConfig())) {
    fixed.textContent = 'Serie OPP · Moneda CLP · Etapa inicial Nueva';
  }
  if (qs('series')) qs('series').value = '';
  qs('folio').value = '';
  qs('startDate').value = '';
  qs('endDate').value = '';
  if (qs('quantity')) qs('quantity').value = '';
  if (qs('subtotal')) qs('subtotal').value = '';
  if (qs('discount')) qs('discount').value = '';
  if (qs('taxAmount')) qs('taxAmount').value = '';
  qs('totalAmount').value = '';
  if (qs('currency')) qs('currency').value = '';
  if (qs('docPaymentTerms')) qs('docPaymentTerms').value = '';
  qs('notes').value = '';
  clearDocumentErrors();
  renderCustomFields(qs('document-custom-fields'), 'document');
  renderStatusControl('');
  qs('document-cancel-edit').hidden = true;
  qs('document-submit-button').textContent = saveButtonLabel(false);
  syncLossReasonVisibility();
  const message = qs('opportunity-message');
  if (message) {
    message.textContent = '';
    message.className = 'message';
  }
}

const DOCUMENT_ERROR_FIELDS = [
  'entityId',
  'folio',
  'startDate',
  'endDate',
  'quantity',
  'subtotal',
  'discount',
  'taxAmount',
  'totalAmount',
  'status'
];

export function clearDocumentErrors() {
  DOCUMENT_ERROR_FIELDS.forEach((f) => {
    const elId = f === 'entityId' ? 'error-document-entity' : `error-${f}`;
    const el = qs(elId);
    if (el) el.textContent = '';
    const input = f === 'entityId' ? qs('document-entity') : qs(f);
    if (input) input.removeAttribute('aria-invalid');
  });
  clearCustomFieldErrors(qs('document-custom-fields'));
}

export function startDocumentEdit(doc) {
  renderCustomFields(qs('document-custom-fields'), 'document', doc);
  const fixed = qs('document-fixed');
  if (fixed && isCrmProfile(getConfig())) {
    fixed.textContent = `Serie ${doc.series || 'OPP'} · Moneda ${doc.currency || 'CLP'}`;
  }
  qs('document-id').value = doc.id;
  qs('document-entity-id').value = doc.entity_id;
  qs('document-entity').value = doc.entity_id;
  if (qs('series')) qs('series').value = doc.series || '';
  qs('folio').value = doc.folio === undefined ? '' : doc.folio;
  qs('startDate').value = doc.startDate || '';
  qs('endDate').value = doc.endDate || '';
  if (qs('quantity')) qs('quantity').value = doc.quantity === undefined ? '' : doc.quantity;
  if (qs('subtotal')) qs('subtotal').value = doc.subtotal === undefined ? '' : doc.subtotal;
  if (qs('discount')) qs('discount').value = doc.discount === undefined ? '' : doc.discount;
  if (qs('taxAmount')) qs('taxAmount').value = doc.taxAmount === undefined ? '' : doc.taxAmount;
  qs('totalAmount').value = doc.totalAmount === undefined ? '' : doc.totalAmount;
  if (qs('currency')) qs('currency').value = doc.currency || '';
  if (qs('docPaymentTerms')) qs('docPaymentTerms').value = doc.paymentTerms || '';
  qs('notes').value = doc.notes || '';
  renderStatusControl(doc.status);
  setStatusValue(doc.status);
  clearDocumentErrors();
  qs('document-cancel-edit').hidden = false;
  qs('document-submit-button').textContent = saveButtonLabel(true);
  syncLossReasonVisibility();
}

function setStatusValue(value) {
  const control = qs('status');
  if (control) control.value = value || '';
}

export function collectDocumentPayload() {
  const crm = isCrmProfile(getConfig());
  const statusEl = qs('status');
  let status = statusEl ? statusEl.value : '';
  if (crm && !qs('document-id').value) status = 'Nueva';
  return {
    entityId: qs('document-entity-id').value || qs('document-entity').value,
    series: qs('series') ? qs('series').value : '',
    folio: qs('folio').value,
    startDate: qs('startDate').value,
    endDate: qs('endDate').value,
    quantity: qs('quantity') ? qs('quantity').value : '',
    subtotal: qs('subtotal') ? qs('subtotal').value : '',
    discount: qs('discount') ? qs('discount').value : '',
    taxAmount: qs('taxAmount') ? qs('taxAmount').value : '',
    totalAmount: qs('totalAmount').value,
    currency: qs('currency') ? qs('currency').value : '',
    paymentTerms: qs('docPaymentTerms') ? qs('docPaymentTerms').value : '',
    notes: qs('notes').value,
    status,
    ...collectCustomFields(qs('document-custom-fields'), 'document')
  };
}

export function showDocumentErrors(errors = {}) {
  for (const f of DOCUMENT_ERROR_FIELDS) {
    const elId = f === 'entityId' ? 'error-document-entity' : `error-${f}`;
    const el = qs(elId);
    if (el) el.textContent = errors[f] || '';
    const input = f === 'entityId' ? qs('document-entity') : qs(f);
    if (input) {
      if (errors[f]) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
  showCustomFieldErrors(qs('document-custom-fields'), 'document', errors);
}
