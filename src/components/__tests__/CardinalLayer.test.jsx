import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import CardinalLayer from '../CardinalLayer.jsx';

vi.mock('react-konva', () => ({
  Layer: ({ children }) => <div data-testid="konva-layer">{children}</div>,
  Text: ({ text, x, y, ...props }) => (
    <span data-testid="cardinal-label" data-x={x} data-y={y} data-text={text} {...props}>{text}</span>
  ),
}));

describe('CardinalLayer', () => {
  test('renderiza 4 etiquetas cardinales', () => {
    const { getAllByTestId } = render(<CardinalLayer width={800} height={600} northAtTop={true} />);
    expect(getAllByTestId('cardinal-label').length).toBe(4);
  });

  test('muestra N, S, E, O', () => {
    const { getAllByTestId } = render(<CardinalLayer width={800} height={600} northAtTop={true} />);
    const texts = getAllByTestId('cardinal-label').map(el => el.getAttribute('data-text'));
    expect(texts).toContain('N');
    expect(texts).toContain('S');
    expect(texts).toContain('E');
    expect(texts).toContain('O');
  });

  test('con northAtTop=true, N tiene y pequeño (cerca del tope)', () => {
    const { getAllByTestId } = render(<CardinalLayer width={800} height={600} northAtTop={true} />);
    const labels = getAllByTestId('cardinal-label');
    const n = labels.find(el => el.getAttribute('data-text') === 'N');
    const s = labels.find(el => el.getAttribute('data-text') === 'S');
    expect(Number(n.getAttribute('data-y'))).toBeLessThan(Number(s.getAttribute('data-y')));
  });

  test('con northAtTop=false, N tiene y mayor que S (N abajo)', () => {
    const { getAllByTestId } = render(<CardinalLayer width={800} height={600} northAtTop={false} />);
    const labels = getAllByTestId('cardinal-label');
    const n = labels.find(el => el.getAttribute('data-text') === 'N');
    const s = labels.find(el => el.getAttribute('data-text') === 'S');
    expect(Number(n.getAttribute('data-y'))).toBeGreaterThan(Number(s.getAttribute('data-y')));
  });

  test('E está a la derecha (x grande) y O a la izquierda (x pequeño)', () => {
    const { getAllByTestId } = render(<CardinalLayer width={800} height={600} northAtTop={true} />);
    const labels = getAllByTestId('cardinal-label');
    const e = labels.find(el => el.getAttribute('data-text') === 'E');
    const o = labels.find(el => el.getAttribute('data-text') === 'O');
    expect(Number(e.getAttribute('data-x'))).toBeGreaterThan(Number(o.getAttribute('data-x')));
  });
});
