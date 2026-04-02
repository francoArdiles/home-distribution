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
// paths — export / import
// ---------------------------------------------------------------------------
describe('paths — export / import', () => {
  const samplePath = {
    id: 'path_1',
    points: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 3 }],
    width: 1.5,
    label: 'Camino principal',
    finished: true,
    color: '#D4A96A',
    borderColor: '#8B6914',
  };

  test('exportProject includes paths array', () => {
    const doc = JSON.parse(exportProject({ ...sampleState, paths: [samplePath] }));
    expect(Array.isArray(doc.paths)).toBe(true);
    expect(doc.paths).toHaveLength(1);
    expect(doc.paths[0].id).toBe('path_1');
  });

  test('exportProject uses empty array when paths is omitted', () => {
    const doc = JSON.parse(exportProject(sampleState));
    expect(doc.paths).toEqual([]);
  });

  test('importProject restores paths from file', () => {
    const json = exportProject({ ...sampleState, paths: [samplePath] });
    const result = importProject(json);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0].width).toBe(1.5);
    expect(result.paths[0].finished).toBe(true);
  });

  test('importProject returns empty paths array for old files without paths key', () => {
    const oldFile = JSON.stringify({ version: '2.0.0', terrain: { points: [], finished: false }, elements: [] });
    const result = importProject(oldFile);
    expect(result.paths).toEqual([]);
  });

  test('round-trip preserves all path fields', () => {
    const json = exportProject({ ...sampleState, paths: [samplePath] });
    const result = importProject(json);
    const p = result.paths[0];
    expect(p.points).toHaveLength(3);
    expect(p.label).toBe('Camino principal');
    expect(p.color).toBe('#D4A96A');
  });
});

// ---------------------------------------------------------------------------
// detail — export / import (Phase 6 Unit 2)
// ---------------------------------------------------------------------------
describe('detail — export / import', () => {
  const elementWithDetail = {
    id: 'el-pool',
    definitionId: 'piscina',
    shape: 'rectangle',
    x: 10, y: 10, width: 8, height: 4, rotation: 0,
    detail: {
      _schema: 'piscina@1',
      depth: 2.0,
      steps: [{ width: 0.8, depth: 0.3 }],
      lining: 'azulejo',
      heated: true,
    },
  };

  test('exportProject serializes detail when present', () => {
    const doc = JSON.parse(exportProject({ ...sampleState, placedElements: [elementWithDetail] }));
    expect(doc.elements[0].detail).toBeDefined();
    expect(doc.elements[0].detail._schema).toBe('piscina@1');
    expect(doc.elements[0].detail.depth).toBe(2.0);
    expect(doc.elements[0].detail.lining).toBe('azulejo');
  });

  test('round-trip preserves full detail object', () => {
    const json = exportProject({ ...sampleState, placedElements: [elementWithDetail] });
    const result = importProject(json);
    const el = result.elements[0];
    expect(el.detail._schema).toBe('piscina@1');
    expect(el.detail.steps).toHaveLength(1);
    expect(el.detail.steps[0].width).toBe(0.8);
    expect(el.detail.heated).toBe(true);
  });

  test('importProject returns null detail for elements without detail', () => {
    const json = exportProject(sampleState);
    const result = importProject(json);
    expect(result.elements[0].detail ?? null).toBeNull();
  });

  test('old file elements without detail field load without error', () => {
    const oldFile = JSON.stringify({
      version: '2.0.0',
      terrain: { points: [], finished: false },
      elements: [{ id: 'old-el', definitionId: 'casa', shape: 'rectangle', x: 0, y: 0 }],
    });
    const result = importProject(oldFile);
    expect(result.elements[0].detail ?? null).toBeNull();
    expect(result.elements[0].definitionId).toBe('casa');
  });

  test('element with unknown schema is preserved as-is on round-trip', () => {
    const futureElement = {
      id: 'el-future',
      definitionId: 'futuristic_element',
      shape: 'rectangle',
      x: 0, y: 0, width: 5, height: 5, rotation: 0,
      detail: { _schema: 'futuristic_element@3', someNewField: 42 },
    };
    const json = exportProject({ ...sampleState, placedElements: [futureElement] });
    const result = importProject(json);
    expect(result.elements[0].detail._schema).toBe('futuristic_element@3');
    expect(result.elements[0].detail.someNewField).toBe(42);
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
