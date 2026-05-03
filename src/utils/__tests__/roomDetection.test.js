import { describe, test, expect } from 'vitest';
import { detectRooms, mergeRoomAssignments } from '../roomDetection.js';

const wall = (x1, y1, x2, y2) => ({ x1, y1, x2, y2, floor: 0 });

describe('detectRooms', () => {
  test('empty walls -> no rooms', () => {
    expect(detectRooms([], 0)).toEqual([]);
  });

  test('single wall -> no rooms', () => {
    expect(detectRooms([wall(0, 0, 5, 0)], 0)).toHaveLength(0);
  });

  test('square room -> one room', () => {
    const walls = [
      wall(0, 0, 4, 0),
      wall(4, 0, 4, 3),
      wall(4, 3, 0, 3),
      wall(0, 3, 0, 0),
    ];
    const rooms = detectRooms(walls, 0);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBeCloseTo(12, 0); // 4 * 3
    expect(rooms[0].polygon).toHaveLength(4);
  });

  test('square room centroid is at center', () => {
    const walls = [
      wall(0, 0, 4, 0),
      wall(4, 0, 4, 4),
      wall(4, 4, 0, 4),
      wall(0, 4, 0, 0),
    ];
    const [room] = detectRooms(walls, 0);
    expect(room.centroid.x).toBeCloseTo(2, 1);
    expect(room.centroid.y).toBeCloseTo(2, 1);
  });

  test('two adjacent rooms -> two rooms', () => {
    // Two rooms sharing a wall: [0,0]-[4,0]-[4,3]-[0,3] and [4,0]-[8,0]-[8,3]-[4,3]
    const walls = [
      wall(0, 0, 4, 0), wall(4, 0, 8, 0),
      wall(8, 0, 8, 3),
      wall(8, 3, 4, 3), wall(4, 3, 0, 3),
      wall(0, 3, 0, 0),
      wall(4, 0, 4, 3), // shared wall
    ];
    const rooms = detectRooms(walls, 0);
    expect(rooms).toHaveLength(2);
    const totalArea = rooms.reduce((s, r) => s + r.area, 0);
    expect(totalArea).toBeCloseTo(24, 0); // 4*3 + 4*3
  });

  test('walls on different floors filtered by floor', () => {
    const walls = [
      { ...wall(0, 0, 4, 0), floor: 0 },
      { ...wall(4, 0, 4, 4), floor: 0 },
      { ...wall(4, 4, 0, 4), floor: 0 },
      { ...wall(0, 4, 0, 0), floor: 0 },
      { ...wall(0, 0, 4, 0), floor: 1 }, // different floor
    ];
    const rooms0 = detectRooms(walls, 0);
    const rooms1 = detectRooms(walls, 1);
    expect(rooms0).toHaveLength(1);
    expect(rooms1).toHaveLength(0); // only 1 wall on floor 1, no room
  });

  test('L-shaped enclosed room', () => {
    const walls = [
      wall(0, 0, 6, 0),
      wall(6, 0, 6, 3),
      wall(6, 3, 3, 3),
      wall(3, 3, 3, 5),
      wall(3, 5, 0, 5),
      wall(0, 5, 0, 0),
    ];
    const rooms = detectRooms(walls, 0);
    expect(rooms).toHaveLength(1);
    // L-shape area: 6*3 + 3*2 = 24
    expect(rooms[0].area).toBeCloseTo(24, 0);
  });

  test('room id is stable for same polygon', () => {
    const walls = [
      wall(0, 0, 4, 0), wall(4, 0, 4, 4),
      wall(4, 4, 0, 4), wall(0, 4, 0, 0),
    ];
    const r1 = detectRooms(walls, 0);
    const r2 = detectRooms(walls, 0);
    expect(r1[0].id).toBe(r2[0].id);
  });
});

describe('mergeRoomAssignments', () => {
  test('matches stored assignment to nearest detected room', () => {
    const detected = [
      { id: 'r1', centroid: { x: 2, y: 2 }, polygon: [], area: 4 },
      { id: 'r2', centroid: { x: 7, y: 2 }, polygon: [], area: 4 },
    ];
    const stored = [
      { id: 's1', centroid: { x: 2.1, y: 1.9 }, type: 'bedroom', label: 'Dormitorio 1' },
    ];
    const merged = mergeRoomAssignments(detected, stored);
    expect(merged[0].type).toBe('bedroom');
    expect(merged[0].label).toBe('Dormitorio 1');
    expect(merged[1].type).toBeUndefined();
  });

  test('no match beyond maxDist -> type undefined', () => {
    const detected = [{ id: 'r1', centroid: { x: 2, y: 2 }, polygon: [], area: 4 }];
    const stored = [{ id: 's1', centroid: { x: 20, y: 20 }, type: 'bathroom', label: '' }];
    const merged = mergeRoomAssignments(detected, stored, 2);
    expect(merged[0].type).toBeUndefined();
  });
});
