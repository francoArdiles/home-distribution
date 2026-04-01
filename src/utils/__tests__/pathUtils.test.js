import { describe, test, expect } from 'vitest';
import {
  createPath,
  addPointToPath,
  finishPath,
  pathSegmentLengths,
  pathTotalLength,
  isPathValid,
} from '../pathUtils.js';

describe('pathUtils — createPath', () => {
  test('creates a path with an initial point and default width', () => {
    const p = createPath({ x: 0, y: 0 });
    expect(p.points).toEqual([{ x: 0, y: 0 }]);
    expect(p.width).toBe(1);
    expect(p.finished).toBe(false);
  });

  test('creates a path with a custom width', () => {
    const p = createPath({ x: 1, y: 2 }, 2.5);
    expect(p.width).toBe(2.5);
  });

  test('assigns a unique id', () => {
    const a = createPath({ x: 0, y: 0 });
    const b = createPath({ x: 0, y: 0 });
    expect(a.id).toBeDefined();
    expect(b.id).toBeDefined();
    expect(a.id).not.toBe(b.id);
  });

  test('sets label to "Camino" by default', () => {
    const p = createPath({ x: 0, y: 0 });
    expect(p.label).toBe('Camino');
  });

  test('accepts an optional label', () => {
    const p = createPath({ x: 0, y: 0 }, 1, 'Sendero principal');
    expect(p.label).toBe('Sendero principal');
  });
});

describe('pathUtils — addPointToPath', () => {
  test('appends a new point to an unfinished path', () => {
    const p = createPath({ x: 0, y: 0 });
    const p2 = addPointToPath(p, { x: 3, y: 4 });
    expect(p2.points).toHaveLength(2);
    expect(p2.points[1]).toEqual({ x: 3, y: 4 });
  });

  test('does not mutate the original path', () => {
    const p = createPath({ x: 0, y: 0 });
    addPointToPath(p, { x: 1, y: 1 });
    expect(p.points).toHaveLength(1);
  });

  test('does not add point to a finished path', () => {
    const p = finishPath(createPath({ x: 0, y: 0 }));
    const p2 = addPointToPath(p, { x: 5, y: 5 });
    expect(p2.points).toHaveLength(1);
  });
});

describe('pathUtils — finishPath', () => {
  test('marks the path as finished', () => {
    const p = createPath({ x: 0, y: 0 });
    const finished = finishPath(p);
    expect(finished.finished).toBe(true);
  });

  test('does not mutate original path', () => {
    const p = createPath({ x: 0, y: 0 });
    finishPath(p);
    expect(p.finished).toBe(false);
  });
});

describe('pathUtils — pathSegmentLengths', () => {
  test('returns empty array for a path with a single point', () => {
    const p = createPath({ x: 0, y: 0 });
    expect(pathSegmentLengths(p)).toEqual([]);
  });

  test('returns one segment length for a two-point path', () => {
    const p = addPointToPath(createPath({ x: 0, y: 0 }), { x: 3, y: 4 });
    expect(pathSegmentLengths(p)).toHaveLength(1);
    expect(pathSegmentLengths(p)[0]).toBeCloseTo(5, 5);
  });

  test('returns multiple segment lengths', () => {
    let p = createPath({ x: 0, y: 0 });
    p = addPointToPath(p, { x: 3, y: 0 }); // 3m
    p = addPointToPath(p, { x: 3, y: 4 }); // 4m
    const segs = pathSegmentLengths(p);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toBeCloseTo(3, 5);
    expect(segs[1]).toBeCloseTo(4, 5);
  });
});

describe('pathUtils — pathTotalLength', () => {
  test('returns 0 for a single-point path', () => {
    expect(pathTotalLength(createPath({ x: 0, y: 0 }))).toBe(0);
  });

  test('sums all segment lengths', () => {
    let p = createPath({ x: 0, y: 0 });
    p = addPointToPath(p, { x: 3, y: 0 });
    p = addPointToPath(p, { x: 3, y: 4 });
    expect(pathTotalLength(p)).toBeCloseTo(7, 5);
  });
});

describe('pathUtils — isPathValid', () => {
  test('a single-point unfinished path is not valid', () => {
    expect(isPathValid(createPath({ x: 0, y: 0 }))).toBe(false);
  });

  test('a finished path with at least 2 points is valid', () => {
    let p = addPointToPath(createPath({ x: 0, y: 0 }), { x: 5, y: 0 });
    p = finishPath(p);
    expect(isPathValid(p)).toBe(true);
  });

  test('an unfinished path with 2+ points is not valid', () => {
    const p = addPointToPath(createPath({ x: 0, y: 0 }), { x: 5, y: 0 });
    expect(isPathValid(p)).toBe(false);
  });
});
