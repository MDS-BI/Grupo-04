import { getTargetDateStatus, todayLocal } from '../crm-rules.js';

const SIN_INFORMACION = 'sin información';

function row(dl, label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent =
    value === undefined || value === null || String(value).trim() === '' ? SIN_INFORMACION : String(value);
  dl.appendChild(dt);
  dl.appendChild(dd);
}

function sectionHeading(text) {
  const heading = document.createElement('h3');
  heading.textContent = text;
  return heading;
}

function localDate(iso) {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatAmount(document) {
  if (document.totalAmount === undefined || document.totalAmount === null || document.totalAmount === '') {
    return SIN_INFORMACION;
  }
  return `${document.totalAmount} ${document.currency || 'CLP'}`.trim();
}

function folioLabel(document) {
  return `${document.series ? `${document.series}-` : ''}${document.folio}`;
}

/** Ficha del cliente en modo lectura, con sus oportunidades asociadas. */
export function renderEntityDetail(container, client, opportunities = [], today = todayLocal()) {
  container.innerHTML = '';

  const dl = document.createElement('dl');
  dl.className = 'detail-grid';
  row(dl, 'Nombre', client.name);
  row(dl, 'Código', client.code);
  row(dl, 'Tipo', client.category);
  row(dl, 'Responsable comercial', client.accountOwner);
  row(dl, 'Origen de captación', client.acquisitionSource);
  row(dl, 'Correo', client.email);
  row(dl, 'Teléfono', client.phone);
  row(dl, 'Contacto principal', client.contactName);
  row(dl, 'Descripción', client.description);
  row(
    dl,
    'Próximo contacto',
    client.targetDate ? `${client.targetDate} · ${getTargetDateStatus(client.targetDate, today)}` : 'Sin programar'
  );
  row(dl, 'Fecha de registro', localDate(client.createdAt));
  container.appendChild(dl);

  if (!String(client.email || '').trim() && !String(client.phone || '').trim()) {
    const note = document.createElement('p');
    note.className = 'notice';
    note.textContent = 'Contacto incompleto';
    container.appendChild(note);
  }

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'primary';
  create.dataset.newOpportunity = client.entity_id || '';
  create.textContent = 'Nueva oportunidad';
  actions.appendChild(create);
  container.appendChild(actions);

  container.appendChild(sectionHeading('Oportunidades asociadas'));
  if (!opportunities || opportunities.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Aún no hay oportunidades asociadas.';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'document-list';
  for (const opportunity of opportunities) {
    const item = document.createElement('li');
    item.className = 'document-item';
    const info = document.createElement('span');
    info.textContent = [
      opportunity.opportunityTitle || 'Sin asunto',
      folioLabel(opportunity),
      opportunity.status || 'Sin etapa',
      formatAmount(opportunity),
      opportunity.opportunityOwner || 'sin responsable'
    ].join(' · ');
    item.appendChild(info);
    if (opportunity.notes) {
      const notes = document.createElement('div');
      notes.className = 'muted';
      notes.textContent = opportunity.notes;
      item.appendChild(notes);
    }
    list.appendChild(item);
  }
  container.appendChild(list);
}

/** Detalle de una oportunidad en modo lectura. No abre el formulario de edición. */
export function renderOpportunityDetail(container, opportunity, client) {
  container.innerHTML = '';
  const dl = document.createElement('dl');
  dl.className = 'detail-grid';
  row(dl, 'Asunto', opportunity.opportunityTitle);
  row(dl, 'Folio', folioLabel(opportunity));
  row(dl, 'Etapa', opportunity.status);
  row(dl, 'Monto', formatAmount(opportunity));
  row(dl, 'Responsable', opportunity.opportunityOwner);
  row(dl, 'Fecha de apertura', opportunity.startDate);
  row(dl, 'Fecha de cierre', opportunity.endDate);
  row(dl, 'Cliente', client ? `${client.name} (${client.code})` : SIN_INFORMACION);
  row(dl, 'Notas', opportunity.notes);
  container.appendChild(dl);
}
