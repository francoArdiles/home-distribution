import { describe, test, expect } from 'vitest';
import { solveGA, DEFAULT_GA_CONFIG } from '../layoutGA.js';

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

  test('seeded run is deterministic', () => {
    const layout = { elements: [mkEl('a', 5, 5), mkEl('b', 10, 10), mkEl('c', 20, 20)] };
    const ctx = { terrainMeters: squareTerrain, constraints: [] };
    const a = solveGA(layout, ctx, { ...DEFAULT_GA_CONFIG, seed: 99, generations: 15, populationSize: 12, maxTimeMs: 5000 });
    const b = solveGA(layout, ctx, { ...DEFAULT_GA_CONFIG, seed: 99, generations: 15, populationSize: 12, maxTimeMs: 5000 });
    expect(a.bestScore).toBe(b.bestScore);
  });
});
