import { describe, test, expect } from 'vitest';
import {
  distancePointToPoint,
  distancePointToSegment,
  distancePointToPolygon,
  distanceRectToRect,
  distanceCircleToCircle,
  distanceRectToCircle,
  distanceElementToElement,
  distanceElementToTerrain,
} from '../distanceUtils.js';

describe('distancePointToPoint', () => {
  test('(0,0)→(3,4) = 5', () => {
    expect(distancePointToPoint({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });
  test('same point = 0', () => {
    expect(distancePointToPoint({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(0);
  });
});

describe('distancePointToSegment', () => {
  test('point on the segment = 0', () => {
    expect(distancePointToSegment({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
  });
  test('point perpendicular to middle of segment', () => {
    expect(distancePointToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(3);
  });
  test('point beyond end of segment → distance to endpoint', () => {
    expect(distancePointToSegment({ x: 15, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  });
});

describe('distancePointToPolygon', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

  test('point inside polygon = 0', () => {
    expect(distancePointToPolygon({ x: 5, y: 5 }, square)).toBe(0);
  });
  test('point outside → distance to nearest edge', () => {
    expect(distancePointToPolygon({ x: 15, y: 5 }, square)).toBeCloseTo(5);
  });
});

describe('distanceRectToRect', () => {
  test('separated horizontally: distance = gap', () => {
    const a = { x: 5, y: 5, width: 4, height: 4 }; // covers 3..7 x 3..7
    const b = { x: 15, y: 5, width: 4, height: 4 }; // covers 13..17 x 3..7
    expect(distanceRectToRect(a, b)).toBeCloseTo(6);
  });
  test('overlapping rects = 0', () => {
    const a = { x: 5, y: 5, width: 4, height: 4 };
    expect(distanceRectToRect(a, a)).toBe(0);
  });
  test('touching rects = 0', () => {
    const a = { x: 2, y: 5, width: 4, height: 4 }; // right edge at 4
    const b = { x: 6, y: 5, width: 4, height: 4 }; // left edge at 4
    expect(distanceRectToRect(a, b)).toBe(0);
  });
  test('diagonal separation', () => {
    const a = { x: 0, y: 0, width: 2, height: 2 }; // -1..1 x -1..1
    const b = { x: 4, y: 4, width: 2, height: 2 }; // 3..5 x 3..5
    expect(distanceRectToRect(a, b)).toBeCloseTo(Math.sqrt(2 * 4));
  });
});

describe('distanceCircleToCircle', () => {
  test('separated circles: dist = dist_centers - r1 - r2', () => {
    const a = { x: 0, y: 0, radius: 2 };
    const b = { x: 10, y: 0, radius: 3 };
    expect(distanceCircleToCircle(a, b)).toBeCloseTo(5);
  });
  test('overlapping circles = 0', () => {
    const a = { x: 0, y: 0, radius: 5 };
    const b = { x: 3, y: 0, radius: 5 };
    expect(distanceCircleToCircle(a, b)).toBe(0);
  });
  test('tangent circles = 0', () => {
    const a = { x: 0, y: 0, radius: 3 };
    const b = { x: 6, y: 0, radius: 3 };
    expect(distanceCircleToCircle(a, b)).toBe(0);
  });
});

describe('distanceRectToCircle', () => {
  test('circle outside rect: correct distance', () => {
    const rect = { x: 5, y: 5, width: 4, height: 4 }; // 3..7 x 3..7
    const circ = { x: 12, y: 5, radius: 1 };
    expect(distanceRectToCircle(rect, circ)).toBeCloseTo(4);
  });
  test('circle touching rect = 0', () => {
    const rect = { x: 5, y: 5, width: 4, height: 4 }; // right edge at 7
    const circ = { x: 8, y: 5, radius: 1 }; // left edge at 7
    expect(distanceRectToCircle(rect, circ)).toBe(0);
  });
  test('circle overlapping rect = 0', () => {
    const rect = { x: 5, y: 5, width: 4, height: 4 };
    const circ = { x: 5, y: 5, radius: 1 };
    expect(distanceRectToCircle(rect, circ)).toBe(0);
  });
});

describe('distanceElementToElement', () => {
  test('two rectangles separated', () => {
    const a = { x: 2, y: 5, width: 2, height: 2, shape: 'rectangle' };
    const b = { x: 8, y: 5, width: 2, height: 2, shape: 'rectangle' };
    // a covers 1..3, b covers 7..9 → gap = 4
    expect(distanceElementToElement(a, b)).toBeCloseTo(4);
  });
  test('two circles separated', () => {
    const a = { x: 0, y: 0, radius: 1, shape: 'circle' };
    const b = { x: 5, y: 0, radius: 1, shape: 'circle' };
    expect(distanceElementToElement(a, b)).toBeCloseTo(3);
  });
});

describe('distanceElementToTerrain', () => {
  const baseScale = 10;
  // 20x20m terrain → pixels 0..200
  const squareTerrain = [
    { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 },
  ];

  test('element in center of terrain → distance > 0', () => {
    const el = { x: 10, y: 10, width: 2, height: 2, shape: 'rectangle' };
    const d = distanceElementToTerrain(el, squareTerrain, baseScale);
    expect(d).toBeGreaterThan(0);
  });

  test('element near border → small distance', () => {
    // right edge of element at 19m, terrain right edge at 20m → dist ≈ 1m
    const el = { x: 18.5, y: 10, width: 1, height: 1, shape: 'rectangle' };
    const d = distanceElementToTerrain(el, squareTerrain, baseScale);
    expect(d).toBeCloseTo(1, 0);
  });
});
