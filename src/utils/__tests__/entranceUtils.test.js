import { describe, test, expect } from 'vitest';
import {
  getEdgeLengthMeters,
  entranceToT,
  getEntranceGapPoints,
  clampEntrancePosition,
  projectPointOnEdge,
} from '../entranceUtils.js';

describe('getEdgeLengthMeters', () => {
  test('horizontal edge 10px at baseScale=10 → 1m', () => {
    expect(getEdgeLengthMeters({ x: 0, y: 0 }, { x: 10, y: 0 }, 10)).toBeCloseTo(1);
  });
  test('3-4-5 triangle: 30×40px → 50px → 5m at baseScale=10', () => {
    expect(getEdgeLengthMeters({ x: 0, y: 0 }, { x: 30, y: 40 }, 10)).toBeCloseTo(5);
  });
  test('vertical edge 20px at baseScale=10 → 2m', () => {
    expect(getEdgeLengthMeters({ x: 5, y: 0 }, { x: 5, y: 20 }, 10)).toBeCloseTo(2);
  });
});

describe('entranceToT', () => {
  test('centered 2m on 10m edge', () => {
    const { t1, t2 } = entranceToT(0.5, 2, 10);
    expect(t1).toBeCloseTo(0.4);
    expect(t2).toBeCloseTo(0.6);
  });
  test('position near start gets clamped at t1=0', () => {
    const { t1, t2 } = entranceToT(0.1, 4, 10); // halfT=0.2, t1=max(0,−0.1)=0
    expect(t1).toBeCloseTo(0);
    expect(t2).toBeCloseTo(0.3); // 0.1+0.2
  });
  test('position near end gets clamped at t2=1', () => {
    const { t1, t2 } = entranceToT(0.9, 4, 10); // halfT=0.2, t2=min(1,1.1)=1
    expect(t1).toBeCloseTo(0.7);
    expect(t2).toBeCloseTo(1);
  });
  test('width wider than edge gets fully clamped', () => {
    const { t1, t2 } = entranceToT(0.5, 20, 10); // halfT=1 → t1=0, t2=1
    expect(t1).toBeCloseTo(0);
    expect(t2).toBeCloseTo(1);
  });
});

describe('getEntranceGapPoints', () => {
  test('horizontal edge gap at center', () => {
    const { gapStart, gapEnd, center } = getEntranceGapPoints(
      { x: 0, y: 0 }, { x: 100, y: 0 }, 0.4, 0.6
    );
    expect(gapStart.x).toBeCloseTo(40);
    expect(gapStart.y).toBeCloseTo(0);
    expect(gapEnd.x).toBeCloseTo(60);
    expect(gapEnd.y).toBeCloseTo(0);
    expect(center.x).toBeCloseTo(50);
    expect(center.y).toBeCloseTo(0);
  });
  test('diagonal edge', () => {
    // p1=(0,0) p2=(10,10), t1=0.25, t2=0.75 → gapStart=(2.5,2.5), gapEnd=(7.5,7.5)
    const { gapStart, gapEnd } = getEntranceGapPoints(
      { x: 0, y: 0 }, { x: 10, y: 10 }, 0.25, 0.75
    );
    expect(gapStart.x).toBeCloseTo(2.5);
    expect(gapStart.y).toBeCloseTo(2.5);
    expect(gapEnd.x).toBeCloseTo(7.5);
    expect(gapEnd.y).toBeCloseTo(7.5);
  });
});

describe('clampEntrancePosition', () => {
  test('centered position is unchanged', () => {
    expect(clampEntrancePosition(0.5, 2, 10)).toBeCloseTo(0.5);
  });
  test('position=0 with 2m on 10m edge clamped to halfT=0.1', () => {
    expect(clampEntrancePosition(0, 2, 10)).toBeCloseTo(0.1);
  });
  test('position=1 with 2m on 10m edge clamped to 0.9', () => {
    expect(clampEntrancePosition(1, 2, 10)).toBeCloseTo(0.9);
  });
  test('edgeLengthM=0 returns 0.5', () => {
    expect(clampEntrancePosition(0.5, 2, 0)).toBeCloseTo(0.5);
  });
});

describe('projectPointOnEdge', () => {
  test('point at midpoint of horizontal edge → t=0.5', () => {
    expect(projectPointOnEdge(5, 0, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0.5);
  });
  test('point past end → t=1', () => {
    expect(projectPointOnEdge(15, 0, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(1);
  });
  test('point before start → t=0', () => {
    expect(projectPointOnEdge(-5, 0, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
  });
  test('perpendicular point projects to nearest point on edge', () => {
    expect(projectPointOnEdge(5, 99, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0.5);
  });
  test('zero-length edge returns 0', () => {
    expect(projectPointOnEdge(5, 5, { x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0);
  });
});
