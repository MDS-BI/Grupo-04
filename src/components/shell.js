import { getConfig } from '../module-config.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function monogramFor(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters =
    words.length > 0
      ? words
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
      : 'E';
  return letters.toUpperCase();
}

export function renderLogo(container) {
  if (!container) return;
  const letters = monogramFor(getConfig().moduleName);
  container.innerHTML = `<svg width="34" height="34" viewBox="0 0 34 34" focusable="false" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="8" fill="var(--accent, #0f766e)"></rect><text x="17" y="22.5" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="14" font-weight="700" fill="#ffffff">${escapeHtml(letters)}</text></svg>`;
}

const NAV_MODULES = [
  { module: 'entities', labelKey: 'entities' },
  { module: 'documents', labelKey: 'documents' }
];

const SUBMENU_ITEMS = [
  { mode: 'list', label: 'Listado' },
  { mode: 'new', label: 'Nuevo' }
];

function submenuFor(module) {
  return document.getElementById(`nav-submenu-${module}`);
}

function sectionFor(module) {
  return document.getElementById(`nav-section-${module}`);
}

/**
 * Genera los submenús "Listado" y "Nuevo" desde `ModuleConfig`.
 * No inventa secciones sin requisito: solo los dos módulos de dominio.
 */
export function renderNav() {
  const config = getConfig();
  NAV_MODULES.forEach(({ module, labelKey }) => {
    const labelText = config.labels[labelKey];
    const section = sectionFor(module);
    const label = document.getElementById(`nav-${module}-label`);
    if (label) label.textContent = labelText;
    if (section) {
      section.setAttribute('aria-label', labelText);
      section.setAttribute('title', labelText);
      section.setAttribute('aria-controls', `nav-submenu-${module}`);
    }

    const group = section ? section.closest('.nav-group') : null;
    let submenu = submenuFor(module);
    if (!submenu && group) {
      submenu = document.createElement('ul');
      submenu.className = 'nav-submenu';
      submenu.id = `nav-submenu-${module}`;
      submenu.dataset.module = module;
      SUBMENU_ITEMS.forEach(({ mode, label: itemLabel }) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'nav-subitem';
        button.dataset.module = module;
        button.dataset.mode = mode;
        button.id = mode === 'list' ? `nav-${module}` : `nav-${module}-new`;
        button.textContent = itemLabel;
        item.appendChild(button);
        submenu.appendChild(item);
      });
      group.appendChild(submenu);
    }

    if (submenu) {
      const expanded = section ? section.getAttribute('aria-expanded') === 'true' : false;
      submenu.hidden = !expanded;
    }
  });
}

/** Alterna un grupo sin cambiar de vista. */
export function toggleNavSection(module) {
  const section = sectionFor(module);
  const submenu = submenuFor(module);
  if (!section || !submenu) return false;
  const open = section.getAttribute('aria-expanded') !== 'true';
  section.setAttribute('aria-expanded', String(open));
  submenu.hidden = !open;
  return open;
}

/** Abre o cierra un grupo de navegación de forma programática. */
export function setNavSectionExpanded(module, expanded) {
  const section = sectionFor(module);
  const submenu = submenuFor(module);
  if (!section || !submenu) return;
  section.setAttribute('aria-expanded', String(Boolean(expanded)));
  submenu.hidden = !expanded;
}

/** Aplica la terminología del perfil y genera la navegación lateral. */
export function applyShellLabels() {
  const config = getConfig();
  const labels = {
    'nav-dashboard-label': 'Panel',
    'nav-entities-label': config.labels.entities,
    'nav-documents-label': config.labels.documents
  };
  Object.entries(labels).forEach(([id, text]) => {
    const label = document.getElementById(id);
    if (label) label.textContent = text;
  });

  const dashboard = document.getElementById('nav-dashboard');
  if (dashboard) {
    dashboard.hidden = false;
    dashboard.setAttribute('aria-label', 'Panel');
    dashboard.setAttribute('title', 'Panel');
  }

  renderNav();
}

function clearActiveNavigation() {
  const controls = [
    document.getElementById('nav-dashboard'),
    document.getElementById('global-search-input'),
    ...['entities', 'documents'].flatMap((module) => [
      document.getElementById(`nav-section-${module}`),
      document.getElementById(`nav-${module}`),
      document.getElementById(`nav-${module}-new`)
    ])
  ];
  controls.forEach((element) => {
    if (!element) return;
    element.removeAttribute('aria-current');
    element.classList.remove('active', 'is-current');
  });
}

function markCurrent(element) {
  if (!element) return;
  element.classList.add('active');
  element.setAttribute('aria-current', 'page');
}

/**
 * Marca exactamente un elemento con `aria-current="page"` según la vista y
 * el modo. En la vista de búsqueda el control correspondiente es la búsqueda
 * global de la cabecera, que no es una entrada del menú lateral.
 */
export function setActiveNav({ view, mode = 'list' } = {}) {
  clearActiveNavigation();

  if (view === 'dashboard') {
    markCurrent(document.getElementById('nav-dashboard'));
    return;
  }

  if (view === 'search') {
    const input = document.getElementById('global-search-input');
    if (input) input.setAttribute('aria-current', 'page');
    return;
  }

  if (view === 'entities' || view === 'documents') {
    setNavSectionExpanded(view, true);
    const section = sectionFor(view);
    if (section) section.classList.add('is-current');
    if (mode === 'new') markCurrent(document.getElementById(`nav-${view}-new`));
    else markCurrent(document.getElementById(`nav-${view}`));
  }
}
