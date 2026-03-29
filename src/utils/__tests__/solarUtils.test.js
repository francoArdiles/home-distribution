import { describe, test, expect } from 'vitest';
import {
  getSolarPosition,
  getSolarPathForDay,
  getSunrise,
  getSunset,
  azimuthToVector,
} from '../solarUtils.js';

// Tolerance for floating point comparisons
const DEG_TOL = 5; // degrees

describe('azimuthToVector', () => {
  test('0° (Norte) → {x:0, y:-1}', () => {
    const v = azimuthToVector(0);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(-1, 5);
  });
  test('90° (Este) → {x:1, y:0}', () => {
    const v = azimuthToVector(90);
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
  });
  test('180° (Sur) → {x:0, y:1}', () => {
    const v = azimuthToVector(180);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(1, 5);
  });
  test('270° (Oeste) → {x:-1, y:0}', () => {
    const v = azimuthToVector(270);
    expect(v.x).toBeCloseTo(-1, 5);
    expect(v.y).toBeCloseTo(0, 5);
  });
  test('resultado siempre es vector unitario', () => {
    [0, 45, 90, 135, 180, 225, 270, 315].forEach(deg => {
      const v = azimuthToVector(deg);
      const len = Math.sqrt(v.x * v.x + v.y * v.y);
      expect(len).toBeCloseTo(1, 5);
    });
  });
});

describe('getSolarPosition', () => {
  test('retorna azimuth y elevation como números', () => {
    const pos = getSolarPosition(new Date('2024-06-21T12:00:00Z'), 40.4, -3.7);
    expect(typeof pos.azimuth).toBe('number');
    expect(typeof pos.elevation).toBe('number');
  });

  test('azimuth está en rango [0, 360)', () => {
    const pos = getSolarPosition(new Date('2024-06-21T12:00:00Z'), 40.4, -3.7);
    expect(pos.azimuth).toBeGreaterThanOrEqual(0);
    expect(pos.azimuth).toBeLessThan(360);
  });

  test('mediodía en ecuador en equinoccio → elevación ≈ 90°', () => {
    // Solar noon at lon=0, lat=0, spring equinox
    const pos = getSolarPosition(new Date('2024-03-20T12:07:00Z'), 0, 0);
    expect(pos.elevation).toBeGreaterThan(85);
  });

  test('solsticio verano mediodía solar en Madrid → elevación > 65°', () => {
    // Solar noon for Madrid 2024-06-21 is 12:17 UTC
    const pos = getSolarPosition(new Date('2024-06-21T12:17:00Z'), 40.4, -3.7);
    expect(pos.elevation).toBeGreaterThan(65);
  });

  test('elevación negativa cuando el sol está bajo el horizonte (noche)', () => {
    const pos = getSolarPosition(new Date('2024-06-21T00:00:00Z'), 40.4, -3.7);
    expect(pos.elevation).toBeLessThan(0);
  });

  test('mediodía solar en hemisferio norte → azimuth ≈ 180° (Sur)', () => {
    // Solar noon for Madrid 2024-06-21 is 12:17 UTC
    const pos = getSolarPosition(new Date('2024-06-21T12:17:00Z'), 40.4, -3.7);
    expect(pos.azimuth).toBeGreaterThan(160);
    expect(pos.azimuth).toBeLessThan(200);
  });
});

describe('getSolarPathForDay', () => {
  test('retorna array de posiciones por hora', () => {
    const path = getSolarPathForDay(new Date('2024-06-21'), 40.4, -3.7);
    expect(Array.isArray(path)).toBe(true);
    expect(path.length).toBeGreaterThan(0);
  });

  test('cada entrada tiene hour, azimuth, elevation, aboveHorizon', () => {
    const path = getSolarPathForDay(new Date('2024-06-21'), 40.4, -3.7);
    path.forEach(entry => {
      expect(typeof entry.hour).toBe('number');
      expect(typeof entry.azimuth).toBe('number');
      expect(typeof entry.elevation).toBe('number');
      expect(typeof entry.aboveHorizon).toBe('boolean');
    });
  });

  test('aboveHorizon es true cuando elevation >= 0', () => {
    const path = getSolarPathForDay(new Date('2024-06-21'), 40.4, -3.7);
    path.forEach(entry => {
      expect(entry.aboveHorizon).toBe(entry.elevation >= 0);
    });
  });

  test('con intervalHours=1 retorna 24 entradas', () => {
    const path = getSolarPathForDay(new Date('2024-06-21'), 40.4, -3.7, 1);
    expect(path.length).toBe(24);
  });

  test('con intervalHours=2 retorna 12 entradas', () => {
    const path = getSolarPathForDay(new Date('2024-06-21'), 40.4, -3.7, 2);
    expect(path.length).toBe(12);
  });

  test('en latitud muy alta en solsticio de verano → todos aboveHorizon', () => {
    // North Pole area in summer has 24h sun
    const path = getSolarPathForDay(new Date('2024-06-21'), 70, 0, 1);
    const aboveCount = path.filter(e => e.aboveHorizon).length;
    expect(aboveCount).toBe(24);
  });
});

describe('getSunrise / getSunset', () => {
  test('getSunrise retorna {hour, minute} para latitud normal', () => {
    const sr = getSunrise(new Date('2024-06-21'), 40.4, -3.7);
    expect(sr).not.toBeNull();
    expect(typeof sr.hour).toBe('number');
    expect(typeof sr.minute).toBe('number');
    expect(sr.hour).toBeGreaterThanOrEqual(0);
    expect(sr.hour).toBeLessThan(24);
  });

  test('getSunset retorna {hour, minute} para latitud normal', () => {
    const ss = getSunset(new Date('2024-06-21'), 40.4, -3.7);
    expect(ss).not.toBeNull();
    expect(ss.hour).toBeGreaterThan(12);
  });

  test('getSunrise en verano ocurre antes que en invierno (Madrid)', () => {
    const srSummer = getSunrise(new Date('2024-06-21'), 40.4, -3.7);
    const srWinter = getSunrise(new Date('2024-12-21'), 40.4, -3.7);
    const summerMinutes = srSummer.hour * 60 + srSummer.minute;
    const winterMinutes = srWinter.hour * 60 + srWinter.minute;
    expect(summerMinutes).toBeLessThan(winterMinutes);
  });
});
