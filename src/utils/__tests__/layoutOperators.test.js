import { describe, test, expect } from 'vitest';
import { jitter, swap, rotate, reseed, randomOperator } from '../layoutOperators.js';

const squareTerrain = [
  { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 },
];

const mkRect = (id, x, y, w = 2, h = 2) => ({
  id, definitionId: 'test', x, y, width: w, height: h, rotation: 0, shape: 'rectangle',
});

const mkCircle = (id, x, y, r = 1) => ({
  id, definitionId: 'test', x, y, width: r * 2, height: r * 2, radius: r, rotation: 0, shape: 'circle',
});

// Deterministic rng factories
const fixedRng = (val) => () => val;
const seqRng = (seq) => {
  let i = 0;
  return () => seq[i++ % seq.length];
};

describe('jitter', () => {
  const layout = { elements: [mkRect('a', 10, 10), mkRect('b', 5, 5)] };

  test('does not mutate input', () => {
    const original = JSON.parse(JSON.stringify(layout));
    jitter(layout, { temperature: 0.5, terrainMeters: squareTerrain, rng: fixedRng(0.5) });
    expect(layout).toEqual(original);
  });

  test('modifies exactly one element', () => {
    // rng sequence: pick index 0, then gaussian samples
    const result = jitter(layout, { temperature: 0.5, terrainMeters: squareTerrain, rng: seqRng([0, 0.3, 0.7, 0.4, 0.6]) });
    const differ = result.elements.filter((e, i) => e.x !== layout.elements[i].x || e.y !== layout.elements[i].y);
    expect(differ.length).toBe(1);
  });

  test('keeps element center inside terrain bbox', () => {
    for (let i = 0; i < 20; i++) {
      const result = jitter(layout, { temperature: 10, terrainMeters: squareTerrain, rng: Math.random });
      for (const el of result.elements) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.x).toBeLessThanOrEqual(20);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.y).toBeLessThanOrEqual(20);
      }
    }
  });

  test('temperature 0 -> no movement', () => {
    const result = jitter(layout, { temperature: 0, terrainMeters: squareTerrain, rng: seqRng([0, 0.1, 0.2, 0.3, 0.4]) });
    expect(result.elements[0].x).toBe(layout.elements[0].x);
    expect(result.elements[0].y).toBe(layout.elements[0].y);
  });
});

describe('swap', () => {
  test('layout with 1 element -> identity', () => {
    const layout = { elements: [mkRect('a', 5, 5)] };
    const result = swap(layout, { rng: fixedRng(0) });
    expect(result.elements[0].x).toBe(5);
    expect(result.elements[0].y).toBe(5);
  });

  test('2 elements -> swaps x,y', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 10)] };
    // rng=0 picks index 0 and 1
    const result = swap(layout, { rng: seqRng([0, 0.99]) });
    const a = result.elements.find(e => e.id === 'a');
    const b = result.elements.find(e => e.id === 'b');
    expect(a.x).toBe(15);
    expect(a.y).toBe(10);
    expect(b.x).toBe(5);
    expect(b.y).toBe(5);
  });

  test('width/height/rotation preserved in swap', () => {
    const layout = { elements: [mkRect('a', 5, 5, 4, 6), { ...mkRect('b', 15, 10, 2, 3), rotation: 90 }] };
    const result = swap(layout, { rng: seqRng([0, 0.99]) });
    const a = result.elements.find(e => e.id === 'a');
    expect(a.width).toBe(4);
    expect(a.height).toBe(6);
    expect(a.rotation).toBe(0);
  });

  test('does not mutate input', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 10)] };
    const snapshot = JSON.parse(JSON.stringify(layout));
    swap(layout, { rng: seqRng([0, 0.99]) });
    expect(layout).toEqual(snapshot);
  });
});

describe('rotate', () => {
  test('rectangular element toggles 0 -> 90', () => {
    const layout = { elements: [mkRect('a', 5, 5)] };
    const result = rotate(layout, { rng: fixedRng(0) });
    expect(result.elements[0].rotation).toBe(90);
  });

  test('toggles 90 -> 0', () => {
    const layout = { elements: [{ ...mkRect('a', 5, 5), rotation: 90 }] };
    const result = rotate(layout, { rng: fixedRng(0) });
    expect(result.elements[0].rotation).toBe(0);
  });

  test('circle element not rotated', () => {
    const layout = { elements: [mkCircle('a', 5, 5)] };
    const result = rotate(layout, { rng: fixedRng(0) });
    expect(result.elements[0].rotation).toBe(0);
  });

  test('empty rectangle list -> identity', () => {
    const layout = { elements: [mkCircle('a', 5, 5)] };
    const result = rotate(layout, { rng: fixedRng(0) });
    expect(result).toEqual(layout);
  });
});

describe('reseed', () => {
  test('new position inside terrain bbox', () => {
    const layout = { elements: [mkRect('a', 5, 5)] };
    for (let i = 0; i < 10; i++) {
      const result = reseed(layout, { terrainMeters: squareTerrain, rng: Math.random });
      expect(result.elements[0].x).toBeGreaterThanOrEqual(0);
      expect(result.elements[0].x).toBeLessThanOrEqual(20);
    }
  });

  test('does not mutate input', () => {
    const layout = { elements: [mkRect('a', 5, 5)] };
    const snapshot = JSON.parse(JSON.stringify(layout));
    reseed(layout, { terrainMeters: squareTerrain, rng: Math.random });
    expect(layout).toEqual(snapshot);
  });
});

describe('randomOperator', () => {
  test('deterministic with fixed rng', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const ctx = { temperature: 0.5, terrainMeters: squareTerrain, rng: seqRng([0.1, 0.3, 0.5, 0.7, 0.9]) };
    const a = randomOperator(layout, ctx);
    const b = randomOperator(layout, { ...ctx, rng: seqRng([0.1, 0.3, 0.5, 0.7, 0.9]) });
    expect(a).toEqual(b);
  });

  test('returns a layout with same element count', () => {
    const layout = { elements: [mkRect('a', 5, 5), mkRect('b', 15, 15)] };
    const result = randomOperator(layout, { temperature: 0.5, terrainMeters: squareTerrain, rng: Math.random });
    expect(result.elements.length).toBe(layout.elements.length);
  });
});

describe('locked elements', () => {
  const ctx = (rngVals) => ({
    temperature: 0.5,
    terrainMeters: squareTerrain,
    rng: typeof rngVals === 'function' ? rngVals : seqRng(rngVals),
  });

  test('jitter never moves locked element', () => {
    const layout = {
      elements: [
        { ...mkRect('a', 10, 10), locked: true },
        mkRect('b', 5, 5),
      ],
    };
    for (let i = 0; i < 20; i++) {
      const out = jitter(layout, ctx(Math.random));
      expect(out.elements[0].x).toBe(10);
      expect(out.elements[0].y).toBe(10);
    }
  });

  test('reseed never moves locked element', () => {
    const layout = {
      elements: [
        { ...mkRect('a', 10, 10), locked: true },
        mkRect('b', 5, 5),
      ],
    };
    for (let i = 0; i < 20; i++) {
      const out = reseed(layout, ctx(Math.random));
      expect(out.elements[0].x).toBe(10);
      expect(out.elements[0].y).toBe(10);
    }
  });

  test('rotate skips locked rectangles', () => {
    const layout = {
      elements: [{ ...mkRect('a', 10, 10), locked: true }],
    };
    const out = rotate(layout, ctx(fixedRng(0)));
    expect(out.elements[0].rotation).toBe(0);
  });

  test('swap does not touch locked elements', () => {
    const layout = {
      elements: [
        { ...mkRect('a', 10, 10), locked: true },
        mkRect('b', 5, 5),
        mkRect('c', 15, 15),
      ],
    };
    for (let i = 0; i < 20; i++) {
      const out = swap(layout, ctx(Math.random));
      expect(out.elements[0].x).toBe(10);
      expect(out.elements[0].y).toBe(10);
    }
  });

  test('all locked: operators return layout unchanged', () => {
    const layout = {
      elements: [
        { ...mkRect('a', 10, 10), locked: true },
        { ...mkRect('b', 5, 5), locked: true },
      ],
    };
    const c = ctx(Math.random);
    expect(jitter(layout, c)).toEqual(layout);
    expect(reseed(layout, c)).toEqual(layout);
    expect(rotate(layout, c)).toEqual(layout);
    expect(swap(layout, c)).toEqual(layout);
  });
});
