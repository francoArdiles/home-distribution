import { describe, test, expect } from 'vitest';
import { elementDefinitions, getElementDefinition, getElementsByCategory } from '../elementDefinitions.js';
import { categories } from '../categories.js';

describe('elementDefinitions', () => {
  test('contains all 13 element types', () => {
    expect(elementDefinitions).toHaveLength(13);
    const ids = elementDefinitions.map(e => e.id);
    expect(ids).toContain('pozo');
    expect(ids).toContain('bodega');
    expect(ids).toContain('taller');
    expect(ids).toContain('estacionamiento');
    expect(ids).toContain('estanque');
  });

  test('each element has required fields', () => {
    const requiredFields = ['id', 'name', 'shape', 'defaultWidth', 'defaultHeight', 'color', 'borderColor', 'borderWidth', 'properties'];
    elementDefinitions.forEach(el => {
      requiredFields.forEach(field => {
        expect(el).toHaveProperty(field);
      });
    });
  });

  test('circle type (arbol_frutal) has defaultRadius', () => {
    const arbol = elementDefinitions.find(e => e.id === 'arbol_frutal');
    expect(arbol.shape).toBe('circle');
    expect(arbol.defaultRadius).toBe(2);
  });

  test('properties have sunNeeds, waterNeeds, minSpacing', () => {
    elementDefinitions.forEach(el => {
      expect(el.properties).toHaveProperty('sunNeeds');
      expect(el.properties).toHaveProperty('waterNeeds');
      expect(el.properties).toHaveProperty('minSpacing');
    });
  });

  test('getElementDefinition returns correct definition', () => {
    const casa = getElementDefinition('casa');
    expect(casa.id).toBe('casa');
    expect(casa.name).toBe('Casa');
  });

  test('getElementDefinition returns undefined for nonexistent', () => {
    expect(getElementDefinition('nonexistent')).toBeUndefined();
  });

  test('each element has a category field', () => {
    elementDefinitions.forEach(el => {
      expect(el).toHaveProperty('category');
    });
  });

  test('each element category is a valid category id', () => {
    const categoryIds = categories.map(c => c.id);
    elementDefinitions.forEach(el => {
      expect(categoryIds).toContain(el.category);
    });
  });

  test('getElementsByCategory returns elements for hogar', () => {
    const hogarElements = getElementsByCategory('hogar');
    expect(hogarElements).toHaveLength(4);
    const ids = hogarElements.map(e => e.id);
    expect(ids).toContain('casa');
    expect(ids).toContain('bodega');
    expect(ids).toContain('taller');
    expect(ids).toContain('estacionamiento');
  });

  test('getElementsByCategory returns elements for jardin', () => {
    const jardinElements = getElementsByCategory('jardin');
    const ids = jardinElements.map(e => e.id);
    expect(ids).toContain('piscina');
    expect(ids).toContain('huerto');
    expect(ids).toContain('recreacion');
    expect(ids).toContain('sendero');
    expect(ids).toContain('estanque');
  });

  test('getElementsByCategory returns elements for animales', () => {
    const animalesElements = getElementsByCategory('animales');
    expect(animalesElements).toHaveLength(1);
    expect(animalesElements[0].id).toBe('gallinero');
  });

  test('getElementsByCategory returns elements for sostenibilidad', () => {
    const sostenibilidadElements = getElementsByCategory('sostenibilidad');
    const ids = sostenibilidadElements.map(e => e.id);
    expect(ids).toContain('arbol_frutal');
    expect(ids).toContain('compost');
    expect(ids).toContain('pozo');
  });

  test('getElementsByCategory returns empty array for invalid category', () => {
    expect(getElementsByCategory('invalid')).toEqual([]);
  });
});
