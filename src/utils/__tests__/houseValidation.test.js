import { describe, test, expect } from 'vitest';
import { validateHouse } from '../houseValidation.js';

function el(type, x, y, network = 'electrical', id = `${type}-${x}-${y}`) {
  return { id, type, x, y, network, properties: {} };
}

function seg(network, points, id = `seg-${Math.random()}`) {
  return { id, network, points, subtype: null, diameter: null, isExternal: false, floor: 0 };
}

describe('validateHouse', () => {
  test('empty detail returns no results', () => {
    expect(validateHouse({})).toEqual([]);
  });

  test('junction box with 5 segments reports error', () => {
    const jb = el('junction-box', 5, 5);
    const panel = el('main-panel', 0, 0);
    const segs = [0,1,2,3,4].map(i => seg('electrical', [{ x: 5, y: 5 }, { x: i, y: 10 }]));
    const results = validateHouse({ networkElements: [jb, panel], networkSegments: segs });
    const errors = results.filter(r => r.elementId === jb.id && r.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
  });

  test('junction box with 3 segments reports no error', () => {
    const jb = el('junction-box', 5, 5);
    const panel = el('main-panel', 0, 0);
    const segs = [0,1,2].map(i => seg('electrical', [{ x: 5, y: 5 }, { x: i, y: 10 }]));
    const results = validateHouse({ networkElements: [jb, panel], networkSegments: segs });
    expect(results.filter(r => r.elementId === jb.id && r.severity === 'error')).toHaveLength(0);
  });

  test('disconnected electrical element warns', () => {
    const panel  = el('main-panel', 0, 0);
    const outlet = el('outlet', 5, 5);
    // no segments connecting them
    const results = validateHouse({ networkElements: [panel, outlet], networkSegments: [] });
    expect(results.some(r => r.elementId === outlet.id && r.severity === 'warning')).toBe(true);
  });

  test('connected electrical element does not warn', () => {
    const panel  = el('main-panel', 0, 0);
    const outlet = el('outlet', 5, 5);
    const segs = [seg('electrical', [{ x: 0, y: 0 }, { x: 5, y: 5 }])];
    const results = validateHouse({ networkElements: [panel, outlet], networkSegments: segs });
    expect(results.filter(r => r.elementId === outlet.id)).toHaveLength(0);
  });

  test('diagonal water segment warns', () => {
    const wEntry = el('water-entry', 0, 0, 'water');
    const s = seg('water', [{ x: 0, y: 0 }, { x: 3, y: 2 }]); // ~34° angle
    const results = validateHouse({ networkElements: [wEntry], networkSegments: [s] });
    expect(results.some(r => r.segmentId === s.id && r.severity === 'warning')).toBe(true);
  });

  test('orthogonal water segment does not warn', () => {
    const wEntry = el('water-entry', 0, 0, 'water');
    const s = seg('water', [{ x: 0, y: 0 }, { x: 5, y: 0 }]); // horizontal
    const results = validateHouse({ networkElements: [wEntry], networkSegments: [s] });
    expect(results.filter(r => r.segmentId === s.id)).toHaveLength(0);
  });

  test('drainage 90-degree elbow reports error', () => {
    const s = seg('drainage', [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }]); // 90° at middle point
    const results = validateHouse({ networkElements: [], networkSegments: [s] });
    expect(results.some(r => r.segmentId === s.id && r.severity === 'error')).toBe(true);
  });

  test('drainage 45-degree elbow does not report error', () => {
    const s = seg('drainage', [{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 6, y: 3 }]); // 45° at middle
    const results = validateHouse({ networkElements: [], networkSegments: [s] });
    expect(results.filter(r => r.segmentId === s.id && r.severity === 'error')).toHaveLength(0);
  });

  test('no crashes with no elements and no segments', () => {
    expect(() => validateHouse({ networkElements: [], networkSegments: [] })).not.toThrow();
  });
});
