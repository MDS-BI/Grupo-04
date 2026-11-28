import { getTargetDateStatus, todayLocal } from '../crm-rules.js';
import { renderTimeline } from './timeline.js';
import { createContactItem } from './contact-list.js';
import { createActivityItem } from './activity-list.js';

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

/**
 * El contacto principal se deriva del contacto marcado `isPrimary`. Solo se
 * usa `contactName` heredado cuando el cliente aún no tiene contactos.
 */
function primaryContactValue(client, contacts = []) {
  const primary = (contacts || []).find((contact) => contact && contact.isPrimary === true);
  if (!primary) return client.contactName;
  return [primary.name, primary.role, primary.email, primary.phone]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

function contactLabel(contactId, contacts = []) {
  if (!String(contactId ?? '').trim()) return '';
  const contact = (contacts || []).find((item) => item && item.id === contactId);
  if (!contact) return 'Contacto no disponible';
  return contact.role ? `${contact.name} (${contact.role})` : contact.name;
}

function appendListSection(container, { heading, id, items, emptyText, renderItem, emptyCta }) {
  container.appendChild(sectionHeading(heading));
  if (!items || items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = emptyText;
    if (emptyCta) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'link-button';
      button.dataset.emptyCta = emptyCta.action;
      if (emptyCta.entityId) button.dataset.entityId = emptyCta.entityId;
      button.textContent = emptyCta.label;
      empty.append(' ', button);
    }
    container.appendChild(empty);
    return;
  }
  const list = document.createElement('ul');
  list.className = 'entity-list';
  list.id = id;
  for (const item of items) list.appendChild(renderItem(item));
  container.appendChild(list);
}

/** Ficha del cliente en modo lectura, con sus oportunidades asociadas. */
export function renderEntityDetail(container, client, opportunities = [], today = todayLocal(), options = {}) {
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
  row(dl, 'Contacto principal', primaryContactValue(client, options.contacts));
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
  if (options.showTicketAction) {
    const ticket = document.createElement('button');
    ticket.type = 'button';
    ticket.className = 'secondary';
    ticket.dataset.newTicket = client.entity_id || '';
    ticket.textContent = 'Nuevo ticket';
    actions.appendChild(ticket);
  }
  if (options.showContactAction) {
    const contact = document.createElement('button');
    contact.type = 'button';
    contact.className = 'secondary';
    contact.dataset.newContact = client.entity_id || '';
    contact.textContent = 'Nuevo contacto';
    actions.appendChild(contact);
  }
  if (options.showActivityAction) {
    const activity = document.createElement('button');
    activity.type = 'button';
    activity.className = 'secondary';
    activity.dataset.newActivity = client.entity_id || '';
    activity.textContent = 'Nueva actividad';
    actions.appendChild(activity);
  }
  container.appendChild(actions);

  if (options.showContactAction) {
    appendListSection(container, {
      heading: 'Contactos',
      id: 'detail-contact-list',
      items: options.contacts || [],
      emptyText: 'Este cliente aún no tiene contactos.',
      renderItem: createContactItem,
      emptyCta: { action: 'new-contact', entityId: client.entity_id, label: 'Agregar el primero' }
    });
  }

  if (options.showActivityAction) {
    appendListSection(container, {
      heading: 'Actividades',
      id: 'detail-activity-list',
      items: options.activities || [],
      emptyText: 'Este cliente aún no tiene actividades.',
      renderItem: (activity) => createActivityItem(activity, today),
      emptyCta: { action: 'new-activity', entityId: client.entity_id, label: 'Registrar la primera' }
    });
  }

  if (options.timeline) {
    container.appendChild(sectionHeading('Timeline'));
    const timeline = document.createElement('div');
    timeline.id = 'detail-timeline';
    container.appendChild(timeline);
    renderTimeline(timeline, {
      events: options.timeline.events || [],
      filters: options.timeline.filters || {},
      onChange: options.timeline.onChange,
      onSelect: options.timeline.onSelect,
      emptyCta: {
        action: 'new-activity',
        entityId: client.entity_id,
        label: 'Registrar la primera actividad'
      }
    });
  }

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
export function renderOpportunityDetail(container, opportunity, client, options = {}) {
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
  row(dl, 'Contacto', contactLabel(opportunity.contactId, options.contacts));
  row(dl, 'Notas', opportunity.notes);
  container.appendChild(dl);

  if (options.timeline) {
    container.appendChild(sectionHeading('Timeline de la oportunidad'));
    const timeline = document.createElement('div');
    timeline.id = 'opportunity-timeline';
    container.appendChild(timeline);
    renderTimeline(timeline, {
      events: options.timeline.events || [],
      filters: options.timeline.filters || {},
      onChange: options.timeline.onChange,
      onSelect: options.timeline.onSelect,
      emptyCta: {
        action: 'new-activity',
        entityId: opportunity.entity_id,
        documentId: opportunity.id,
        label: 'Registrar la primera actividad'
      }
    });
  }
}
