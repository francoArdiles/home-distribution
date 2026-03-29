import { describe, test, expect } from 'vitest';
import { getShadowLength, getShadowDirection, getShadowPolygon } from '../shadowUtils.js';

describe('getShadowLength', () => {
  test('elevation 45° → length ≈ height (tan45=1)', () => {
    expect(getShadowLength(10, 45)).toBeCloseTo(10, 1);
  });
  test('elevation 30° → length ≈ 17.32m (tan30≈0.577)', () => {
    expect(getShadowLength(10, 30)).toBeCloseTo(17.32, 1);
  });
  test('elevation 90° (sol cenital) → length ≈ 0', () => {
    expect(getShadowLength(10, 90)).toBeCloseTo(0, 1);
  });
  test('elevation 0° (horizonte) → Infinity', () => {
    expect(getShadowLength(10, 0)).toBe(Infinity);
  });
  test('elevation negativa (noche) → Infinity', () => {
    expect(getShadowLength(10, -10)).toBe(Infinity);
  });
  test('altura 0 → sombra de longitud 0', () => {
    expect(getShadowLength(0, 45)).toBeCloseTo(0, 5);
  });
});

describe('getShadowDirection', () => {
  test('sol al Sur (az=180) → sombra al Norte (0°)', () => {
    expect(getShadowDirection(180)).toBeCloseTo(0, 5);
  });
  test('sol al Este (az=90) → sombra al Oeste (270°)', () => {
    expect(getShadowDirection(90)).toBeCloseTo(270, 5);
  });
  test('sol al Norte (az=0) → sombra al Sur (180°)', () => {
    expect(getShadowDirection(0)).toBeCloseTo(180, 5);
  });
  test('resultado siempre en [0, 360)', () => {
    [0, 45, 90, 135, 180, 225, 270, 315].forEach(az => {
      const d = getShadowDirection(az);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(360);
    });
  });
});

describe('getShadowPolygon', () => {
  const rectEl = { x: 5, y: 5, width: 4, height: 2, shape: 'rectangle', elementHeight: 3 };
  const circEl = { x: 5, y: 5, radius: 2, width: 4, height: 4, shape: 'circle', elementHeight: 3 };

  test('retorna array de puntos {x,y}', () => {
    const poly = getShadowPolygon(rectEl, 45, 180);
    expect(Array.isArray(poly)).toBe(true);
    expect(poly.length).toBeGreaterThan(0);
    expect(typeof poly[0].x).toBe('number');
    expect(typeof poly[0].y).toBe('number');
  });

  test('rectángulo retorna 4 puntos de sombra', () => {
    const poly = getShadowPolygon(rectEl, 45, 180);
    expect(poly.length).toBe(4);
  });

  test('círculo retorna ≥ 4 puntos de sombra', () => {
    const poly = getShadowPolygon(circEl, 45, 180);
    expect(poly.length).toBeGreaterThanOrEqual(4);
  });

  test('sol al Sur (az=180) → sombra de rect al Norte (y menor)', () => {
    // Shadow direction = Norte = y decreases
    const poly = getShadowPolygon(rectEl, 45, 180);
    const centerY = 5;
    const shadowCenterY = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    expect(shadowCenterY).toBeLessThan(centerY);
  });

  test('sol al Este (az=90) → sombra de rect al Oeste (x menor)', () => {
    const poly = getShadowPolygon(rectEl, 45, 90);
    const centerX = 5;
    const shadowCenterX = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    expect(shadowCenterX).toBeLessThan(centerX);
  });

  test('elevación muy alta → sombra muy corta (cerca del elemento)', () => {
    const polyHigh = getShadowPolygon(rectEl, 80, 180);
    const polyLow = getShadowPolygon(rectEl, 20, 180);
    // Shadow length = elementHeight / tan(elevation)
    const highLen = polyHigh.reduce((max, p) => Math.max(max, Math.abs(p.y - rectEl.y)), 0);
    const lowLen = polyLow.reduce((max, p) => Math.max(max, Math.abs(p.y - rectEl.y)), 0);
    expect(highLen).toBeLessThan(lowLen);
  });

  test('elevation <= 0 → retorna array vacío (sin sombra)', () => {
    expect(getShadowPolygon(rectEl, 0, 180)).toHaveLength(0);
    expect(getShadowPolygon(rectEl, -5, 180)).toHaveLength(0);
  });
});
