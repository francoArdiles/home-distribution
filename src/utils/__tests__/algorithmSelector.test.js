import { describe, test, expect } from 'vitest';
import { selectAlgorithm } from '../algorithmSelector.js';

const mkEl = (id, locked = false) => ({ id, locked });
const mkCon = (id, enabled = true) => ({ id, enabled });

describe('selectAlgorithm', () => {
  test('no constraints -> sa', () => {
    expect(selectAlgorithm({ elements: [mkEl('a')], constraints: [] })).toBe('sa');
  });

  test('disabled constraints count as zero', () => {
    expect(selectAlgorithm({
      elements: [mkEl('a')],
      constraints: [mkCon('c1', false), mkCon('c2', false)],
    })).toBe('sa');
  });

  test('small problem with constraints -> sa', () => {
    const elements = Array.from({ length: 10 }, (_, i) => mkEl(`e${i}`));
    expect(selectAlgorithm({ elements, constraints: [mkCon('c1')] })).toBe('sa');
  });

  test('large problem with constraints and memetic available -> memetic', () => {
    const elements = Array.from({ length: 40 }, (_, i) => mkEl(`e${i}`));
    expect(selectAlgorithm({
      elements, constraints: [mkCon('c1')],
      available: { sa: true, ga: true, memetic: true },
    })).toBe('memetic');
  });

  test('large problem without memetic -> sa', () => {
    const elements = Array.from({ length: 40 }, (_, i) => mkEl(`e${i}`));
    expect(selectAlgorithm({ elements, constraints: [mkCon('c1')] })).toBe('sa');
  });

  test('locked elements do not count toward movable size', () => {
    const elements = [
      ...Array.from({ length: 35 }, (_, i) => mkEl(`l${i}`, true)),
      ...Array.from({ length: 5 }, (_, i) => mkEl(`m${i}`)),
    ];
    expect(selectAlgorithm({
      elements, constraints: [mkCon('c1')],
      available: { memetic: true },
    })).toBe('sa');
  });
});
