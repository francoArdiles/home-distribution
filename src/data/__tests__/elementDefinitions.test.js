import { describe, test, expect } from 'vitest';
import { elementDefinitions, getElementDefinition } from '../elementDefinitions.js';

describe('elementDefinitions', () => {
  test('contains all 8 element types', () => {
    expect(elementDefinitions).toHaveLength(8);
    const ids = elementDefinitions.map(e => e.id);
    expect(ids).toEqual([
      'casa', 'piscina', 'huerto', 'gallinero',
      'arbol_frutal', 'compost', 'recreacion', 'sendero'
    ]);
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
});
