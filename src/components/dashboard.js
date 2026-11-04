import { getConfig } from '../module-config.js';
import { loadEntities, loadDocuments } from '../storage.js';

export function recordCounts(){
  return {
    entities: loadEntities().length,
    documents: loadDocuments().length
  };
}

export function renderDashboard(){
  const counts = recordCounts();
  const labels = getConfig().labels;

  const entitiesValue = document.getElementById('stat-entities');
  if(entitiesValue) entitiesValue.textContent = String(counts.entities);
  const documentsValue = document.getElementById('stat-documents');
  if(documentsValue) documentsValue.textContent = String(counts.documents);

  const entitiesLabel = document.getElementById('stat-entities-label');
  if(entitiesLabel) entitiesLabel.textContent = labels.entities;
  const documentsLabel = document.getElementById('stat-documents-label');
  if(documentsLabel) documentsLabel.textContent = labels.documents;
}
