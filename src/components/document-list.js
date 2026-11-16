function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function folioLabel(doc) {
  return `${doc.series ? `${doc.series}-` : ''}${doc.folio}`;
}

export function createDocumentItem(doc, entityName) {
  const li = document.createElement('li');
  li.className = 'document-item';
  const amount =
    doc.totalAmount !== undefined
      ? ` &middot; ${escapeHtml(String(doc.currency || ''))}${escapeHtml(String(doc.totalAmount))}`
      : '';
  const status = doc.status ? ` <span class="status-badge">${escapeHtml(doc.status)}</span>` : '';
  const info = document.createElement('span');
  info.innerHTML =
    `<strong>${escapeHtml(folioLabel(doc))}</strong> &middot; ${escapeHtml(doc.startDate)} &rarr; ${escapeHtml(doc.endDate)}` +
    `${doc.quantity ? ' &middot; ' + escapeHtml(String(doc.quantity)) + ' cant.' : ''}${amount}${status}` +
    `${entityName ? `<div class="muted">${escapeHtml(entityName)}</div>` : ''}`;
  li.appendChild(info);
  return li;
}

export function renderDocumentList(listEl, documents, entityNameFor) {
  listEl.innerHTML = '';
  if (!documents || documents.length === 0) return false;
  for (const d of documents) {
    listEl.appendChild(createDocumentItem(d, entityNameFor ? entityNameFor(d) : undefined));
  }
  return true;
}

/** Fila de oportunidad en la gestión: asunto, folio, etapa, monto, responsable y fechas. */
export function createOpportunityItem(doc, entityName) {
  const li = document.createElement('li');
  li.className = 'opportunity-item';

  const headline = document.createElement('div');
  headline.className = 'client-summary-headline';
  const title = document.createElement('strong');
  title.textContent = doc.opportunityTitle || 'Sin asunto';
  headline.appendChild(title);
  const badge = document.createElement('span');
  badge.className = 'status-badge';
  badge.textContent = doc.status || 'Sin etapa';
  headline.appendChild(badge);
  li.appendChild(headline);

  const amount =
    doc.totalAmount === undefined || doc.totalAmount === null
      ? 'sin monto'
      : `${doc.totalAmount} ${doc.currency || ''}`.trim();
  const meta = document.createElement('div');
  meta.className = 'client-summary-meta';
  meta.textContent = [
    `Folio: ${folioLabel(doc)}`,
    `Monto: ${amount}`,
    `Responsable: ${doc.opportunityOwner || 'sin información'}`,
    `Fechas: ${doc.startDate || 'sin información'} → ${doc.endDate || 'sin información'}`,
    `Cliente: ${entityName || 'sin información'}`
  ].join(' · ');
  li.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'link-button';
  edit.dataset.action = 'edit';
  edit.dataset.editDocument = doc.id || '';
  edit.setAttribute('aria-label', `Editar ${folioLabel(doc)}`);
  edit.textContent = 'Editar';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'link-button';
  remove.dataset.deleteDocument = doc.id || '';
  remove.textContent = 'Eliminar';
  actions.appendChild(edit);
  actions.appendChild(remove);
  li.appendChild(actions);

  return li;
}

export function renderOpportunityList(listEl, documents, entityNameFor) {
  listEl.innerHTML = '';
  if (!documents || documents.length === 0) return false;
  for (const doc of documents) {
    listEl.appendChild(createOpportunityItem(doc, entityNameFor ? entityNameFor(doc) : undefined));
  }
  return true;
}
