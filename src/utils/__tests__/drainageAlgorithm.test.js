import { describe, test, expect } from 'vitest';
import { generateDrainageNetwork } from '../drainageAlgorithm.js';

function el(type, x, y, network = 'drainage') {
  return { id: `${type}-${x}-${y}`, type, x, y, rotation: 0, network, floor: 0, properties: {} };
}

function angleBetween(p1, p2, p3) {
  const a1 = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  const a2 = Math.atan2(p3.y - p2.y, p3.x - p2.x) * 180 / Math.PI;
  let d = Math.abs(((a2 - a1) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

describe('generateDrainageNetwork', () => {
  test('no drain exit returns warning', () => {
    const { segments, warnings } = generateDrainageNetwork({});
    expect(segments).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('drain exit only returns no segments', () => {
    const exit = el('drain-exit', 0, 0);
    const { segments } = generateDrainageNetwork({ networkElements: [exit] });
    expect(segments).toHaveLength(0);
  });

  test('WC uses 100mm diameter', () => {
    const exit = el('drain-exit', 0, 0);
    const wc   = el('wc', 5, 0, 'combined');
    const { segments } = generateDrainageNetwork({ networkElements: [exit, wc] });
    expect(segments.some(s => s.diameter === 100)).toBe(true);
  });

  test('sink uses 50mm diameter', () => {
    const exit = el('drain-exit', 0, 0);
    const sink = el('sink', 5, 0, 'combined');
    const { segments } = generateDrainageNetwork({ networkElements: [exit, sink] });
    expect(segments.some(s => s.diameter === 50)).toBe(true);
  });

  test('all segments have network=drainage', () => {
    const exit = el('drain-exit', 0, 0);
    const wc   = el('wc', 3, 0, 'combined');
    const sink = el('sink', 0, 4, 'combined');
    const { segments } = generateDrainageNetwork({ networkElements: [exit, wc, sink] });
    expect(segments.every(s => s.network === 'drainage')).toBe(true);
  });

  test('diagonal route has no 90-degree elbow', () => {
    const exit = el('drain-exit', 0, 0);
    const wc   = el('wc', 4, 3, 'combined'); // non-orthogonal from exit
    const { segments } = generateDrainageNetwork({ networkElements: [exit, wc] });
    for (const seg of segments) {
      for (let i = 1; i < seg.points.length - 1; i++) {
        const angle = angleBetween(seg.points[i - 1], seg.points[i], seg.points[i + 1]);
        expect(angle).not.toBeCloseTo(90, 0);
      }
    }
  });

  test('no crash with empty detail', () => {
    expect(() => generateDrainageNetwork({})).not.toThrow();
  });
});
