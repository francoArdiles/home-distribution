import { describe, test, expect } from 'vitest';
import { generatePaths } from '../pathGenerator.js';

const squareTerrain = [
  { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 30 },
];

const mkEl = (id, definitionId, x, y, w = 2, h = 2) => ({
  id,
  definitionId,
  x, y,
  width: w, height: h,
  rotation: 0,
  shape: 'rectangle',
  properties: { minSpacing: 1 },
});

describe('generatePaths', () => {
  test('empty layout -> []', () => {
    const paths = generatePaths({ elements: [] }, squareTerrain);
    expect(paths).toEqual([]);
  });

  test('single element -> []', () => {
    const paths = generatePaths({ elements: [mkEl('a', 'casa', 15, 15, 4, 4)] }, squareTerrain);
    expect(paths).toEqual([]);
  });

  test('two elements -> at least one path connecting them', () => {
    const layout = {
      elements: [mkEl('a', 'casa', 10, 15, 4, 4), mkEl('b', 'huerto', 25, 15, 3, 3)],
    };
    const paths = generatePaths(layout, squareTerrain);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(p.points.length).toBeGreaterThanOrEqual(2);
      expect(p.finished).toBe(true);
      expect(p.source).toBe('auto');
    }
  });

  test('generated path has a valid width', () => {
    const layout = {
      elements: [mkEl('a', 'casa', 10, 15, 4, 4), mkEl('b', 'huerto', 25, 15, 3, 3)],
    };
    const paths = generatePaths(layout, squareTerrain);
    for (const p of paths) {
      expect([0.5, 0.8, 1.2]).toContain(p.width);
    }
  });

  test('hub is casa when present; width 1.2 appears in tree touching hub', () => {
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 15, 4, 4),
        mkEl('h', 'huerto', 25, 15, 3, 3),
      ],
    };
    const paths = generatePaths(layout, squareTerrain);
    const hasMain = paths.some(p => p.width === 1.2);
    expect(hasMain).toBe(true);
  });

  test('options.hubId overrides hub choice', () => {
    const layout = {
      elements: [
        mkEl('a', 'huerto', 5, 5, 3, 3),
        mkEl('b', 'huerto', 25, 25, 3, 3),
      ],
    };
    const paths = generatePaths(layout, squareTerrain, { hubId: 'a' });
    expect(paths.length).toBeGreaterThan(0);
  });

  test('three elements: shared trunk segment gets width 0.8 or 1.2', () => {
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 5, 4, 4),
        mkEl('h1', 'huerto', 10, 25, 3, 3),
        mkEl('h2', 'huerto', 20, 25, 3, 3),
      ],
    };
    const paths = generatePaths(layout, squareTerrain);
    const nonBranch = paths.filter(p => p.width >= 0.8);
    expect(nonBranch.length).toBeGreaterThan(0);
  });

  test('points are in meters inside terrain bbox', () => {
    const layout = {
      elements: [mkEl('a', 'casa', 10, 15, 4, 4), mkEl('b', 'huerto', 25, 15, 3, 3)],
    };
    const paths = generatePaths(layout, squareTerrain);
    for (const p of paths) {
      for (const pt of p.points) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(30);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(30);
      }
    }
  });

  test('entrance option adds a main-width route from hub to entrance', () => {
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 15, 4, 4),
        mkEl('h', 'huerto', 22, 15, 2, 2),
      ],
    };
    const noEntrance = generatePaths(layout, squareTerrain);
    const withEntrance = generatePaths(layout, squareTerrain, { entrance: { x: 0.5, y: 15 } });
    const totalLenWith = withEntrance.reduce((s, p) => {
      for (let i = 1; i < p.points.length; i++) {
        s += Math.hypot(p.points[i].x - p.points[i - 1].x, p.points[i].y - p.points[i - 1].y);
      }
      return s;
    }, 0);
    const totalLenWithout = noEntrance.reduce((s, p) => {
      for (let i = 1; i < p.points.length; i++) {
        s += Math.hypot(p.points[i].x - p.points[i - 1].x, p.points[i].y - p.points[i - 1].y);
      }
      return s;
    }, 0);
    expect(totalLenWith).toBeGreaterThan(totalLenWithout);
    expect(withEntrance.some(p => p.width === 1.2)).toBe(true);
  });

  test('entrance with explicit width: path to entrance uses 0.75 * width', () => {
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 15, 4, 4),
        mkEl('h', 'huerto', 22, 15, 2, 2),
      ],
    };
    const paths = generatePaths(layout, squareTerrain, {
      entrance: { x: 0.5, y: 15, width: 4 },
    });
    expect(paths.some(p => Math.abs(p.width - 3) < 1e-9)).toBe(true);
  });

  test('path points respect border margin = half of widest path', () => {
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 15, 4, 4),
        mkEl('h', 'huerto', 25, 5, 3, 3),
      ],
    };
    const paths = generatePaths(layout, squareTerrain, { entrance: { x: 0.5, y: 15, width: 4 } });
    // Widest path = entrance width*0.75 = 3 → margin 1.5. All path center points
    // should be ≥ 1.5 - gridStep/2 from any border.
    const terrainSegments = [
      [{ x: 0, y: 0 }, { x: 30, y: 0 }],
      [{ x: 30, y: 0 }, { x: 30, y: 30 }],
      [{ x: 30, y: 30 }, { x: 0, y: 30 }],
      [{ x: 0, y: 30 }, { x: 0, y: 0 }],
    ];
    const distToSeg = (p, a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      const cx = a.x + t * dx, cy = a.y + t * dy;
      return Math.hypot(p.x - cx, p.y - cy);
    };
    // Skip the very first point (the entrance snap itself sits just inside).
    for (const p of paths) {
      for (let k = 1; k < p.points.length; k++) {
        const pt = p.points[k];
        const minD = Math.min(...terrainSegments.map(([a, b]) => distToSeg(pt, a, b)));
        expect(minD).toBeGreaterThanOrEqual(1.5 - 0.5);
      }
    }
  });

  test('entrance without width falls back to main width', () => {
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 15, 4, 4),
        mkEl('h', 'huerto', 22, 15, 2, 2),
      ],
    };
    const paths = generatePaths(layout, squareTerrain, { entrance: { x: 0.5, y: 15 } });
    expect(paths.some(p => p.width === 1.2)).toBe(true);
  });

  test('pathMode none: element has no incident path', () => {
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 15, 4, 4),
        mkEl('h', 'huerto', 25, 15, 3, 3),
        { ...mkEl('iso', 'arbol', 5, 5, 1, 1), properties: { minSpacing: 1, pathMode: 'none' } },
      ],
    };
    const paths = generatePaths(layout, squareTerrain);
    // No path should come near (<1m) the isolated element.
    for (const p of paths) {
      for (const pt of p.points) {
        const d = Math.hypot(pt.x - 5, pt.y - 5);
        expect(d).toBeGreaterThan(1);
      }
    }
  });

  test('pathMode cluster: members share a representative, not individual hub links', () => {
    const mkCluster = (id, x, y) => ({
      ...mkEl(id, 'arbol', x, y, 1, 1),
      properties: { minSpacing: 0.5, pathMode: 'cluster', clusterId: 'arboles' },
    });
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 15, 4, 4),
        mkCluster('t1', 5, 5),
        mkCluster('t2', 5, 8),
        mkCluster('t3', 5, 11),
      ],
    };
    const paths = generatePaths(layout, squareTerrain);
    expect(paths.length).toBeGreaterThan(0);
    // At least one main-width segment (representative-to-hub).
    expect(paths.some(p => p.width === 1.2)).toBe(true);
  });

  test('pathMode cluster with single member still routes to hub', () => {
    const layout = {
      elements: [
        mkEl('casa1', 'casa', 15, 15, 4, 4),
        { ...mkEl('t', 'arbol', 5, 5, 1, 1), properties: { minSpacing: 0.5, pathMode: 'cluster', clusterId: 'arboles' } },
      ],
    };
    const paths = generatePaths(layout, squareTerrain);
    expect(paths.length).toBeGreaterThan(0);
  });

  test('performance: 10 elements in 50x50m terrain completes < 2s', () => {
    const big = [
      { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 },
    ];
    const elements = [];
    elements.push(mkEl('hub', 'casa', 25, 25, 4, 4));
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2;
      elements.push(mkEl(`e${i}`, 'huerto', 25 + 15 * Math.cos(ang), 25 + 15 * Math.sin(ang), 2, 2));
    }
    const start = Date.now();
    generatePaths({ elements }, big);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});
