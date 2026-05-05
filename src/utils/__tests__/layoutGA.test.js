import { describe, test, expect } from 'vitest';
import { solveGA, DEFAULT_GA_CONFIG } from '../layoutGA.js';
import { diversityDistance } from '../layoutDiversity.js';

const squareTerrain = [
  { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 30 },
];

const mkEl = (id, x, y, locked = false) => ({
  id,
  definitionId: 'huerto',
  x, y,
  width: 2, height: 2,
  rotation: 0,
  shape: 'rectangle',
  locked,
});

describe('solveGA', () => {
  test('improves (or matches) score vs initial layout', () => {
    const layout = { elements: [mkEl('a', 5, 5), mkEl('b', 6, 5), mkEl('c', 7, 5)] };
    const constraints = [
      { id: 'c1', sourceId: 'a', targetId: 'b', type: 'min-distance', value: 5, enabled: true },
      { id: 'c2', sourceId: 'b', targetId: 'c', type: 'min-distance', value: 5, enabled: true },
    ];
    const ctx = { terrainMeters: squareTerrain, constraints };
    const { best, bestScore } = solveGA(layout, ctx, {
      ...DEFAULT_GA_CONFIG, seed: 7, generations: 40, populationSize: 16, maxTimeMs: 3000,
    });
    expect(best.elements).toHaveLength(3);
    expect(bestScore).toBeGreaterThanOrEqual(0);
  });

  test('locked element never moves', () => {
    const layout = { elements: [mkEl('a', 10, 10, true), mkEl('b', 20, 20)] };
    const ctx = { terrainMeters: squareTerrain, constraints: [] };
    const { best } = solveGA(layout, ctx, {
      ...DEFAULT_GA_CONFIG, seed: 3, generations: 20, populationSize: 10, maxTimeMs: 2000,
    });
    const locked = best.elements.find(e => e.id === 'a');
    expect(locked.x).toBe(10);
    expect(locked.y).toBe(10);
  });

  test('stops by time when budget exceeded', () => {
    const layout = { elements: [mkEl('a', 5, 5), mkEl('b', 10, 10)] };
    const ctx = { terrainMeters: squareTerrain, constraints: [] };
    const res = solveGA(layout, ctx, {
      ...DEFAULT_GA_CONFIG, seed: 1, generations: 100000, populationSize: 40, maxTimeMs: 50,
    });
    expect(res.stoppedBy).toBe('time');
  });

  test('returns a set of diverse finalists (not just best)', () => {
    const layout = {
      elements: [
        mkEl('a', 5, 5), mkEl('b', 10, 5), mkEl('c', 15, 5),
        mkEl('d', 20, 5), mkEl('e', 25, 5),
      ],
    };
    const ctx = { terrainMeters: squareTerrain, constraints: [] };
    const { finalists } = solveGA(layout, ctx, {
      ...DEFAULT_GA_CONFIG,
      seed: 11,
      populationSize: 20,
      generations: 30,
      maxTimeMs: 60000,
      finalistCount: 5,
      finalistMinDiversity: 1,
    });
    expect(Array.isArray(finalists)).toBe(true);
    expect(finalists.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < finalists.length; i++) {
      expect(finalists[i].score).toBeGreaterThanOrEqual(finalists[i - 1].score);
    }
  });

  test('different seeds produce substantially different best layouts', () => {
    const layout = {
      elements: [
        mkEl('a', 15, 15), mkEl('b', 15, 15), mkEl('c', 15, 15),
        mkEl('d', 15, 15), mkEl('e', 15, 15), mkEl('f', 15, 15),
      ],
    };
    const ctx = { terrainMeters: squareTerrain, constraints: [] };
    const cfg = { ...DEFAULT_GA_CONFIG, populationSize: 20, generations: 30, maxTimeMs: 60000 };
    const r1 = solveGA(layout, ctx, { ...cfg, seed: 1 });
    const r2 = solveGA(layout, ctx, { ...cfg, seed: 2 });
    const d = diversityDistance(r1.best, r2.best, squareTerrain);
    expect(d).toBeGreaterThan(1);
  });

  test('finalists of a single run are themselves diverse', () => {
    const layout = {
      elements: [
        mkEl('a', 15, 15), mkEl('b', 15, 15), mkEl('c', 15, 15), mkEl('d', 15, 15),
      ],
    };
    const ctx = { terrainMeters: squareTerrain, constraints: [] };
    const { finalists } = solveGA(layout, ctx, {
      ...DEFAULT_GA_CONFIG, seed: 5, populationSize: 20, generations: 25,
      maxTimeMs: 60000, finalistCount: 5, finalistMinDiversity: 1.5,
    });
    expect(finalists.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < finalists.length; i++) {
      for (let j = i + 1; j < finalists.length; j++) {
        const d = diversityDistance(finalists[i].layout, finalists[j].layout, squareTerrain);
        expect(d).toBeGreaterThanOrEqual(1.5);
      }
    }
  });

  test('seeded run is deterministic', () => {
    const layout = { elements: [mkEl('a', 5, 5), mkEl('b', 10, 10), mkEl('c', 20, 20)] };
    const ctx = { terrainMeters: squareTerrain, constraints: [] };
    const a = solveGA(layout, ctx, { ...DEFAULT_GA_CONFIG, seed: 99, generations: 15, populationSize: 12, maxTimeMs: 5000 });
    const b = solveGA(layout, ctx, { ...DEFAULT_GA_CONFIG, seed: 99, generations: 15, populationSize: 12, maxTimeMs: 5000 });
    expect(a.bestScore).toBe(b.bestScore);
  });
});
