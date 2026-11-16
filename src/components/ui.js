/**
 * Primitivas de presentación reutilizables.
 *
 * No conoce el dominio, no consulta el almacenamiento y no interpreta HTML
 * ajeno: recibe datos y devuelve nodos del DOM ya construidos.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  chart: ['M3 16V8', 'M8 16V4', 'M13 16v-6', 'M17 16V6'],
  users: [
    'M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    'M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4',
    'M13 5.5a2 2 0 1 1 0 4',
    'M13.5 12c2.3 0 4 1.4 4 4'
  ],
  target: ['M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M10 10h.01'],
  search: ['M9 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'm12.8 12.8 4.2 4.2'],
  inbox: ['M3 4.5h14v11H3z', 'M3 11h4l1.5 2h3L13 11h4']
};

function initialsFor(name) {
  const words = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'E';
  return words
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Crea un icono SVG en línea decorativo. */
export function createIcon(name = 'inbox', size = 20) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('aria-hidden', 'true');
  (ICONS[name] || ICONS.inbox).forEach((pathData) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
  });
  return svg;
}

/**
 * Cabecera de tarjeta con icono en línea, título, descripción opcional y
 * acciones opcionales.
 */
export function renderCardHeader({ title = '', description = '', icon = 'chart', actions = [], level = 2 } = {}) {
  const header = document.createElement('header');
  header.className = 'card-header';

  const iconBox = document.createElement('span');
  iconBox.className = 'card-header__icon';
  iconBox.setAttribute('aria-hidden', 'true');
  iconBox.appendChild(createIcon(icon));
  header.appendChild(iconBox);

  const text = document.createElement('div');
  text.className = 'card-header__text';
  const heading = document.createElement(level === 3 ? 'h3' : 'h2');
  heading.className = 'card-header__title';
  heading.textContent = title;
  text.appendChild(heading);
  if (description) {
    const paragraph = document.createElement('p');
    paragraph.className = 'muted card-header__description';
    paragraph.textContent = description;
    text.appendChild(paragraph);
  }
  header.appendChild(text);

  if (actions.length > 0) {
    const actionBox = document.createElement('div');
    actionBox.className = 'card-header__actions';
    actions.forEach((action) => actionBox.appendChild(action));
    header.appendChild(actionBox);
  }

  return header;
}

/**
 * Estado vacío con icono en contenedor tenue. `reason` distingue
 * `no-records` de `no-matches`; el CTA lo decide quien llama.
 */
export function renderEmptyState({
  reason = 'no-records',
  title = '',
  message = '',
  ctaLabel = '',
  ctaAction = null,
  icon = 'inbox'
} = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';
  wrapper.dataset.reason = reason;

  const iconBox = document.createElement('span');
  iconBox.className = 'empty-state__icon';
  iconBox.setAttribute('aria-hidden', 'true');
  iconBox.appendChild(createIcon(icon, 48));
  wrapper.appendChild(iconBox);

  if (title) {
    const heading = document.createElement('h3');
    heading.className = 'empty-state__title';
    heading.textContent = title;
    wrapper.appendChild(heading);
  }

  if (message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'empty-state__text';
    paragraph.textContent = message;
    wrapper.appendChild(paragraph);
  }

  if (ctaLabel) {
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'btn btn-primary empty-state__cta';
    cta.setAttribute('data-empty-cta', '');
    cta.textContent = ctaLabel;
    if (typeof ctaAction === 'function') cta.addEventListener('click', ctaAction);
    wrapper.appendChild(cta);
  }

  return wrapper;
}

/** Chip con estado `aria-pressed` controlado por quien lo consume. */
export function renderChip({ label = '', pressed = false, filter = '', value = '', onToggle = null } = {}) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = label;
  chip.setAttribute('aria-pressed', String(Boolean(pressed)));
  if (filter) chip.dataset.filter = filter;
  if (value) chip.dataset.value = value;

  chip.addEventListener('click', () => {
    const next = chip.getAttribute('aria-pressed') !== 'true';
    chip.setAttribute('aria-pressed', String(next));
    if (typeof onToggle === 'function') onToggle(next, chip);
  });

  return chip;
}

/** Insignia de texto. El tono es puramente presentacional. */
export function renderBadge({ label = '', tone = 'neutral' } = {}) {
  const badge = document.createElement('span');
  badge.className = `badge badge--${tone}`;
  badge.textContent = label;
  return badge;
}

/**
 * Monograma decorativo con las iniciales del nombre. El texto accesible lo
 * aporta el contexto que acompaña al monograma.
 */
export function renderMonogram(name = '') {
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = initialsFor(name);
  return avatar;
}
