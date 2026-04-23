import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import SvgScaleBar from '../SvgScaleBar.jsx';

function wrap(el) {
  return render(<svg>{el}</svg>);
}

describe('SvgScaleBar — rendering', () => {
  test('renders container', () => {
    const { container } = wrap(<SvgScaleBar x={10} y={90} scaleM={14.4} lengthM={5} />);
    expect(container.querySelector('[data-testid="svg-scale-bar"]')).not.toBeNull();
  });

  test('renders main bar line', () => {
    const { container } = wrap(<SvgScaleBar x={10} y={90} scaleM={14.4} lengthM={5} />);
    expect(container.querySelector('[data-testid="svg-scale-bar-line"]')).not.toBeNull();
  });

  test('bar line length equals lengthM * scaleM px', () => {
    const { container } = wrap(<SvgScaleBar x={10} y={90} scaleM={14.4} lengthM={5} />);
    const line = container.querySelector('[data-testid="svg-scale-bar-line"]');
    const x1 = parseFloat(line.getAttribute('x1'));
    const x2 = parseFloat(line.getAttribute('x2'));
    expect(x2 - x1).toBeCloseTo(5 * 14.4, 1);
  });

  test('shows length label with unit', () => {
    const { container } = wrap(<SvgScaleBar x={10} y={90} scaleM={14.4} lengthM={5} />);
    const label = container.querySelector('[data-testid="svg-scale-bar-label"]');
    expect(label).not.toBeNull();
    expect(label.textContent).toMatch('5');
    expect(label.textContent).toMatch('m');
  });

  test('shows zero label', () => {
    const { container } = wrap(<SvgScaleBar x={10} y={90} scaleM={14.4} lengthM={5} />);
    expect(container.querySelector('[data-testid="svg-scale-bar-zero"]')).not.toBeNull();
  });

  test('adjusts bar length for different lengthM', () => {
    const { container } = wrap(<SvgScaleBar x={10} y={90} scaleM={14.4} lengthM={2} />);
    const line = container.querySelector('[data-testid="svg-scale-bar-line"]');
    const x1 = parseFloat(line.getAttribute('x1'));
    const x2 = parseFloat(line.getAttribute('x2'));
    expect(x2 - x1).toBeCloseTo(2 * 14.4, 1);
  });
});
