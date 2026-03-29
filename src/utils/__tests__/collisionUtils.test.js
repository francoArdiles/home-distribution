import { describe, test, expect } from 'vitest';
import {
  isPointInPolygon,
  isRectangleInPolygon,
  isCircleInPolygon,
  snapToGrid,
} from '../collisionUtils.js';

// Square terrain 0-100 x 0-100 (in pixels, baseScale=10 means 10x10 meters)
const squareTerrain = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe('isPointInPolygon', () => {
  test('point inside square → true', () => {
    expect(isPointInPolygon({ x: 50, y: 50 }, squareTerrain)).toBe(true);
  });
  test('point outside square → false', () => {
    expect(isPointInPolygon({ x: 150, y: 50 }, squareTerrain)).toBe(false);
  });
  test('point at center → true', () => {
    expect(isPointInPolygon({ x: 50, y: 50 }, squareTerrain)).toBe(true);
  });
  test('returns false for empty polygon', () => {
    expect(isPointInPolygon({ x: 50, y: 50 }, [])).toBe(false);
  });
});

describe('isRectangleInPolygon', () => {
  // baseScale=10: rect in meters, polygon in pixels
  test('rectangle fully inside → true', () => {
    const rect = { x: 2, y: 2, width: 3, height: 3 }; // 2-5m x 2-5m → 20-50px
    expect(isRectangleInPolygon(rect, squareTerrain, 10)).toBe(true);
  });
  test('rectangle partially outside → false', () => {
    const rect = { x: 8, y: 2, width: 4, height: 3 }; // extends to 12m → 120px, outside 100px
    expect(isRectangleInPolygon(rect, squareTerrain, 10)).toBe(false);
  });
  test('rectangle fully outside → false', () => {
    const rect = { x: 15, y: 15, width: 3, height: 3 };
    expect(isRectangleInPolygon(rect, squareTerrain, 10)).toBe(false);
  });
});

describe('isCircleInPolygon', () => {
  test('circle fully inside → true', () => {
    const circle = { x: 5, y: 5, radius: 2 }; // center 50px, radius 20px
    expect(isCircleInPolygon(circle, squareTerrain, 10)).toBe(true);
  });
  test('circle partially outside → false', () => {
    const circle = { x: 9, y: 5, radius: 2 }; // reaches 110px
    expect(isCircleInPolygon(circle, squareTerrain, 10)).toBe(false);
  });
  test('circle fully outside → false', () => {
    const circle = { x: 15, y: 5, radius: 1 };
    expect(isCircleInPolygon(circle, squareTerrain, 10)).toBe(false);
  });
});

describe('snapToGrid', () => {
  test('snapToGrid(13, 10) → 10', () => expect(snapToGrid(13, 10)).toBe(10));
  test('snapToGrid(17, 10) → 20', () => expect(snapToGrid(17, 10)).toBe(20));
  test('snapToGrid(25, 10) → 30', () => expect(snapToGrid(25, 10)).toBe(30));
  test('snapToGrid(0, 10) → 0', () => expect(snapToGrid(0, 10)).toBe(0));
  test('snapToGrid(10, 10) → 10', () => expect(snapToGrid(10, 10)).toBe(10));
  test('snapToGrid(2.4, 1) → 2', () => expect(snapToGrid(2.4, 1)).toBe(2));
});
