import { describe, test, expect } from 'vitest';
import { exportProject, importProject, ProjectImportError, CURRENT_VERSION } from '../projectIO.js';

const sampleState = {
  points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
  finished: true,
  entrance: { edgeIndex: 0, position: 0.5, width: 3 },
  placedElements: [
    { id: 'el-1', definitionId: 'casa', shape: 'rectangle', x: 5, y: 5, width: 10, height: 8, rotation: 0 },
  ],
  solarConfig: { location: { latitude: 40.4, longitude: -3.7 }, displayOptions: {} },
  measurementConfig: { activeMeasurements: [], constraints: [] },
};

// ---------------------------------------------------------------------------
// exportProject
// ---------------------------------------------------------------------------
describe('exportProject', () => {
  test('produces valid JSON', () => {
    const json = exportProject(sampleState);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('contains current version', () => {
    const doc = JSON.parse(exportProject(sampleState));
    expect(doc.version).toBe(CURRENT_VERSION);
  });

  test('terrain section contains points, finished, entrance', () => {
    const doc = JSON.parse(exportProject(sampleState));
    expect(doc.terrain.points).toHaveLength(4);
    expect(doc.terrain.finished).toBe(true);
    expect(doc.terrain.entrance.edgeIndex).toBe(0);
  });

  test('elements are preserved', () => {
    const doc = JSON.parse(exportProject(sampleState));
    expect(doc.elements).toHaveLength(1);
    expect(doc.elements[0].id).toBe('el-1');
  });

  test('handles missing optional fields gracefully', () => {
    const json = exportProject({});
    const doc = JSON.parse(json);
    expect(doc.terrain.points).toEqual([]);
    expect(doc.terrain.finished).toBe(false);
    expect(doc.terrain.entrance).toBeNull();
    expect(doc.elements).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// importProject — valid files
// ---------------------------------------------------------------------------
describe('importProject — valid', () => {
  test('round-trip preserves all state', () => {
    const json = exportProject(sampleState);
    const result = importProject(json);
    expect(result.terrain.points).toHaveLength(4);
    expect(result.terrain.finished).toBe(true);
    expect(result.terrain.entrance.width).toBe(3);
    expect(result.elements[0].definitionId).toBe('casa');
    expect(result.solar.location.latitude).toBe(40.4);
  });

  test('missing optional keys default safely', () => {
    const minimal = JSON.stringify({ version: '2.0.0', terrain: { points: [], finished: false } });
    const result = importProject(minimal);
    expect(result.elements).toEqual([]);
    expect(result.solar).toBeNull();
    expect(result.measurements).toBeNull();
    expect(result.terrain.entrance).toBeNull();
  });

  test('v1 file without terrain wrapper still loads', () => {
    const v1 = JSON.stringify({
      version: '1.0.0',
      points: [{ x: 0, y: 0 }],
      finished: false,
      elements: [],
    });
    const result = importProject(v1);
    expect(result.terrain.points).toHaveLength(1);
    expect(result.terrain.entrance).toBeNull();
  });

  test('preserves unknown top-level keys in _extra', () => {
    const future = JSON.stringify({
      version: '2.0.0',
      terrain: { points: [] },
      elements: [],
      customField: 'hello',
    });
    const result = importProject(future);
    expect(result._extra.customField).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// importProject — error cases
// ---------------------------------------------------------------------------
describe('importProject — errors', () => {
  test('throws on invalid JSON', () => {
    expect(() => importProject('not json{')).toThrow(ProjectImportError);
  });

  test('throws on non-object JSON', () => {
    expect(() => importProject('"just a string"')).toThrow(ProjectImportError);
  });

  test('throws when file major version is higher than supported', () => {
    const futureFile = JSON.stringify({ version: '99.0.0', terrain: { points: [] }, elements: [] });
    expect(() => importProject(futureFile)).toThrow(ProjectImportError);
    expect(() => importProject(futureFile)).toThrow(/versión más reciente/);
  });

  test('does not throw when file major version equals current', () => {
    const json = exportProject(sampleState);
    expect(() => importProject(json)).not.toThrow();
  });
});
