import { describe, test, expect } from 'vitest';
import { categories } from '../categories.js';

describe('categories', () => {
  test('exists and is an array', () => {
    expect(categories).toBeDefined();
    expect(Array.isArray(categories)).toBe(true);
  });

  test('has 4 categories', () => {
    expect(categories).toHaveLength(4);
  });

  test('contains expected category ids', () => {
    const ids = categories.map(c => c.id);
    expect(ids).toContain('hogar');
    expect(ids).toContain('jardin');
    expect(ids).toContain('animales');
    expect(ids).toContain('sostenibilidad');
  });

  test('each category has required fields: id, name, icon, color', () => {
    const requiredFields = ['id', 'name', 'icon', 'color'];
    categories.forEach(cat => {
      requiredFields.forEach(field => {
        expect(cat).toHaveProperty(field);
      });
    });
  });

  test('each category has non-empty string values', () => {
    categories.forEach(cat => {
      expect(typeof cat.id).toBe('string');
      expect(cat.id.length).toBeGreaterThan(0);
      expect(typeof cat.name).toBe('string');
      expect(cat.name.length).toBeGreaterThan(0);
      expect(typeof cat.icon).toBe('string');
      expect(cat.icon.length).toBeGreaterThan(0);
      expect(typeof cat.color).toBe('string');
      expect(cat.color.length).toBeGreaterThan(0);
    });
  });

  test('ids are unique', () => {
    const ids = categories.map(c => c.id);
    const uniqueIds = [...new Set(ids)];
    expect(uniqueIds).toHaveLength(ids.length);
  });
});