import { describe, test, expect } from 'vitest';
import { generateElectricalNetwork } from '../electricalAlgorithm.js';

function el(type, x, y, network = 'electrical') {
  return { id: `${type}-${x}-${y}`, type, x, y, rotation: 0, network, floor: 0, properties: {} };
}

describe('generateElectricalNetwork', () => {
  test('no main panel returns warning', () => {
    const { segments, autoBoxes, warnings } = generateElectricalNetwork({});
    expect(segments).toHaveLength(0);
    expect(autoBoxes).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('panel only, no fixtures, returns no segments', () => {
    const detail = { networkElements: [el('main-panel', 0, 0)] };
    const { segments, autoBoxes } = generateElectricalNetwork(detail);
    expect(segments).toHaveLength(0);
    expect(autoBoxes).toHaveLength(0);
  });

  test('special outlet connects directly to panel', () => {
    const panel = el('main-panel', 0, 0);
    const sp    = el('outlet-special', 5, 0);
    const { segments } = generateElectricalNetwork({ networkElements: [panel, sp] });
    expect(segments.length).toBeGreaterThan(0);
    // all segments should be electrical
    expect(segments.every(s => s.network === 'electrical')).toBe(true);
  });

  test('fixtures without rooms connect to panel directly', () => {
    const panel  = el('main-panel', 0, 0);
    const outlet = el('outlet', 5, 5);
    const { segments, autoBoxes } = generateElectricalNetwork({ networkElements: [panel, outlet], rooms: [] });
    expect(segments.length).toBeGreaterThan(0);
  });

  test('fixtures inside rooms get a junction box', () => {
    const panel  = el('main-panel', 0, 0);
    const outlet = el('outlet', 5, 5);
    const room = {
      id: 'room-1',
      centroid: { x: 5, y: 5 },
      polygon: [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 8 }, { x: 2, y: 8 }],
    };
    const { autoBoxes } = generateElectricalNetwork({ networkElements: [panel, outlet], rooms: [room] });
    expect(autoBoxes.length).toBeGreaterThan(0);
    expect(autoBoxes[0].type).toBe('junction-box');
  });

  test('more than 3 fixtures in a room inserts extra junction box', () => {
    const panel  = el('main-panel', 0, 0);
    const fixtures = [3,4,5,6].map(x => el('outlet', x, 5));
    const room = {
      id: 'room-1',
      centroid: { x: 5, y: 5 },
      polygon: [{ x: 1, y: 2 }, { x: 9, y: 2 }, { x: 9, y: 8 }, { x: 1, y: 8 }],
    };
    const { autoBoxes } = generateElectricalNetwork({ networkElements: [panel, ...fixtures], rooms: [room] });
    expect(autoBoxes.length).toBeGreaterThanOrEqual(2); // main box + overflow box
  });

  test('produces only electrical segments', () => {
    const panel  = el('main-panel', 0, 0);
    const outlet = el('outlet', 5, 0);
    const { segments } = generateElectricalNetwork({ networkElements: [panel, outlet] });
    expect(segments.every(s => s.network === 'electrical')).toBe(true);
  });

  test('no crash with empty detail', () => {
    expect(() => generateElectricalNetwork({})).not.toThrow();
  });
});
