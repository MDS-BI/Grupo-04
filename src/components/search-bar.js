export function setupSearchBar(inputEl, onInput){
  inputEl.addEventListener('input', () => onInput(inputEl.value));
}

export function renderSearchResults(listEl, emptyEl, entities, renderItem){
  listEl.innerHTML = '';
  if(!entities || entities.length === 0){
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  for(const e of entities) listEl.appendChild(renderItem(e));
}
