import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import ShadowLayer from '../ShadowLayer.jsx';
import { defaultSolarConfig } from '../../utils/solarConfigUtils.js';

vi.mock('react-konva', () => ({
  Layer: ({ children }) => <div data-testid="konva-layer">{children}</div>,
  Line:  ({ points, ...props }) => <div data-testid="shadow-polygon" data-points={JSON.stringify(points)} {...props} />,
}));

// Solar noon in summer → sun is up → elevation > 0
const noonConfig = {
  ...defaultSolarConfig,
  dateTime: { year: 2024, month: 5, day: 21, hour: 12, minute: 17 },
  displayOptions: { ...defaultSolarConfig.displayOptions, showShadows: true },
};

const nightConfig = {
  ...noonConfig,
  dateTime: { ...noonConfig.dateTime, hour: 0 },
};

const elements = [
  { id: 'e1', x: 5, y: 5, width: 4, height: 2, shape: 'rectangle', elementHeight: 3, rotation: 0 },
  { id: 'e2', x: 10, y: 10, x: 10, y: 10, width: 4, height: 4, radius: 2, shape: 'circle', elementHeight: 5, rotation: 0 },
];

describe('ShadowLayer', () => {
  test('con showShadows=false no renderiza nada', () => {
    const config = { ...noonConfig, displayOptions: { ...noonConfig.displayOptions, showShadows: false } };
    const { queryAllByTestId } = render(
      <ShadowLayer elements={elements} solarConfig={config} scale={1} position={{ x: 0, y: 0 }} baseScale={10} />
    );
    expect(queryAllByTestId('shadow-polygon').length).toBe(0);
  });

  test('con showShadows=true y elementos renderiza polígonos de sombra', () => {
    const { getAllByTestId } = render(
      <ShadowLayer elements={elements} solarConfig={noonConfig} scale={1} position={{ x: 0, y: 0 }} baseScale={10} />
    );
    expect(getAllByTestId('shadow-polygon').length).toBeGreaterThan(0);
  });

  test('número de polígonos ≤ número de elementos', () => {
    const { getAllByTestId } = render(
      <ShadowLayer elements={elements} solarConfig={noonConfig} scale={1} position={{ x: 0, y: 0 }} baseScale={10} />
    );
    expect(getAllByTestId('shadow-polygon').length).toBeLessThanOrEqual(elements.length);
  });

  test('con sol bajo el horizonte (noche) no renderiza sombras', () => {
    const { queryAllByTestId } = render(
      <ShadowLayer elements={elements} solarConfig={nightConfig} scale={1} position={{ x: 0, y: 0 }} baseScale={10} />
    );
    expect(queryAllByTestId('shadow-polygon').length).toBe(0);
  });

  test('sombras tienen opacidad < 1 (semitransparente)', () => {
    const { getAllByTestId } = render(
      <ShadowLayer elements={elements} solarConfig={noonConfig} scale={1} position={{ x: 0, y: 0 }} baseScale={10} />
    );
    const polygons = getAllByTestId('shadow-polygon');
    polygons.forEach(p => {
      const opacity = parseFloat(p.getAttribute('data-opacity') || p.getAttribute('opacity') || '1');
      expect(opacity).toBeLessThan(1);
    });
  });

  test('sin elementos no renderiza polígonos', () => {
    const { queryAllByTestId } = render(
      <ShadowLayer elements={[]} solarConfig={noonConfig} scale={1} position={{ x: 0, y: 0 }} baseScale={10} />
    );
    expect(queryAllByTestId('shadow-polygon').length).toBe(0);
  });
});
