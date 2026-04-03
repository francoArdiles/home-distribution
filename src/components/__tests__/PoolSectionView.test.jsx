import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import PoolSectionView from '../PoolSectionView.jsx';

const baseElement = {
  id: 'el-1',
  definitionId: 'piscina',
  label: 'Piscina principal',
  width: 8,
  height: 4,
};

const baseDetail = {
  _schema: 'piscina@1',
  depth: 1.5,
  slope: 0,
  steps: [],
  lining: 'hormigón',
  heated: false,
};

describe('PoolSectionView — rendering', () => {
  test('renders top view container', () => {
    render(<PoolSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('pool-top-view')).toBeInTheDocument();
  });

  test('renders side view container', () => {
    render(<PoolSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('pool-side-view')).toBeInTheDocument();
  });

  test('renders labels for each view', () => {
    render(<PoolSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByText(/Vista Superior/i)).toBeInTheDocument();
    expect(screen.getByText(/Vista Lateral/i)).toBeInTheDocument();
  });
});

describe('PoolSectionView — dimensions display', () => {
  test('shows pool width in top view', () => {
    render(<PoolSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('pool-top-view')).toHaveTextContent('8');
  });

  test('shows pool height in top view', () => {
    render(<PoolSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('pool-top-view')).toHaveTextContent('4');
  });

  test('shows depth in side view', () => {
    render(<PoolSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('pool-side-view')).toHaveTextContent('1.5');
  });

  test('updates side view when depth changes', () => {
    const detail = { ...baseDetail, depth: 2.5 };
    render(<PoolSectionView element={baseElement} detail={detail} />);
    expect(screen.getByTestId('pool-side-view')).toHaveTextContent('2.5');
  });
});

describe('PoolSectionView — slope', () => {
  test('shows slope indicator when slope > 0', () => {
    const detail = { ...baseDetail, slope: 5 };
    render(<PoolSectionView element={baseElement} detail={detail} />);
    expect(screen.getByTestId('pool-slope-indicator')).toBeInTheDocument();
  });

  test('does not render slope indicator when slope is 0', () => {
    render(<PoolSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.queryByTestId('pool-slope-indicator')).not.toBeInTheDocument();
  });

  test('shows slope value when slope > 0', () => {
    const detail = { ...baseDetail, slope: 5 };
    render(<PoolSectionView element={baseElement} detail={detail} />);
    expect(screen.getByTestId('pool-slope-indicator')).toHaveTextContent('5');
  });
});

describe('PoolSectionView — steps', () => {
  test('renders step indicators in top view when steps exist', () => {
    const detail = { ...baseDetail, steps: [{ width: 1.0, depth: 0.3 }, { width: 1.0, depth: 0.3 }] };
    render(<PoolSectionView element={baseElement} detail={detail} />);
    expect(screen.getAllByTestId(/pool-step-top-/)).toHaveLength(2);
  });

  test('renders no step indicators when steps is empty', () => {
    render(<PoolSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.queryAllByTestId(/pool-step-top-/)).toHaveLength(0);
  });

  test('renders step profile in side view when steps exist', () => {
    const detail = { ...baseDetail, steps: [{ width: 1.0, depth: 0.3 }] };
    render(<PoolSectionView element={baseElement} detail={detail} />);
    expect(screen.getAllByTestId(/pool-step-side-/)).toHaveLength(1);
  });
});

describe('PoolSectionView — graceful with missing detail', () => {
  test('renders without crashing when detail is null', () => {
    expect(() =>
      render(<PoolSectionView element={baseElement} detail={null} />)
    ).not.toThrow();
  });

  test('renders without crashing when detail is empty object', () => {
    expect(() =>
      render(<PoolSectionView element={baseElement} detail={{}} />)
    ).not.toThrow();
  });
});
