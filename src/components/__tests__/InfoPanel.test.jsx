import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import InfoPanel from '../InfoPanel';

describe('InfoPanel', () => {
  const createWrapper = (props = {}) => {
    const defaults = {
      points: [],
      finished: false,
      area: 0,
      perimeter: 0,
      baseScale: 10,
    };
    return render(<InfoPanel {...defaults} {...props} />);
  };

  test('renders area formatted as "X.X m²"', () => {
    const { getByText } = createWrapper({ area: 150.5 });
    expect(getByText(/150\.5 m²/)).toBeInTheDocument();
  });

  test('renders perimeter formatted as "X.X m"', () => {
    const { getByText } = createWrapper({ perimeter: 50.3 });
    expect(getByText(/50\.3 m/)).toBeInTheDocument();
  });

  test('shows "0.0 m²" when no points', () => {
    const { getByText } = createWrapper({ area: 0 });
    expect(getByText(/0\.0 m²/)).toBeInTheDocument();
  });

  test('shows "0.0 m" when no points', () => {
    const { container } = createWrapper({ perimeter: 0 });
    expect(container.textContent).toMatch(/0\.0 m[^²]/);
  });

  test('shows list of vertex coordinates in meters divided by baseScale', () => {
    const { getByText } = createWrapper({
      points: [{ x: 100, y: 200 }, { x: 300, y: 400 }],
      baseScale: 10,
    });
    expect(getByText(/10\.0/)).toBeInTheDocument();
    expect(getByText(/20\.0/)).toBeInTheDocument();
  });

  test('shows "Polígono abierto" when not finished', () => {
    const { getByText } = createWrapper({ finished: false });
    expect(getByText('Polígono abierto')).toBeInTheDocument();
  });

  test('shows "Polígono cerrado" when finished', () => {
    const { getByText } = createWrapper({ finished: true });
    expect(getByText('Polígono cerrado')).toBeInTheDocument();
  });
});
