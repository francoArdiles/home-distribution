import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import SvgGrid from '../SvgGrid.jsx';

// Wrap in SVG for valid DOM
function wrap(el) {
  return render(<svg>{el}</svg>);
}

const props = { bx: 28, by: 28, bw: 144, bh: 115, scaleM: 14.4, stepM: 1 };

describe('SvgGrid — rendering', () => {
  test('renders a <g> container', () => {
    const { container } = wrap(<SvgGrid {...props} />);
    expect(container.querySelector('[data-testid="svg-grid"]')).not.toBeNull();
  });

  test('renders vertical lines for each meter mark (10m wide → 9 interior lines)', () => {
    // bw=144, scaleM=14.4 → width=10m → 9 vertical interior lines (x=1..9)
    const { container } = wrap(<SvgGrid {...props} />);
    const vLines = container.querySelectorAll('[data-testid^="svg-grid-v-"]');
    expect(vLines.length).toBe(9);
  });

  test('renders horizontal lines for each meter mark (8m deep → 7 interior lines)', () => {
    // bh=115.2≈115, scaleM=14.4 → depth≈8m → 7 horizontal interior lines
    const { container } = wrap(<SvgGrid { ...props } bh={Math.round(8 * 14.4)} />);
    const hLines = container.querySelectorAll('[data-testid^="svg-grid-h-"]');
    expect(hLines.length).toBe(7);
  });

  test('vertical lines stay within building x bounds', () => {
    const { container } = wrap(<SvgGrid {...props} />);
    const vLines = container.querySelectorAll('[data-testid^="svg-grid-v-"]');
    vLines.forEach(l => {
      const x = parseFloat(l.getAttribute('x1'));
      expect(x).toBeGreaterThan(props.bx);
      expect(x).toBeLessThan(props.bx + props.bw);
    });
  });

  test('horizontal lines stay within building y bounds', () => {
    const { container } = wrap(<SvgGrid { ...props } bh={Math.round(8 * 14.4)} />);
    const hLines = container.querySelectorAll('[data-testid^="svg-grid-h-"]');
    hLines.forEach(l => {
      const y = parseFloat(l.getAttribute('y1'));
      expect(y).toBeGreaterThan(props.by);
      expect(y).toBeLessThan(props.by + Math.round(8 * 14.4));
    });
  });
});

describe('SvgGrid — minor/major lines', () => {
  test('lines at integer meters have major data-major attribute', () => {
    const { container } = wrap(<SvgGrid {...props} stepM={0.5} majorStepM={1} />);
    const majorLines = container.querySelectorAll('[data-major="true"]');
    // 10m width → 9 major verticals; 8m depth → 7 major horizontals = 16 total
    expect(majorLines.length).toBeGreaterThan(0);
  });

  test('minor lines (non-integer) do not have data-major', () => {
    const { container } = wrap(<SvgGrid {...props} stepM={0.5} majorStepM={1} />);
    const minorLines = container.querySelectorAll('[data-major="false"]');
    expect(minorLines.length).toBeGreaterThan(0);
  });

  test('without majorStepM all lines are equal (no data-major distinction)', () => {
    const { container } = wrap(<SvgGrid {...props} stepM={1} />);
    const majorLines = container.querySelectorAll('[data-major="true"]');
    const minorLines = container.querySelectorAll('[data-major="false"]');
    expect(majorLines.length).toBe(0);
    expect(minorLines.length).toBe(0);
  });
});
