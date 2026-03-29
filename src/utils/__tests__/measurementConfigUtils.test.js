import { describe, test, expect } from 'vitest';
import {
  defaultMeasurementConfig,
  addMeasurement,
  removeMeasurement,
  clearMeasurements,
  setActiveTool,
  addConstraint,
  removeConstraint,
  toggleConstraint,
} from '../measurementConfigUtils.js';

describe('defaultMeasurementConfig', () => {
  test('has expected shape', () => {
    expect(defaultMeasurementConfig.activeTool).toBe('none');
    expect(defaultMeasurementConfig.showMeasurements).toBe(true);
    expect(defaultMeasurementConfig.showConstraints).toBe(true);
    expect(Array.isArray(defaultMeasurementConfig.activeMeasurements)).toBe(true);
    expect(Array.isArray(defaultMeasurementConfig.constraints)).toBe(true);
  });
});

describe('addMeasurement', () => {
  test('adds a measurement and does not mutate original', () => {
    const config = { ...defaultMeasurementConfig };
    const m = { id: 'm1', type: 'distance', value: 5 };
    const result = addMeasurement(config, m);
    expect(result.activeMeasurements).toHaveLength(1);
    expect(result.activeMeasurements[0]).toBe(m);
    expect(config.activeMeasurements).toHaveLength(0);
  });

  test('returns a new object', () => {
    const config = { ...defaultMeasurementConfig };
    const result = addMeasurement(config, { id: 'm1' });
    expect(result).not.toBe(config);
  });
});

describe('removeMeasurement', () => {
  test('removes measurement by id', () => {
    const config = { ...defaultMeasurementConfig, activeMeasurements: [{ id: 'm1' }, { id: 'm2' }] };
    const result = removeMeasurement(config, 'm1');
    expect(result.activeMeasurements).toHaveLength(1);
    expect(result.activeMeasurements[0].id).toBe('m2');
  });

  test('does not mutate original', () => {
    const config = { ...defaultMeasurementConfig, activeMeasurements: [{ id: 'm1' }] };
    removeMeasurement(config, 'm1');
    expect(config.activeMeasurements).toHaveLength(1);
  });
});

describe('clearMeasurements', () => {
  test('empties activeMeasurements', () => {
    const config = { ...defaultMeasurementConfig, activeMeasurements: [{ id: 'm1' }, { id: 'm2' }] };
    const result = clearMeasurements(config);
    expect(result.activeMeasurements).toHaveLength(0);
  });

  test('does not mutate original', () => {
    const config = { ...defaultMeasurementConfig, activeMeasurements: [{ id: 'm1' }] };
    clearMeasurements(config);
    expect(config.activeMeasurements).toHaveLength(1);
  });
});

describe('setActiveTool', () => {
  test('changes activeTool', () => {
    const config = { ...defaultMeasurementConfig };
    const result = setActiveTool(config, 'distance');
    expect(result.activeTool).toBe('distance');
  });

  test('only changes activeTool, not other fields', () => {
    const config = { ...defaultMeasurementConfig, showMeasurements: false };
    const result = setActiveTool(config, 'area');
    expect(result.showMeasurements).toBe(false);
    expect(result.activeTool).toBe('area');
  });

  test('returns new object', () => {
    const config = { ...defaultMeasurementConfig };
    expect(setActiveTool(config, 'none')).not.toBe(config);
  });
});

describe('addConstraint', () => {
  test('adds constraint', () => {
    const config = { ...defaultMeasurementConfig };
    const c = { id: 'c1', value: 3 };
    const result = addConstraint(config, c);
    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0]).toBe(c);
    expect(config.constraints).toHaveLength(0);
  });
});

describe('removeConstraint', () => {
  test('removes constraint by id', () => {
    const config = { ...defaultMeasurementConfig, constraints: [{ id: 'c1' }, { id: 'c2' }] };
    const result = removeConstraint(config, 'c1');
    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0].id).toBe('c2');
  });
});

describe('toggleConstraint', () => {
  test('toggles enabled field', () => {
    const config = {
      ...defaultMeasurementConfig,
      constraints: [{ id: 'c1', enabled: true }, { id: 'c2', enabled: false }],
    };
    const result = toggleConstraint(config, 'c1');
    expect(result.constraints[0].enabled).toBe(false);
    expect(result.constraints[1].enabled).toBe(false);
  });

  test('does not mutate original', () => {
    const config = {
      ...defaultMeasurementConfig,
      constraints: [{ id: 'c1', enabled: true }],
    };
    toggleConstraint(config, 'c1');
    expect(config.constraints[0].enabled).toBe(true);
  });
});
