import { describe, test, expect } from 'vitest';
import { repairLayout } from '../layoutRepair.js';

const terrain = [
  { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 30 },
];

const mkEl = (id, x, y, locked = false) => ({
  id, definitionId: 't', x, y, width: 2, height: 2, rotation: 0,
  shape: 'rectangle', locked,
});

describe('repairLayout', () => {
  test('separates two elements violating min-distance', () => {
    const layout = { elements: [mkEl('a', 10, 10), mkEl('b', 11, 10)] };
    const constraints = [
      { id: 'c1', type: 'min-distance', sourceId: 'a', targetId: 'b', value: 5, enabled: true },
    ];
    const { layout: repaired, converged } = repairLayout(layout, { terrainMeters: terrain, constraints }, 10);
    expect(converged).toBe(true);
    const a = repaired.elements.find(e => e.id === 'a');
    const b = repaired.elements.find(e => e.id === 'b');
    // Element centers should now be >= 5 + half-widths away (gap between edges >= 5).
    const dx = a.x - b.x, dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Edge-to-edge for 2x2 rects aligned: center distance - 2 >= 5 -> center dist >= 7
    expect(dist).toBeGreaterThanOrEqual(5);
  });

  test('locked element never moves; free element absorbs the push', () => {
    const layout = { elements: [mkEl('a', 10, 10, true), mkEl('b', 11, 10)] };
    const constraints = [
      { id: 'c1', type: 'min-distance', sourceId: 'a', targetId: 'b', value: 5, enabled: true },
    ];
    const { layout: repaired } = repairLayout(layout, { terrainMeters: terrain, constraints }, 10);
    const a = repaired.elements.find(e => e.id === 'a');
    const b = repaired.elements.find(e => e.id === 'b');
    expect(a.x).toBe(10);
    expect(a.y).toBe(10);
    expect(b.x === 11 && b.y === 10).toBe(false);
  });

  test('locked-locked violation: no movement, converged false', () => {
    const layout = { elements: [mkEl('a', 10, 10, true), mkEl('b', 11, 10, true)] };
    const constraints = [
      { id: 'c1', type: 'min-distance', sourceId: 'a', targetId: 'b', value: 5, enabled: true },
    ];
    const { layout: repaired, converged } = repairLayout(layout, { terrainMeters: terrain, constraints }, 10);
    expect(converged).toBe(false);
    const a = repaired.elements.find(e => e.id === 'a');
    const b = repaired.elements.find(e => e.id === 'b');
    expect(a.x).toBe(10);
    expect(b.x).toBe(11);
  });

  test('no constraints -> converged and unchanged', () => {
    const layout = { elements: [mkEl('a', 5, 5), mkEl('b', 6, 5)] };
    const { layout: repaired, converged } = repairLayout(layout, { terrainMeters: terrain, constraints: [] }, 10);
    expect(converged).toBe(true);
    expect(repaired.elements[0].x).toBe(5);
    expect(repaired.elements[1].x).toBe(6);
  });

  test('"any" target min-distance: pushes closest neighbor apart', () => {
    const layout = {
      elements: [mkEl('a', 10, 10), mkEl('b', 11, 10), mkEl('c', 25, 25)],
    };
    const constraints = [
      { id: 'c1', type: 'min-distance', sourceId: 'a', targetId: 'any', value: 5, enabled: true },
    ];
    const { layout: repaired } = repairLayout(layout, { terrainMeters: terrain, constraints }, 12);
    const a = repaired.elements.find(e => e.id === 'a');
    const b = repaired.elements.find(e => e.id === 'b');
    const dx = a.x - b.x, dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThan(2);
  });
});
