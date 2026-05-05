import { describe, test, expect } from 'vitest';
import {
  evaluateLayout,
  DEFAULT_WEIGHTS,
  penaltyMinMax,
  penaltyOverlap,
  penaltyOutOfTerrain,
  penaltyPathLength,
  penaltyImbalance,
} from '../layoutFitness.js';

const squareTerrain = [
  { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 },
];

const mkRect = (id, x, y, w = 2, h = 2) => ({
  id, definitionId: 'test', x, y, width: w, height: h, rotation: 0, shape: 'rectangle',
});

const ctx = (overrides = {}) => ({
  terrainMeters: squareTerrain,
  constraints: [],
  weights: DEFAULT_WEIGHTS,
  ...overrides,
});

describe('evaluateLayout', () => {
  test('empty layout -> total 0', () => {
    const result = evaluateLayout({ elements: [] }, ctx());
    expect(result.total).toBe(0);
  });

  test('two separated rects, no constraints -> low total', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const result = evaluateLayout(layout, ctx());
    expect(result.total).toBeLessThan(100);
    expect(result.breakdown.overlap).toBe(0);
    expect(result.breakdown.outOfTerrain).toBe(0);
  });

  test('total is weighted sum of breakdown', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const result = evaluateLayout(layout, ctx());
    const { breakdown } = result;
    const expected =
      DEFAULT_WEIGHTS.violations * breakdown.violations +
      DEFAULT_WEIGHTS.overlap * breakdown.overlap +
      DEFAULT_WEIGHTS.outOfTerrain * breakdown.outOfTerrain +
      DEFAULT_WEIGHTS.pathLength * breakdown.pathLength +
      DEFAULT_WEIGHTS.deadSpace * breakdown.deadSpace +
      DEFAULT_WEIGHTS.orientation * breakdown.orientation +
      DEFAULT_WEIGHTS.imbalance * breakdown.imbalance;
    expect(result.total).toBeCloseTo(expected, 4);
  });

  test('min-distance violation increases violations', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 7, 5)] };  // gap=0
    const constraints = [{ id: 'c', type: 'min-distance', sourceId: 'a', targetId: 'b', value: 5, enabled: true }];
    const result = evaluateLayout(layout, ctx({ constraints }));
    expect(result.breakdown.violations).toBeGreaterThan(0);
  });

  test('max-distance violation increases violations', () => {
    const layout = { elements: [mkRect('a', 2, 2), mkRect('b', 18, 18)] };  // lejos
    const constraints = [{ id: 'c', type: 'max-distance', sourceId: 'a', targetId: 'b', value: 5, enabled: true }];
    const result = evaluateLayout(layout, ctx({ constraints }));
    expect(result.breakdown.violations).toBeGreaterThan(0);
  });

  test('overlapping rects produce overlap > 0', () => {
    const layout = { elements: [mkRect('a', 5, 5, 4, 4), mkRect('b', 6, 6, 4, 4)] };
    const result = evaluateLayout(layout, ctx());
    expect(result.breakdown.overlap).toBeGreaterThan(0);
  });

  test('element fully outside terrain increases outOfTerrain', () => {
    const layout = { elements: [mkRect('a', 50, 50, 2, 2)] };
    const result = evaluateLayout(layout, ctx());
    expect(result.breakdown.outOfTerrain).toBeGreaterThan(0);
  });

  test('custom weights are applied', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 6, 5, 4, 4)] };  // overlap
    const r1 = evaluateLayout(layout, ctx({ weights: DEFAULT_WEIGHTS }));
    const r2 = evaluateLayout(layout, ctx({ weights: { ...DEFAULT_WEIGHTS, overlap: 0 } }));
    expect(r2.total).toBeLessThan(r1.total);
  });

  test('total is finite for any valid layout', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 50, 50)] };
    const result = evaluateLayout(layout, ctx());
    expect(Number.isFinite(result.total)).toBe(true);
  });
});

describe('penaltyMinMax', () => {
  const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 5)] };  // gap=9m

  test('disabled constraint -> 0', () => {
    const constraints = [{ id: 'c', type: 'min-distance', sourceId: 'a', targetId: 'b', value: 50, enabled: false }];
    expect(penaltyMinMax(layout, constraints, squareTerrain)).toBe(0);
  });

  test('min-distance met -> 0', () => {
    const constraints = [{ id: 'c', type: 'min-distance', sourceId: 'a', targetId: 'b', value: 5, enabled: true }];
    expect(penaltyMinMax(layout, constraints, squareTerrain)).toBe(0);
  });

  test('min-distance violated by 2m -> proportional', () => {
    const constraints = [{ id: 'c', type: 'min-distance', sourceId: 'a', targetId: 'b', value: 11, enabled: true }];
    // actual ~9m, violation ~2m
    const v = penaltyMinMax(layout, constraints, squareTerrain);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });

  test('max-distance: elements too far -> penalized', () => {
    const constraints = [{ id: 'c', type: 'max-distance', sourceId: 'a', targetId: 'b', value: 5, enabled: true }];
    // actual ~9m, violation ~4m
    const v = penaltyMinMax(layout, constraints, squareTerrain);
    expect(v).toBeGreaterThan(0);
  });

  test('no constraints -> 0', () => {
    expect(penaltyMinMax(layout, [], squareTerrain)).toBe(0);
  });
});

describe('penaltyOverlap', () => {
  test('disjoint rects -> 0', () => {
    const layout = { elements: [mkRect('a', 2, 2), mkRect('b', 18, 18)] };
    expect(penaltyOverlap(layout)).toBe(0);
  });

  test('overlapping rects -> > 0', () => {
    const layout = { elements: [mkRect('a', 5, 5, 4, 4), mkRect('b', 6, 5, 4, 4)] };
    expect(penaltyOverlap(layout)).toBeGreaterThan(0);
  });

  test('identical rects -> close to 1', () => {
    const layout = { elements: [mkRect('a', 5, 5, 4, 4), mkRect('b', 5, 5, 4, 4)] };
    expect(penaltyOverlap(layout)).toBeCloseTo(0.5, 1);  // overlap = 16, sum = 32
  });

  test('rotation=90 swaps dimensions', () => {
    const tall = { ...mkRect('a', 5, 5, 2, 6) };              // 2 wide, 6 tall
    const rotated = { ...mkRect('b', 5, 5, 6, 2), rotation: 90 };  // becomes 2 wide, 6 tall
    // Both occupy same footprint after rotation -> full overlap
    const layout = { elements: [tall, rotated] };
    expect(penaltyOverlap(layout)).toBeGreaterThan(0.3);
  });
});

describe('penaltyOutOfTerrain', () => {
  test('fully inside terrain -> 0', () => {
    const layout = { elements: [mkRect('a', 10, 10, 2, 2)] };
    expect(penaltyOutOfTerrain(layout, squareTerrain)).toBe(0);
  });

  test('fully outside -> close to 1', () => {
    const layout = { elements: [mkRect('a', 50, 50, 2, 2)] };
    expect(penaltyOutOfTerrain(layout, squareTerrain)).toBeCloseTo(1, 1);
  });

  test('half outside -> around 0.5', () => {
    const layout = { elements: [mkRect('a', 0, 10, 4, 4)] };  // centered on left edge
    const v = penaltyOutOfTerrain(layout, squareTerrain);
    expect(v).toBeGreaterThan(0.3);
    expect(v).toBeLessThan(0.7);
  });
});

describe('penaltyPathLength', () => {
  test('single element -> 0', () => {
    const layout = { elements: [mkRect('a', 10, 10)] };
    expect(penaltyPathLength(layout, squareTerrain)).toBe(0);
  });

  test('elements spread out -> larger value', () => {
    const close = { elements: [mkRect('a', 5, 5), mkRect('b', 6, 5)] };
    const far = { elements: [mkRect('a', 1, 1), mkRect('b', 19, 19)] };
    expect(penaltyPathLength(far, squareTerrain)).toBeGreaterThan(penaltyPathLength(close, squareTerrain));
  });
});

describe('penaltyImbalance', () => {
  test('elements balanced around terrain center -> low', () => {
    const layout = { elements: [mkRect('a', 5, 10, 2, 2), mkRect('b', 15, 10, 2, 2)] };
    // centroid = (10, 10), terrain center = (10, 10)
    expect(penaltyImbalance(layout, squareTerrain)).toBeCloseTo(0, 2);
  });

  test('all elements in one corner -> higher', () => {
    const layout = { elements: [mkRect('a', 2, 2), mkRect('b', 3, 2)] };
    expect(penaltyImbalance(layout, squareTerrain)).toBeGreaterThan(0.2);
  });
});
