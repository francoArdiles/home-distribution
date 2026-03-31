import { describe, test, expect } from 'vitest';
import { removeElement, duplicateElement, calculateRectResize, calculateCircleResize, calculateRotation, rotatePoint } from '../elementUtils.js';

const el1 = { id: 'a', x: 5, y: 5, width: 3, height: 2, rotation: 0, label: 'Casa', isSelected: false };
const el2 = { id: 'b', x: 10, y: 10, width: 2, height: 2, rotation: 0, label: 'Huerto', isSelected: false };

describe('removeElement', () => {
  test('removes element by id', () => {
    const result = removeElement([el1, el2], 'a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });
  test('returns same array if id not found', () => {
    const result = removeElement([el1, el2], 'z');
    expect(result).toHaveLength(2);
  });
  test('returns empty array when removing last element', () => {
    expect(removeElement([el1], 'a')).toHaveLength(0);
  });
});

describe('duplicateElement', () => {
  test('creates element with different id', () => {
    const dup = duplicateElement(el1, 1, 1);
    expect(dup.id).not.toBe(el1.id);
  });
  test('applies offset to position', () => {
    const dup = duplicateElement(el1, 2, 3);
    expect(dup.x).toBe(el1.x + 2);
    expect(dup.y).toBe(el1.y + 3);
  });
  test('preserves all other fields', () => {
    const dup = duplicateElement(el1, 1, 1);
    expect(dup.width).toBe(el1.width);
    expect(dup.height).toBe(el1.height);
    expect(dup.label).toBe(el1.label);
    expect(dup.rotation).toBe(el1.rotation);
    expect(dup.isSelected).toBe(false);
  });
});

// el at x=5,y=5 width=10,height=8 | scale=1 baseScale=10 → sx=50,sy=50,hw=50,hh=40
const resizeEl = { x: 5, y: 5, width: 10, height: 8 };
const rOpts = { scale: 1, position: { x: 0, y: 0 }, baseScale: 10 };

describe('calculateRectResize', () => {
  test('dragging br corner updates width, height and center', () => {
    // br at (100,90), opp tl at (0,10) — drag br to (120,110)
    const r = calculateRectResize('br', 120, 110, resizeEl, rOpts.scale, rOpts.position, rOpts.baseScale);
    expect(r.x).toBeCloseTo(6);
    expect(r.y).toBeCloseTo(6);
    expect(r.width).toBeCloseTo(12);
    expect(r.height).toBeCloseTo(10);
  });

  test('dragging tl corner updates width and height', () => {
    // tl at (0,10), opp br at (100,90) — drag tl to (-20,-10)
    const r = calculateRectResize('tl', -20, -10, resizeEl, rOpts.scale, rOpts.position, rOpts.baseScale);
    expect(r.width).toBeCloseTo(12);
    expect(r.height).toBeCloseTo(10);
  });

  test('dragging tr corner', () => {
    // tr at (100,10), opp bl at (0,90) — drag tr to (120,0)
    const r = calculateRectResize('tr', 120, 0, resizeEl, rOpts.scale, rOpts.position, rOpts.baseScale);
    expect(r.width).toBeCloseTo(12);
    expect(r.height).toBeCloseTo(9);
  });

  test('minimum size is 0.5m', () => {
    // drag br almost to center
    const r = calculateRectResize('br', 1, 11, resizeEl, rOpts.scale, rOpts.position, rOpts.baseScale);
    expect(r.width).toBeGreaterThanOrEqual(0.5);
    expect(r.height).toBeGreaterThanOrEqual(0.5);
  });

  test('respects scale and position offset', () => {
    const r = calculateRectResize('br', 220, 210, resizeEl, 2, { x: 10, y: 10 }, 10);
    // bs=20, sx=110, sy=110, hw=100, hh=80
    // opp tl = (110-100, 110-80) = (10,30)
    // drag to (220,210): newCx=(220+10)/2=115, newCy=(210+30)/2=120
    // x=(115-10)/20=5.25, y=(120-10)/20=5.5, w=|220-10|/20=10.5, h=|210-30|/20=9
    expect(r.width).toBeCloseTo(10.5);
    expect(r.height).toBeCloseTo(9);
  });
});

describe('calculateCircleResize', () => {
  const circEl = { x: 5, y: 5 };

  test('drag right increases radius', () => {
    // center at (50,50), drag to (80,50) → dist=30px → radius=3m
    const r = calculateCircleResize(80, 50, circEl, 1, { x: 0, y: 0 }, 10);
    expect(r.radius).toBeCloseTo(3);
    expect(r.width).toBeCloseTo(6);
    expect(r.height).toBeCloseTo(6);
  });

  test('drag to decrease radius', () => {
    const r = calculateCircleResize(60, 50, circEl, 1, { x: 0, y: 0 }, 10);
    expect(r.radius).toBeCloseTo(1);
  });

  test('minimum radius is 0.5m', () => {
    const r = calculateCircleResize(50, 50, circEl, 1, { x: 0, y: 0 }, 10);
    expect(r.radius).toBeGreaterThanOrEqual(0.5);
  });

  test('diagonal drag uses Euclidean distance', () => {
    // drag to (80,80): dist = sqrt(30²+30²) = 30√2 ≈ 42.43 → radius ≈ 4.24m
    const r = calculateCircleResize(80, 80, circEl, 1, { x: 0, y: 0 }, 10);
    expect(r.radius).toBeCloseTo(Math.sqrt(30 * 30 + 30 * 30) / 10);
  });
});

describe('calculateRotation', () => {
  // center at (50,50)
  test('handle directly above → 0°', () => {
    expect(calculateRotation(50, 30, 50, 50)).toBeCloseTo(0);
  });
  test('handle to the right → 90°', () => {
    expect(calculateRotation(70, 50, 50, 50)).toBeCloseTo(90);
  });
  test('handle below → 180°', () => {
    expect(calculateRotation(50, 70, 50, 50)).toBeCloseTo(180);
  });
  test('handle to the left → 270°', () => {
    expect(calculateRotation(30, 50, 50, 50)).toBeCloseTo(270);
  });
  test('result is always in [0, 360)', () => {
    [0, 45, 90, 135, 180, 225, 270, 315].forEach(deg => {
      const rad = deg * Math.PI / 180;
      const hx = 50 + Math.sin(rad) * 20;
      const hy = 50 - Math.cos(rad) * 20;
      const result = calculateRotation(hx, hy, 50, 50);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(360);
    });
  });
});

describe('rotatePoint', () => {
  test('rotating 0° returns same point', () => {
    const r = rotatePoint(10, 5, 0, 0, 0);
    expect(r.x).toBeCloseTo(10);
    expect(r.y).toBeCloseTo(5);
  });

  test('rotating 90° around origin: (1,0) → (0,1)', () => {
    const r = rotatePoint(1, 0, 0, 0, 90);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
  });

  test('rotating 180° around origin inverts both axes', () => {
    const r = rotatePoint(3, 4, 0, 0, 180);
    expect(r.x).toBeCloseTo(-3);
    expect(r.y).toBeCloseTo(-4);
  });

  test('rotating around a non-origin center', () => {
    // (6, 5) rotated 90° around (5, 5) → (5, 6)
    const r = rotatePoint(6, 5, 5, 5, 90);
    expect(r.x).toBeCloseTo(5);
    expect(r.y).toBeCloseTo(6);
  });

  test('rotating -90° is inverse of 90°', () => {
    const r = rotatePoint(0, 1, 0, 0, -90);
    expect(r.x).toBeCloseTo(1);
    expect(r.y).toBeCloseTo(0);
  });
});
