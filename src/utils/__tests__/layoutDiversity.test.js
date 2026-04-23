import { describe, test, expect } from 'vitest';
import { diversityDistance } from '../layoutDiversity.js';

const terrain = [
  { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 30 },
];
const diag = Math.hypot(30, 30);

const mk = (els) => ({ elements: els });
const el = (id, x, y) => ({ id, x, y });

describe('diversityDistance', () => {
  test('identical layouts -> 0', () => {
    const A = mk([el('a', 5, 5), el('b', 10, 10)]);
    const B = mk([el('a', 5, 5), el('b', 10, 10)]);
    expect(diversityDistance(A, B, terrain)).toBe(0);
  });

  test('single element shifted by 10m -> 10', () => {
    const A = mk([el('a', 0, 0)]);
    const B = mk([el('a', 10, 0)]);
    expect(diversityDistance(A, B, terrain)).toBeCloseTo(10, 6);
  });

  test('unpaired elements penalised with terrain diagonal', () => {
    const A = mk([el('a', 5, 5)]);
    const B = mk([el('b', 5, 5)]);
    const d = diversityDistance(A, B, terrain);
    // 2 unpaired ids, each diag^2; avg = diag^2; sqrt = diag.
    expect(d).toBeCloseTo(diag, 6);
  });

  test('symmetric', () => {
    const A = mk([el('a', 1, 2), el('b', 3, 4)]);
    const B = mk([el('a', 5, 6), el('b', 7, 8)]);
    expect(diversityDistance(A, B, terrain)).toBeCloseTo(diversityDistance(B, A, terrain), 9);
  });

  test('empty layouts -> 0', () => {
    expect(diversityDistance(mk([]), mk([]), terrain)).toBe(0);
  });
});
