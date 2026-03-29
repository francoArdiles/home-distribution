import { describe, test, expect } from 'vitest';
import { removeElement, duplicateElement } from '../elementUtils.js';

const el1 = { id: 'a', x: 5, y: 5, width: 3, height: 2, rotation: 0, label: 'Casa', isSelected: false };
const el2 = { id: 'b', x: 10, y: 10, width: 2, height: 2, rotation: 0, label: 'Huerto', isSelected: false };

describe('removeElement', () => {
  test('removes element by id', () => {
    const result = removeElement([el1, el2], 'a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });
  test('returns same array if id not found', () => {
    const result = removeElement([el1, el2], 'z');
    expect(result).toHaveLength(2);
  });
  test('returns empty array when removing last element', () => {
    expect(removeElement([el1], 'a')).toHaveLength(0);
  });
});

describe('duplicateElement', () => {
  test('creates element with different id', () => {
    const dup = duplicateElement(el1, 1, 1);
    expect(dup.id).not.toBe(el1.id);
  });
  test('applies offset to position', () => {
    const dup = duplicateElement(el1, 2, 3);
    expect(dup.x).toBe(el1.x + 2);
    expect(dup.y).toBe(el1.y + 3);
  });
  test('preserves all other fields', () => {
    const dup = duplicateElement(el1, 1, 1);
    expect(dup.width).toBe(el1.width);
    expect(dup.height).toBe(el1.height);
    expect(dup.label).toBe(el1.label);
    expect(dup.rotation).toBe(el1.rotation);
    expect(dup.isSelected).toBe(false);
  });
});
