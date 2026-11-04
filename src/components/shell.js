import { getConfig } from '../module-config.js';

function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

export function monogramFor(name){
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 0 ? words.map(w => w[0]).slice(0, 2).join('') : 'E';
  return letters.toUpperCase();
}

export function renderLogo(container){
  if(!container) return;
  const letters = monogramFor(getConfig().moduleName);
  container.innerHTML = `<svg width="34" height="34" viewBox="0 0 34 34" focusable="false" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="8" fill="var(--accent, #2563eb)"></rect><text x="17" y="22.5" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="14" font-weight="700" fill="#ffffff">${escapeHtml(letters)}</text></svg>`;
}

export function applyShellLabels(){
  const labels = {
    'nav-dashboard-label': 'Panel',
    'nav-entities-label': getConfig().labels.entities,
    'nav-documents-label': getConfig().labels.documents,
    'nav-search-label': 'Búsqueda'
  };
  Object.entries(labels).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if(el) el.textContent = text;
  });
}

export function setActiveModule(name){
  document.querySelectorAll('.nav-module').forEach(btn => {
    const active = btn.dataset.module === name;
    btn.classList.toggle('active', active);
    if(active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}
