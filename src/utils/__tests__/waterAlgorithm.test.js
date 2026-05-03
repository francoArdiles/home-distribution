import { describe, test, expect } from 'vitest';
import { generateWaterNetwork } from '../waterAlgorithm.js';

function el(type, x, y, network = 'water', props = {}) {
  return { id: `${type}-${x}-${y}`, type, x, y, rotation: 0, network, floor: 0, properties: props };
}

describe('generateWaterNetwork', () => {
  test('no water entry returns warning', () => {
    const { coldSegments, hotSegments, warnings } = generateWaterNetwork({});
    expect(coldSegments).toHaveLength(0);
    expect(hotSegments).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('entry only, no fixtures, returns no segments', () => {
    const entry = el('water-entry', 0, 0);
    const { coldSegments, hotSegments } = generateWaterNetwork({ networkElements: [entry] });
    expect(coldSegments).toHaveLength(0);
    expect(hotSegments).toHaveLength(0);
  });

  test('WC connected via cold segment', () => {
    const entry = el('water-entry', 0, 0);
    const wc    = el('wc', 5, 0, 'combined');
    const { coldSegments } = generateWaterNetwork({ networkElements: [entry, wc] });
    expect(coldSegments.length).toBeGreaterThan(0);
    expect(coldSegments.every(s => s.subtype === 'cold')).toBe(true);
  });

  test('hot tap without boiler warns', () => {
    const entry = el('water-entry', 0, 0);
    const tap   = el('water-tap', 5, 0, 'water', { tempType: 'hot' });
    const { warnings } = generateWaterNetwork({ networkElements: [entry, tap] });
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('boiler generates cold supply to boiler and hot segments for fixtures', () => {
    const entry  = el('water-entry', 0, 0);
    const boiler = el('boiler', 3, 0, 'water');
    const shower = el('shower-head', 6, 0, 'combined');
    const { coldSegments, hotSegments } = generateWaterNetwork({ networkElements: [entry, boiler, shower] });
    expect(coldSegments.some(s => s.subtype === 'cold')).toBe(true);
    expect(hotSegments.some(s => s.subtype === 'hot')).toBe(true);
  });

  test('all segments have network=water', () => {
    const entry  = el('water-entry', 0, 0);
    const boiler = el('boiler', 3, 0, 'water');
    const sink   = el('sink', 6, 0, 'combined');
    const { coldSegments, hotSegments } = generateWaterNetwork({ networkElements: [entry, boiler, sink] });
    const all = [...coldSegments, ...hotSegments];
    expect(all.every(s => s.network === 'water')).toBe(true);
  });

  test('no crash with empty detail', () => {
    expect(() => generateWaterNetwork({})).not.toThrow();
  });
});
