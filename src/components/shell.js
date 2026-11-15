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

/**
 * Aplica la terminología del perfil a la barra lateral y mantiene nombres
 * accesibles cuando la barra se contrae a un riel de iconos. La entrada Panel
 * está disponible para el perfil CRM desde la segunda iteración (P2).
 */
export function applyShellLabels() {
  const config = getConfig();
  const labels = {
    'nav-dashboard-label': 'Panel',
    'nav-entities-label': config.labels.entities,
    'nav-documents-label': config.labels.documents,
    'nav-search-label': 'Buscar'
  };
  Object.entries(labels).forEach(([id, text]) => {
    const label = document.getElementById(id);
    if (label) label.textContent = text;
    const button = label && label.closest('.nav-module');
    if (button) {
      button.setAttribute('aria-label', text);
      button.setAttribute('title', text);
    }
  });

  const dashboard = document.getElementById('nav-dashboard');
  if (dashboard) dashboard.hidden = false;
}

export function setActiveModule(name) {
  document.querySelectorAll('.nav-module').forEach((btn) => {
    const active = btn.dataset.module === name;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}
