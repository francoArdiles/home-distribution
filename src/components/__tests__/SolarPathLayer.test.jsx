import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import SolarPathLayer from '../SolarPathLayer.jsx';
import { defaultSolarConfig } from '../../utils/solarConfigUtils.js';

vi.mock('react-konva', () => ({
  Layer:  ({ children }) => <div data-testid="konva-layer">{children}</div>,
  Circle: ({ x, y, ...props }) => <div data-testid="konva-circle" data-x={x} data-y={y} {...props} />,
  Line:   ({ points, ...props }) => <div data-testid="konva-line" data-points={JSON.stringify(points)} {...props} />,
}));

const baseProps = {
  solarConfig: defaultSolarConfig,
  width: 800,
  height: 600,
  scale: 1,
  position: { x: 0, y: 0 },
  baseScale: 10,
};

describe('SolarPathLayer', () => {
  test('renderiza la trayectoria solar (solar-path)', () => {
    const { getByTestId } = render(<SolarPathLayer {...baseProps} />);
    expect(getByTestId('solar-path')).toBeInTheDocument();
  });

  test('renderiza marcadores de hora para posiciones sobre el horizonte', () => {
    const { getAllByTestId } = render(<SolarPathLayer {...baseProps} />);
    const markers = getAllByTestId('solar-hour-marker');
    expect(markers.length).toBeGreaterThan(0);
  });

  test('renderiza marcador de posición actual del sol', () => {
    const { getByTestId } = render(<SolarPathLayer {...baseProps} />);
    expect(getByTestId('solar-current')).toBeInTheDocument();
  });

  test('con showSolarPath=false no renderiza la trayectoria', () => {
    const config = {
      ...defaultSolarConfig,
      displayOptions: { ...defaultSolarConfig.displayOptions, showSolarPath: false },
    };
    const { queryByTestId } = render(<SolarPathLayer {...baseProps} solarConfig={config} />);
    expect(queryByTestId('solar-path')).toBeNull();
  });

  test('con showCurrentSun=false no renderiza el marcador actual', () => {
    const config = {
      ...defaultSolarConfig,
      displayOptions: { ...defaultSolarConfig.displayOptions, showCurrentSun: false },
    };
    const { queryByTestId } = render(<SolarPathLayer {...baseProps} solarConfig={config} />);
    expect(queryByTestId('solar-current')).toBeNull();
  });

  test('con showSolarPath=false tampoco hay marcadores de hora', () => {
    const config = {
      ...defaultSolarConfig,
      displayOptions: { ...defaultSolarConfig.displayOptions, showSolarPath: false },
    };
    const { queryAllByTestId } = render(<SolarPathLayer {...baseProps} solarConfig={config} />);
    expect(queryAllByTestId('solar-hour-marker').length).toBe(0);
  });
});
