import { describe, test, expect } from 'vitest';
import {
  getDetailSchema,
  createDefaultDetail,
  validateDetail,
} from '../../utils/detailUtils.js';

describe('getDetailSchema', () => {
  test('returns schema for piscina', () => {
    const schema = getDetailSchema('piscina');
    expect(schema).not.toBeNull();
    expect(schema._schema).toBe('piscina');
    expect(schema.version).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(schema.fields)).toBe(true);
  });

  test('returns schema for casa', () => {
    const schema = getDetailSchema('casa');
    expect(schema).not.toBeNull();
    expect(schema._schema).toBe('casa');
  });

  test('returns schema for huerto', () => {
    const schema = getDetailSchema('huerto');
    expect(schema).not.toBeNull();
    expect(schema._schema).toBe('huerto');
  });

  test('returns null for element without schema', () => {
    expect(getDetailSchema('sendero')).toBeNull();
    expect(getDetailSchema('compost')).toBeNull();
    expect(getDetailSchema('unknown_type')).toBeNull();
  });
});

describe('createDefaultDetail', () => {
  test('creates detail with correct _schema for piscina', () => {
    const detail = createDefaultDetail('piscina');
    expect(detail._schema).toBe('piscina@1');
  });

  test('creates detail with default values for piscina', () => {
    const detail = createDefaultDetail('piscina');
    expect(typeof detail.depth).toBe('number');
    expect(Array.isArray(detail.steps)).toBe(true);
    expect(typeof detail.lining).toBe('string');
  });

  test('creates detail with default values for casa', () => {
    const detail = createDefaultDetail('casa');
    expect(detail._schema).toBe('casa@2');
    expect(typeof detail.floors).toBe('number');
  });

  test('creates detail with default values for huerto', () => {
    const detail = createDefaultDetail('huerto');
    expect(detail._schema).toBe('huerto@1');
    expect(typeof detail.cropType).toBe('string');
  });

  test('returns null for element without schema', () => {
    expect(createDefaultDetail('sendero')).toBeNull();
    expect(createDefaultDetail('unknown')).toBeNull();
  });
});

describe('validateDetail', () => {
  test('returns empty array for valid piscina detail', () => {
    const detail = createDefaultDetail('piscina');
    const schema = getDetailSchema('piscina');
    expect(validateDetail(detail, schema)).toEqual([]);
  });

  test('returns error when required number is out of min range', () => {
    const schema = getDetailSchema('piscina');
    const detail = { ...createDefaultDetail('piscina'), depth: -1 };
    const errors = validateDetail(detail, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('depth');
  });

  test('returns error when required number is out of max range', () => {
    const schema = getDetailSchema('piscina');
    const detail = { ...createDefaultDetail('piscina'), depth: 999 };
    const errors = validateDetail(detail, schema);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('returns error for invalid select option', () => {
    const schema = getDetailSchema('piscina');
    const detail = { ...createDefaultDetail('piscina'), lining: 'madera_inexistente' };
    const errors = validateDetail(detail, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('lining');
  });

  test('returns empty array for valid casa detail', () => {
    const detail = createDefaultDetail('casa');
    const schema = getDetailSchema('casa');
    expect(validateDetail(detail, schema)).toEqual([]);
  });

  test('returns empty array for valid huerto detail', () => {
    const detail = createDefaultDetail('huerto');
    const schema = getDetailSchema('huerto');
    expect(validateDetail(detail, schema)).toEqual([]);
  });

  test('returns no errors when list is empty array', () => {
    const schema = getDetailSchema('piscina');
    const detail = { ...createDefaultDetail('piscina'), steps: [] };
    expect(validateDetail(detail, schema)).toEqual([]);
  });
});
