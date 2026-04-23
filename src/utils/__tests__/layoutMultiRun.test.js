import { describe, test, expect, vi } from 'vitest';
import { runMultiRun } from '../layoutMultiRun.js';

const terrain = [
  { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 },
];

const mkEl = (id, x, y) => ({
  id, definitionId: 'casa', x, y, width: 2, height: 2, rotation: 0,
  shape: 'rectangle', properties: { minSpacing: 1 },
});

const fastConfig = { T0: 5, alpha: 0.8, itersPerT: 15, Tmin: 0.5, maxTimeMs: 60000, traceEvery: 1000 };

describe('runMultiRun', () => {
  test('returns at most maxPicks proposals', () => {
    const elements = [mkEl('a', 5, 5), mkEl('b', 12, 12)];
    const picks = runMultiRun({
      elements, terrainMeters: terrain, numRuns: 4, maxPicks: 2,
      minDiversity: 0, config: fastConfig,
    });
    expect(picks.length).toBeLessThanOrEqual(2);
    expect(picks.length).toBeGreaterThan(0);
  });

  test('calls onProgress once per run', () => {
    const onProgress = vi.fn();
    runMultiRun({
      elements: [mkEl('a', 5, 5)], terrainMeters: terrain,
      numRuns: 3, maxPicks: 5, minDiversity: 0, config: fastConfig,
    }, onProgress);
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls[2][0]).toMatchObject({ done: 3, total: 3 });
  });

  test('results sorted ascending by score', () => {
    const elements = [mkEl('a', 5, 5), mkEl('b', 12, 12)];
    const picks = runMultiRun({
      elements, terrainMeters: terrain, numRuns: 5, maxPicks: 5,
      minDiversity: 0, config: fastConfig,
    });
    for (let i = 1; i < picks.length; i++) {
      expect(picks[i].score).toBeGreaterThanOrEqual(picks[i - 1].score);
    }
  });

  test('enforces diversity threshold', () => {
    const elements = [mkEl('a', 5, 5), mkEl('b', 12, 12)];
    const picks = runMultiRun({
      elements, terrainMeters: terrain, numRuns: 6, maxPicks: 5,
      minDiversity: 2, config: fastConfig,
    });
    for (let i = 0; i < picks.length; i++) {
      for (let j = i + 1; j < picks.length; j++) {
        const a = picks[i].layout.elements;
        const b = picks[j].layout.elements;
        // Recompute diversity inline to validate.
        const ids = new Set([...a.map(e => e.id), ...b.map(e => e.id)]);
        const byA = new Map(a.map(e => [e.id, e]));
        const byB = new Map(b.map(e => [e.id, e]));
        let sum = 0;
        for (const id of ids) {
          const ea = byA.get(id), eb = byB.get(id);
          if (ea && eb) sum += (ea.x - eb.x) ** 2 + (ea.y - eb.y) ** 2;
        }
        const rms = Math.sqrt(sum / ids.size);
        expect(rms).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test('deterministic with same seedBase', () => {
    const elements = [mkEl('a', 5, 5), mkEl('b', 12, 12)];
    const params = {
      elements, terrainMeters: terrain, numRuns: 3, maxPicks: 5,
      minDiversity: 0, config: fastConfig, seedBase: 42,
    };
    const a = runMultiRun(params);
    const b = runMultiRun(params);
    expect(a.map(p => p.score)).toEqual(b.map(p => p.score));
  });
});
