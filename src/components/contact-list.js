/**
 * Lista de contactos de la ficha del cliente (US-12). Renderiza nodos con
 * `textContent`; no escribe en el almacenamiento.
 */

export function createContactItem(contact) {
  const li = document.createElement('li');
  li.className = 'contact-item';
  li.dataset.contactId = contact.id || '';

  const headline = document.createElement('div');
  headline.className = 'client-summary-headline';
  const name = document.createElement('strong');
  name.textContent = contact.name || 'Contacto sin nombre';
  headline.appendChild(name);
  if (contact.isPrimary) {
    const badge = document.createElement('span');
    badge.className = 'status-badge';
    badge.textContent = 'Principal';
    headline.appendChild(badge);
  }
  li.appendChild(headline);

  const meta = document.createElement('div');
  meta.className = 'client-summary-meta';
  meta.textContent = [contact.role || 'Sin cargo', contact.email || 'Sin correo', contact.phone || 'Sin teléfono'].join(
    ' · '
  );
  li.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'link-button';
  edit.dataset.editContact = contact.id || '';
  edit.textContent = 'Editar';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'link-button';
  remove.dataset.deleteContact = contact.id || '';
  remove.textContent = 'Eliminar';
  actions.append(edit, remove);
  li.appendChild(actions);

  return li;
}

export function renderContactList(listEl, contacts = []) {
  if (!listEl) return false;
  listEl.innerHTML = '';
  if (!contacts || contacts.length === 0) return false;
  for (const contact of contacts) listEl.appendChild(createContactItem(contact));
  return true;
}
