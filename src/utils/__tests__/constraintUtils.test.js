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

describe('validateConstraint — targetId any', () => {
  test('any: all others farther than min → valid', () => {
    const c = { id: 'c-any', name: 'test', type: 'min-distance', sourceId: 'a', targetId: 'any', value: 5, enabled: true };
    // elA at x=5, elB at x=15 → gap=8m ≥ 5m
    const result = validateConstraint(c, [elA, elB], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
    expect(result.actualDistance).toBeCloseTo(8);
  });

  test('any: closest element is too near → invalid', () => {
    const c = { id: 'c-any', name: 'test', type: 'min-distance', sourceId: 'a', targetId: 'any', value: 5, enabled: true };
    // elA at x=5, elClose at x=6 → touching/0m < 5m
    const result = validateConstraint(c, [elA, elClose], squareTerrain, baseScale);
    expect(result.valid).toBe(false);
  });

  test('any: no other elements → valid (distance=Infinity)', () => {
    const c = { id: 'c-any', name: 'test', type: 'min-distance', sourceId: 'a', targetId: 'any', value: 5, enabled: true };
    const result = validateConstraint(c, [elA], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
    expect(result.actualDistance).toBe(Infinity);
  });

  test('any: uses minimum distance across multiple elements', () => {
    const c = { id: 'c-any', name: 'test', type: 'min-distance', sourceId: 'a', targetId: 'any', value: 5, enabled: true };
    // elA, elB (8m away), elClose (0m away) → min = 0m → invalid
    const result = validateConstraint(c, [elA, elB, elClose], squareTerrain, baseScale);
    expect(result.valid).toBe(false);
    expect(result.actualDistance).toBeCloseTo(0);
  });
});

describe('validateConstraint — max-distance', () => {
  const maxBase = { id: 'm1', name: 'Max A-B', type: 'max-distance', sourceId: 'a', targetId: 'b', value: 10, enabled: true };

  test('elements within max distance -> valid: true', () => {
    // elA x=5, elB x=15 -> gap=8 <= 10
    const result = validateConstraint(maxBase, [elA, elB], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
    expect(result.actualDistance).toBeCloseTo(8);
    expect(result.requiredDistance).toBe(10);
  });

  test('elements farther than max distance -> valid: false', () => {
    const far = { id: 'far', x: 50, y: 5, width: 2, height: 2, shape: 'rectangle' };
    const c = { ...maxBase, targetId: 'far' };
    const result = validateConstraint(c, [elA, far], squareTerrain, baseScale);
    expect(result.valid).toBe(false);
  });

  test('max exactly equals distance -> valid: true', () => {
    const b = { id: 'x2', x: 15, y: 5, width: 2, height: 2, shape: 'rectangle' }; // gap 8
    const c = { ...maxBase, targetId: 'x2', value: 8 };
    const result = validateConstraint(c, [elA, b], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
  });

  test('disabled max-distance -> always valid', () => {
    const c = { ...maxBase, enabled: false, value: 1 };
    const result = validateConstraint(c, [elA, elB], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
  });

  test('max-distance with any target uses closest element', () => {
    const c = { ...maxBase, targetId: 'any', value: 10 };
    // closest is elClose (0m) which is <= 10 -> valid
    const result = validateConstraint(c, [elA, elB, elClose], squareTerrain, baseScale);
    expect(result.valid).toBe(true);
  });

  test('max-distance with any target fails when closest is too far', () => {
    const far = { id: 'far', x: 50, y: 5, width: 2, height: 2, shape: 'rectangle' };
    const c = { ...maxBase, targetId: 'any', value: 5 };
    const result = validateConstraint(c, [elA, far], squareTerrain, baseScale);
    expect(result.valid).toBe(false);
  });
});

describe('validateConstraint — targetId entrance', () => {
  const entrancePoint = { x: 0, y: 5 };
  test('element within max distance from entrance → valid', () => {
    const c = { id: 'e1', type: 'max-distance', sourceId: 'a', targetId: 'entrance', value: 30, enabled: true };
    const result = validateConstraint(c, [elA], squareTerrain, baseScale, entrancePoint);
    expect(result.valid).toBe(true);
  });
  test('element beyond max distance from entrance → invalid', () => {
    const far = { id: 'f', x: 50, y: 5, width: 2, height: 2, shape: 'rectangle' };
    const c = { id: 'e1', type: 'max-distance', sourceId: 'f', targetId: 'entrance', value: 10, enabled: true };
    const result = validateConstraint(c, [far], squareTerrain, baseScale, entrancePoint);
    expect(result.valid).toBe(false);
  });
  test('missing entrancePoint → treated as valid (Infinity)', () => {
    const c = { id: 'e1', type: 'min-distance', sourceId: 'a', targetId: 'entrance', value: 5, enabled: true };
    const result = validateConstraint(c, [elA], squareTerrain, baseScale, null);
    expect(result.valid).toBe(true);
    expect(result.actualDistance).toBe(Infinity);
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
