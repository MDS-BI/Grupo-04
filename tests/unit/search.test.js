import { describe, it, expect, beforeEach } from 'vitest';
import { searchClients, searchOpportunities } from '../../src/crm-rules.js';
import { normalizeConfig, setActiveConfig, userConfig } from '../../src/module-config.js';

beforeEach(() => {
  setActiveConfig(normalizeConfig(userConfig).config);
});

const entities = [
  {
    id: 'ent_1',
    entity_id: 'cli_1',
    name: 'Compañía Ñuble',
    code: 'CLI-001',
    category: 'Activo',
    accountOwner: 'Ejecutivo A',
    acquisitionSource: 'Referido'
  },
  {
    id: 'ent_2',
    entity_id: 'cli_2',
    name: 'Otra Empresa',
    code: 'CLI-002',
    category: 'Prospecto',
    accountOwner: 'Ejecutivo B',
    acquisitionSource: 'Sitio web'
  }
];

const documents = [
  {
    id: 'doc_1',
    entity_id: 'cli_1',
    series: 'OPP',
    folio: 3001,
    opportunityTitle: 'Adquisición de compresor industrial',
    status: 'Nueva',
    opportunityOwner: 'Ejecutivo A',
    totalAmount: 8500000
  },
  {
    id: 'doc_2',
    entity_id: 'cli_2',
    series: 'OPP',
    folio: 3002,
    opportunityTitle: 'Mantención anual',
    status: 'Ganada',
    opportunityOwner: 'Ejecutivo B',
    totalAmount: 100000
  }
];

const clone = (value) => JSON.parse(JSON.stringify(value));

describe('searchClients', () => {
  it('matches by name ignoring case, accents and surrounding spaces', () => {
    expect(searchClients('compañía', {}, entities).map((e) => e.id)).toEqual(['ent_1']);
    expect(searchClients('  COMPANIA  ', {}, entities).map((e) => e.id)).toEqual(['ent_1']);
    expect(searchClients('nuble', {}, entities).map((e) => e.id)).toEqual(['ent_1']);
  });

  it('matches by code ignoring case and spaces', () => {
    expect(searchClients('cli-002', {}, entities).map((e) => e.id)).toEqual(['ent_2']);
    expect(searchClients('  Cli-001 ', {}, entities).map((e) => e.id)).toEqual(['ent_1']);
  });

  it('returns every match, including prospects', () => {
    const results = searchClients('cli', {}, entities);
    expect(results.map((e) => e.id)).toEqual(['ent_1', 'ent_2']);
  });

  it('returns nothing when no criterion is provided', () => {
    expect(searchClients('', {}, entities)).toEqual([]);
    expect(searchClients('   ', {}, entities)).toEqual([]);
    expect(searchClients(undefined, {}, entities)).toEqual([]);
  });

  it('combines filters with AND', () => {
    expect(searchClients('cli', { category: 'Activo' }, entities).map((e) => e.id)).toEqual(['ent_1']);
    expect(searchClients('cli', { accountOwner: 'Ejecutivo B' }, entities).map((e) => e.id)).toEqual(['ent_2']);
    expect(
      searchClients('cli', { category: 'Activo', accountOwner: 'Ejecutivo B' }, entities).map((e) => e.id)
    ).toEqual([]);
    expect(
      searchClients(
        'cli',
        { category: 'Activo', accountOwner: 'Ejecutivo A', acquisitionSource: 'Referido' },
        entities
      ).map((e) => e.id)
    ).toEqual(['ent_1']);
  });

  it('returns no matches for an unknown criterion', () => {
    expect(searchClients('zzz', {}, entities)).toEqual([]);
  });

  it('does not mutate the supplied collections', () => {
    const before = clone(entities);
    searchClients('cli', { category: 'Activo' }, entities);
    expect(entities).toEqual(before);
  });
});

describe('searchOpportunities', () => {
  it('matches by title ignoring case and accents and returns the linked client', () => {
    const results = searchOpportunities('compresor', {}, documents, entities);
    expect(results.length).toBe(1);
    expect(results[0].document.id).toBe('doc_1');
    expect(results[0].client.id).toBe('ent_1');
  });

  it('matches by folio', () => {
    const results = searchOpportunities('3002', {}, documents, entities);
    expect(results.length).toBe(1);
    expect(results[0].document.folio).toBe(3002);
    expect(results[0].client.name).toBe('Otra Empresa');
  });

  it('combines status and owner filters with AND', () => {
    expect(searchOpportunities('opp', { status: 'Ganada' }, documents, entities)).toEqual([]);
    expect(searchOpportunities('mantencion', { status: 'Ganada' }, documents, entities).length).toBe(1);
    expect(
      searchOpportunities('mantencion', { status: 'Ganada', opportunityOwner: 'Ejecutivo A' }, documents, entities)
    ).toEqual([]);
  });

  it('filters opportunities by the client category', () => {
    expect(searchOpportunities('opp', { category: 'Prospecto' }, documents, entities).length).toBe(0);
    expect(searchOpportunities('3001', { category: 'Activo' }, documents, entities).length).toBe(1);
  });

  it('returns nothing without a criterion and never mutates the input', () => {
    const docsBefore = clone(documents);
    const entitiesBefore = clone(entities);
    expect(searchOpportunities('', {}, documents, entities)).toEqual([]);
    searchOpportunities('compresor', {}, documents, entities);
    expect(documents).toEqual(docsBefore);
    expect(entities).toEqual(entitiesBefore);
  });
});
