import { describe, test, expect } from 'vitest';
import { solveSA, randomInitialLayout, mulberry32, DEFAULT_SA_CONFIG } from '../layoutSolver.js';
import { evaluateLayout, DEFAULT_WEIGHTS } from '../layoutFitness.js';

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

describe('mulberry32', () => {
  test('same seed -> same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  test('different seeds -> different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test('values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randomInitialLayout', () => {
  const elements = [mkRect('a', 0, 0), mkRect('b', 0, 0)];

  test('same rng seed -> same layout', () => {
    const l1 = randomInitialLayout(elements, squareTerrain, mulberry32(1));
    const l2 = randomInitialLayout(elements, squareTerrain, mulberry32(1));
    expect(l1).toEqual(l2);
  });

  test('all elements inside terrain bbox', () => {
    const layout = randomInitialLayout(elements, squareTerrain, mulberry32(5));
    for (const el of layout.elements) {
      expect(el.x).toBeGreaterThanOrEqual(0);
      expect(el.x).toBeLessThanOrEqual(20);
    }
  });

  test('preserves element count and ids', () => {
    const layout = randomInitialLayout(elements, squareTerrain, mulberry32(7));
    expect(layout.elements.length).toBe(2);
    expect(layout.elements.map(e => e.id).sort()).toEqual(['a', 'b']);
  });
});

describe('solveSA', () => {
  test('bestScore <= initialScore', () => {
    const initial = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const initialScore = evaluateLayout(initial, ctx()).total;
    const result = solveSA(initial, ctx(), { ...DEFAULT_SA_CONFIG, maxTimeMs: 500, seed: 1 });
    expect(result.bestScore).toBeLessThanOrEqual(initialScore);
  });

  test('deterministic with same seed', () => {
    const initial = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    // Short cooling schedule so runs terminate by Tmin (not time cutoff).
    const cfg = { ...DEFAULT_SA_CONFIG, itersPerT: 20, T0: 5, alpha: 0.8, maxTimeMs: 60000, seed: 99 };
    const r1 = solveSA(initial, ctx(), cfg);
    const r2 = solveSA(initial, ctx(), cfg);
    expect(r1.stoppedBy).toBe('Tmin');
    expect(r2.stoppedBy).toBe('Tmin');
    expect(r1.bestScore).toBe(r2.bestScore);
  });

  test('trace has iter entries', () => {
    const initial = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const result = solveSA(initial, ctx(), { ...DEFAULT_SA_CONFIG, maxTimeMs: 500, seed: 1 });
    expect(result.trace.length).toBeGreaterThan(0);
    expect(result.trace[0]).toHaveProperty('iter');
    expect(result.trace[0]).toHaveProperty('T');
    expect(result.trace[0]).toHaveProperty('current');
    expect(result.trace[0]).toHaveProperty('best');
  });

  test('stops by time when maxTimeMs is tiny', () => {
    const initial = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const result = solveSA(initial, ctx(), { ...DEFAULT_SA_CONFIG, maxTimeMs: 5, seed: 1 });
    expect(['time', 'Tmin']).toContain(result.stoppedBy);
  });

  test('improves layout with hard violations', () => {
    // Two rects overlapping -> high overlap penalty
    const initial = { elements: [mkRect('a', 10, 10, 4, 4), mkRect('b', 10, 10, 4, 4)] };
    const initialScore = evaluateLayout(initial, ctx()).total;
    const result = solveSA(initial, ctx(), { ...DEFAULT_SA_CONFIG, maxTimeMs: 1000, seed: 3 });
    expect(result.bestScore).toBeLessThan(initialScore);
  });

  test('final layout has same elements (ids)', () => {
    const initial = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const result = solveSA(initial, ctx(), { ...DEFAULT_SA_CONFIG, maxTimeMs: 200, seed: 1 });
    const ids = result.best.elements.map(e => e.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  test('iterations > 0 and finalTemperature <= T0', () => {
    const initial = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const result = solveSA(initial, ctx(), { ...DEFAULT_SA_CONFIG, maxTimeMs: 500, seed: 1 });
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.finalTemperature).toBeLessThanOrEqual(DEFAULT_SA_CONFIG.T0);
  });
});
