import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import CasaSectionView from '../CasaSectionView.jsx';

const baseElement = { id: 'el-1', definitionId: 'casa', label: 'Casa', width: 10, height: 8 };

const baseDetail = {
  _schema: 'casa@1',
  floors: 1,
  bedrooms: 3,
  bathrooms: 1,
  roofType: 'a dos aguas',
  construction: 'hormigón',
  notes: '',
};

describe('CasaSectionView — rendering', () => {
  test('renders top view container', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-top-view')).toBeInTheDocument();
  });

  test('renders front view container', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-front-view')).toBeInTheDocument();
  });

  test('renders view labels', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByText(/Vista Superior/i)).toBeInTheDocument();
    expect(screen.getByText(/Fachada/i)).toBeInTheDocument();
  });
});

describe('CasaSectionView — dimensions', () => {
  test('shows width in top view', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-top-view')).toHaveTextContent('10');
  });

  test('shows height in top view', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-top-view')).toHaveTextContent('8');
  });

  test('shows floor count in front view', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-front-view')).toHaveTextContent('1');
  });
});

describe('CasaSectionView — floors', () => {
  test('renders one floor block per floor', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getAllByTestId(/casa-floor-/)).toHaveLength(1);
  });

  test('renders correct number of floor blocks for multi-floor building', () => {
    const detail = { ...baseDetail, floors: 3 };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    expect(screen.getAllByTestId(/casa-floor-/)).toHaveLength(3);
  });
});

describe('CasaSectionView — roof', () => {
  test('renders roof element in front view', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-roof')).toBeInTheDocument();
  });

  test('renders flat roof when roofType is "plano"', () => {
    const detail = { ...baseDetail, roofType: 'plano' };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    expect(screen.getByTestId('casa-roof')).toBeInTheDocument();
  });
});

describe('CasaSectionView — graceful with missing detail', () => {
  test('renders without crashing when detail is null', () => {
    expect(() =>
      render(<CasaSectionView element={baseElement} detail={null} />)
    ).not.toThrow();
  });
});

describe('CasaSectionView — to-scale top view', () => {
  test('top view viewBox preserves building aspect ratio (wide building)', () => {
    // 10m × 5m → ratio 2:1
    render(<CasaSectionView element={{ ...baseElement, width: 10, height: 5 }} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-top-view');
    const [, , vbW, vbH] = svg.getAttribute('viewBox').split(' ').map(Number);
    const PAD = 28;
    const usableW = vbW - PAD * 2;
    const usableH = vbH - PAD * 2;
    expect(usableW / usableH).toBeCloseTo(10 / 5, 1);
  });

  test('top view viewBox preserves building aspect ratio (square building)', () => {
    // 8m × 8m → ratio 1:1
    render(<CasaSectionView element={{ ...baseElement, width: 8, height: 8 }} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-top-view');
    const [, , vbW, vbH] = svg.getAttribute('viewBox').split(' ').map(Number);
    const PAD = 28;
    const usableW = vbW - PAD * 2;
    const usableH = vbH - PAD * 2;
    expect(usableW / usableH).toBeCloseTo(1, 1);
  });

  test('top view viewBox preserves building aspect ratio (deep building)', () => {
    // 6m × 10m → ratio 0.6
    render(<CasaSectionView element={{ ...baseElement, width: 6, height: 10 }} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-top-view');
    const [, , vbW, vbH] = svg.getAttribute('viewBox').split(' ').map(Number);
    const PAD = 28;
    const usableW = vbW - PAD * 2;
    const usableH = vbH - PAD * 2;
    expect(usableW / usableH).toBeCloseTo(6 / 10, 1);
  });
});

describe('CasaSectionView — responsive SVGs', () => {
  test('top view SVG has a viewBox attribute', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-top-view');
    expect(svg).toHaveAttribute('viewBox');
  });

  test('front view SVG has a viewBox attribute', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-front-view');
    expect(svg).toHaveAttribute('viewBox');
  });

  test('top view SVG width is 100%', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-top-view')).toHaveAttribute('width', '100%');
  });

  test('front view SVG width is 100%', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-front-view')).toHaveAttribute('width', '100%');
  });
});
