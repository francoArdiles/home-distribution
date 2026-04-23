import { describe, test, expect } from 'vitest';
import { getConstraintDisplayName } from '../constraintUtils.js';

const elements = [
  { id: 'el-1', label: 'Casa',   definitionId: 'casa' },
  { id: 'el-2', label: 'Huerto', definitionId: 'huerto' },
];

const base = { id: 'c1', type: 'min-distance', enabled: true, value: 3 };

// ── Dynamic derivation ──────────────────────────────────────────────────────

describe('getConstraintDisplayName — dynamic derivation', () => {
  test('source element id + terrain target', () => {
    const c = { ...base, sourceId: 'el-1', targetId: 'terrain', name: 'stale name' };
    expect(getConstraintDisplayName(c, elements)).toBe('Casa → Límite del terreno (mín. 3m)');
  });

  test('source element id + any target', () => {
    const c = { ...base, sourceId: 'el-1', targetId: 'any', name: 'stale' };
    expect(getConstraintDisplayName(c, elements)).toBe('Casa → Cualquier otro elemento (mín. 3m)');
  });

  test('source element id + specific element target', () => {
    const c = { ...base, sourceId: 'el-1', targetId: 'el-2', name: 'stale' };
    expect(getConstraintDisplayName(c, elements)).toBe('Casa → Huerto (mín. 3m)');
  });

  test('reflects renamed element immediately', () => {
    const renamed = [
      { id: 'el-1', label: 'Casa Principal', definitionId: 'casa' },
      { id: 'el-2', label: 'Huerto',         definitionId: 'huerto' },
    ];
    const c = { ...base, sourceId: 'el-1', targetId: 'terrain', name: 'Casa → Límite del terreno (mín. 3m)' };
    expect(getConstraintDisplayName(c, renamed)).toBe('Casa Principal → Límite del terreno (mín. 3m)');
  });

  test('both source and target renamed are reflected', () => {
    const renamed = [
      { id: 'el-1', label: 'Casa Principal', definitionId: 'casa' },
      { id: 'el-2', label: 'Mi Huerto',      definitionId: 'huerto' },
    ];
    const c = { ...base, sourceId: 'el-1', targetId: 'el-2', name: 'stale' };
    expect(getConstraintDisplayName(c, renamed)).toBe('Casa Principal → Mi Huerto (mín. 3m)');
  });

  test('integer value formats without decimals', () => {
    const c = { ...base, value: 5, sourceId: 'el-1', targetId: 'terrain' };
    expect(getConstraintDisplayName(c, elements)).toContain('5m');
  });

  test('decimal value is preserved', () => {
    const c = { ...base, value: 1.5, sourceId: 'el-1', targetId: 'terrain' };
    expect(getConstraintDisplayName(c, elements)).toContain('1.5m');
  });

  test('max-distance label uses "max." prefix', () => {
    const c = { ...base, type: 'max-distance', value: 20, sourceId: 'el-1', targetId: 'el-2' };
    expect(getConstraintDisplayName(c, elements)).toBe('Casa → Huerto (máx. 20m)');
  });
});

// ── Fallback for backward compat ────────────────────────────────────────────

describe('getConstraintDisplayName — fallback', () => {
  test('falls back to stored name when source id not found in elements', () => {
    const c = { ...base, sourceId: 'missing-id', targetId: 'terrain', name: 'Nombre guardado' };
    expect(getConstraintDisplayName(c, elements)).toBe('Nombre guardado');
  });

  test('falls back to stored name when target element id not found', () => {
    const c = { ...base, sourceId: 'el-1', targetId: 'missing-target', name: 'Nombre guardado' };
    expect(getConstraintDisplayName(c, elements)).toBe('Nombre guardado');
  });

  test('falls back to stored name when elements list is empty', () => {
    const c = { ...base, sourceId: 'el-1', targetId: 'terrain', name: 'Nombre guardado' };
    expect(getConstraintDisplayName(c, [])).toBe('Nombre guardado');
  });

  test('returns generic label when no elements and no stored name', () => {
    const c = { ...base, sourceId: 'el-1', targetId: 'terrain' };
    expect(getConstraintDisplayName(c, [])).toBeTruthy();
  });
});

// ── refreshConstraintNames ───────────────────────────────────────────────────

import { refreshConstraintNames } from '../constraintUtils.js';

describe('refreshConstraintNames', () => {
  test('updates name field of each constraint using current element labels', () => {
    const constraints = [
      { ...base, id: 'c1', sourceId: 'el-1', targetId: 'terrain',   name: 'stale 1' },
      { ...base, id: 'c2', sourceId: 'el-1', targetId: 'el-2',      name: 'stale 2' },
    ];
    const updated = refreshConstraintNames(constraints, elements);
    expect(updated[0].name).toBe('Casa → Límite del terreno (mín. 3m)');
    expect(updated[1].name).toBe('Casa → Huerto (mín. 3m)');
  });

  test('does not mutate original constraint objects', () => {
    const c = { ...base, id: 'c1', sourceId: 'el-1', targetId: 'terrain', name: 'stale' };
    const [updated] = refreshConstraintNames([c], elements);
    expect(c.name).toBe('stale');
    expect(updated.name).not.toBe('stale');
  });

  test('preserves stored name when element id is not found (backward compat)', () => {
    const c = { ...base, id: 'c1', sourceId: 'old-id', targetId: 'terrain', name: 'Nombre viejo' };
    const [updated] = refreshConstraintNames([c], elements);
    expect(updated.name).toBe('Nombre viejo');
  });

  test('returns empty array when given empty array', () => {
    expect(refreshConstraintNames([], elements)).toEqual([]);
  });
});
