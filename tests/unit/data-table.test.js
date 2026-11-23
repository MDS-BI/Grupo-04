import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderDataTable, sortRows } from '../../src/components/data-table.js';

const columns = [
  { key: 'name', label: 'Cliente', sortable: true, className: 'cell-truncate' },
  { key: 'owner', label: 'Responsable', sortable: true },
  { key: 'amount', label: 'Monto', sortable: true, numeric: true },
  {
    key: 'actions',
    label: 'Acciones',
    render: (row) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'edit';
      button.dataset.editDocument = row.id;
      button.setAttribute('aria-label', `Editar ${row.name}`);
      button.textContent = 'Editar';
      return button;
    }
  }
];

function buildRows() {
  return [
    { id: 'c1', name: 'Beta', owner: 'Ejecutivo B', amount: 200 },
    { id: 'c2', name: 'Alfa', owner: '', amount: 1000 },
    { id: 'c3', name: 'Gamma', owner: 'Ejecutivo A', amount: null },
    { id: 'c4', name: 'Alfa', owner: 'Ejecutivo A', amount: 50 }
  ];
}

function render(options = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  container.appendChild(
    renderDataTable({
      caption: 'Clientes registrados',
      columns,
      rows: buildRows(),
      sortKey: 'name',
      sortDirection: 'asc',
      ...options
    })
  );
  return container;
}

function rowNames(container) {
  return [...container.querySelectorAll('tbody tr')].map((row) => row.querySelector('td').textContent);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('data-table — tabla ordenable accesible', () => {
  it('ordena de forma ascendente y estable dejando los valores vacíos al final', () => {
    const container = render({ sortKey: 'owner', sortDirection: 'asc' });
    expect(rowNames(container)).toEqual(['Gamma', 'Alfa', 'Beta', 'Alfa']);
    expect(container.querySelectorAll('tbody tr')[0].dataset.key).toBe('c3');
    expect(container.querySelectorAll('tbody tr')[1].dataset.key).toBe('c4');
    expect(container.querySelectorAll('tbody tr')[3].dataset.key).toBe('c2');
  });

  it('ordena de forma descendente y mantiene los vacíos al final', () => {
    const container = render({ sortKey: 'owner', sortDirection: 'desc' });
    expect(rowNames(container)).toEqual(['Beta', 'Gamma', 'Alfa', 'Alfa']);
    expect(container.querySelectorAll('tbody tr')[3].dataset.key).toBe('c2');
  });

  it('ordena columnas numéricas por valor y no por texto', () => {
    const container = render({ sortKey: 'amount', sortDirection: 'asc' });
    expect(rowNames(container)).toEqual(['Alfa', 'Beta', 'Alfa', 'Gamma']);
    expect(container.querySelectorAll('tbody tr')[0].dataset.key).toBe('c4');
    expect(container.querySelectorAll('tbody tr')[3].dataset.key).toBe('c3');
  });

  it('expone aria-sort en la columna activa y none en el resto de columnas ordenables', () => {
    const onSort = vi.fn();
    const container = render({ sortKey: 'amount', sortDirection: 'desc', onSort });
    const headers = [...container.querySelectorAll('thead th')];
    expect(headers[0].getAttribute('aria-sort')).toBe('none');
    expect(headers[1].getAttribute('aria-sort')).toBe('none');
    expect(headers[2].getAttribute('aria-sort')).toBe('descending');

    headers[2].querySelector('button[data-sort="amount"]').click();
    expect(onSort).toHaveBeenCalledWith('amount');
    headers[0].querySelector('button[data-sort="name"]').click();
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('incluye un caption no vacío y una cabecera dentro de thead con scope col', () => {
    const container = render();
    const caption = container.querySelector('table.data-table > caption');
    expect(caption).not.toBeNull();
    expect(caption.textContent.trim().length).toBeGreaterThan(0);
    expect(caption.classList.contains('sr-only')).toBe(true);
    expect(container.querySelectorAll('thead th').length).toBe(columns.length);
    [...container.querySelectorAll('thead th')].forEach((header) => {
      expect(header.getAttribute('scope')).toBe('col');
    });
  });

  it('envuelve la tabla en una región desplazable alcanzable con teclado', () => {
    const container = render();
    const wrap = container.querySelector('.table-wrap');
    expect(wrap).not.toBeNull();
    expect(wrap.getAttribute('role')).toBe('region');
    expect(wrap.getAttribute('aria-label')).toBeTruthy();
    expect(wrap.getAttribute('tabindex')).toBe('0');
    expect(wrap.contains(container.querySelector('table.data-table'))).toBe(true);
  });

  it('declara las columnas numéricas en th y td para alinearlas a la derecha', () => {
    const container = render();
    const headers = [...container.querySelectorAll('thead th')];
    expect(headers[2].hasAttribute('data-numeric')).toBe(true);
    expect(headers[0].hasAttribute('data-numeric')).toBe(false);
    [...container.querySelectorAll('tbody tr')].forEach((row) => {
      expect(row.children[2].hasAttribute('data-numeric')).toBe(true);
      expect(row.children[0].hasAttribute('data-numeric')).toBe(false);
    });
  });

  it('renderiza la acción «Editar» por fila y ninguna acción de borrado', () => {
    const container = render();
    const actions = [...container.querySelectorAll('tbody button[data-action="edit"]')];
    expect(actions.length).toBe(buildRows().length);
    expect(actions[0].getAttribute('aria-label')).toMatch(/Editar/);
    expect(container.querySelector('[data-action="delete"]')).toBeNull();
    expect(container.querySelector('[data-delete-document]')).toBeNull();
    expect(container.querySelector('[data-delete-entity]')).toBeNull();
  });

  it('delega el estado vacío en ui.js sin renderizar tbody', () => {
    const container = render({ rows: [], emptyState: { reason: 'no-records', message: 'Sin registros' } });
    expect(container.querySelector('tbody')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
    const empty = container.querySelector('.empty-state');
    expect(empty).not.toBeNull();
    expect(empty.dataset.reason).toBe('no-records');
  });

  it('ordena filas sin modificar el arreglo original', () => {
    const rows = buildRows();
    const original = rows.map((row) => row.id);
    sortRows(rows, columns, 'name', 'asc');
    expect(rows.map((row) => row.id)).toEqual(original);
  });
});
