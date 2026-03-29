import { describe, test, expect } from 'vitest';
import {
  validateConstraint,
  validateAllConstraints,
  getDefaultConstraints,
} from '../constraintUtils.js';

const baseScale = 10;
const squareTerrain = [
  { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 },
];

const elA = { id: 'a', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' };
const elB = { id: 'b', x: 15, y: 5, width: 2, height: 2, shape: 'rectangle' }; // 8m gap
const elClose = { id: 'c', x: 6, y: 5, width: 2, height: 2, shape: 'rectangle' }; // 0m gap (touching)

const constraint = {
  id: 'c1',
  name: 'Min distance A-B',
  type: 'min-distance',
  sourceId: 'a',
  targetId: 'b',
  value: 5,
  enabled: true,
};

describe('validateConstraint', () => {
  test('elements farther than min distance → valid: true', () => {
    const result = validateConstraint(constraint, [elA, elB], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
    expect(result.actualDistance).toBeGreaterThan(5);
    expect(result.requiredDistance).toBe(5);
  });

  test('elements closer than min distance → valid: false', () => {
    const c = { ...constraint, targetId: 'c', value: 5 };
    const result = validateConstraint(c, [elA, elClose], squareTerrain, baseScale);
    expect(result.valid).toBe(false);
  });

  test('disabled constraint → always valid: true', () => {
    const disabled = { ...constraint, targetId: 'c', value: 5, enabled: false };
    const result = validateConstraint(disabled, [elA, elClose], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
  });

  test('exact distance = min distance → valid: true', () => {
    // elA right edge at 6, elB left edge at 6 → gap=0... need to build specific case
    const a = { id: 'x1', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' };
    const b = { id: 'x2', x: 12, y: 5, width: 2, height: 2, shape: 'rectangle' }; // gap = 5m
    const c = { ...constraint, sourceId: 'x1', targetId: 'x2', value: 5 };
    const result = validateConstraint(c, [a, b], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
    expect(result.actualDistance).toBeCloseTo(5);
  });

  test('distance slightly less → valid: false', () => {
    const a = { id: 'x1', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' };
    const b = { id: 'x2', x: 11.9, y: 5, width: 2, height: 2, shape: 'rectangle' }; // gap < 5
    const c = { ...constraint, sourceId: 'x1', targetId: 'x2', value: 5 };
    const result = validateConstraint(c, [a, b], squareTerrain, baseScale);
    expect(result.valid).toBe(false);
  });

  test('constraint with terrain as target', () => {
    const terrainConstraint = {
      id: 't1',
      name: 'Casa setback',
      type: 'min-distance',
      sourceId: 'a',
      targetId: 'terrain',
      value: 3,
      enabled: true,
    };
    const result = validateConstraint(terrainConstraint, [elA], squareTerrain, baseScale);
    // elA at x=5, left edge at 4m, terrain left at 0m → distance to boundary
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('actualDistance');
    expect(result.requiredDistance).toBe(3);
  });
});

describe('validateAllConstraints', () => {
  test('returns result for each enabled constraint', () => {
    const constraints = [
      constraint,
      { ...constraint, id: 'c2', enabled: false },
    ];
    const results = validateAllConstraints(constraints, [elA, elB], squareTerrain, baseScale);
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('constraint');
    expect(results[0]).toHaveProperty('valid');
  });
});

describe('getDefaultConstraints', () => {
  test('returns constraint for casa setback from terrain', () => {
    const constraints = getDefaultConstraints('casa', 'el-casa-1');
    expect(Array.isArray(constraints)).toBe(true);
    const setback = constraints.find(c => c.targetId === 'terrain' && c.sourceId === 'el-casa-1');
    expect(setback).toBeDefined();
    expect(setback.value).toBe(3);
  });

  test('returns constraint for arbol_frutal spacing', () => {
    const constraints = getDefaultConstraints('arbol_frutal', 'el-arbol-1');
    const spacing = constraints.find(c => c.type === 'min-distance');
    expect(spacing).toBeDefined();
    expect(spacing.value).toBe(4);
  });
});
