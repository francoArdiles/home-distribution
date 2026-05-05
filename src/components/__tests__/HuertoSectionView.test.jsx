import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import HuertoSectionView from '../HuertoSectionView.jsx';

const baseElement = { id: 'el-1', definitionId: 'huerto', label: 'Huerto', width: 4, height: 2 };

const baseDetail = {
  _schema: 'huerto@1',
  cropType: 'hortalizas',
  irrigation: 'goteo',
  substrate: 'tierra + compost',
  seasons: [],
  notes: '',
};

describe('HuertoSectionView — rendering', () => {
  test('renders top view container', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('huerto-top-view')).toBeInTheDocument();
  });

  test('renders soil cross-section container', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('huerto-soil-view')).toBeInTheDocument();
  });

  test('renders view labels', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByText(/Vista Superior/i)).toBeInTheDocument();
    expect(screen.getByText(/Perfil de Suelo/i)).toBeInTheDocument();
  });
});

describe('HuertoSectionView — top view details', () => {
  test('renders bed rows in top view', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getAllByTestId(/huerto-row-/).length).toBeGreaterThan(0);
  });

  test('shows dimensions in top view', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('huerto-top-view')).toHaveTextContent('4');
    expect(screen.getByTestId('huerto-top-view')).toHaveTextContent('2');
  });

  test('renders irrigation indicator', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('huerto-irrigation')).toBeInTheDocument();
  });
});

describe('HuertoSectionView — soil view', () => {
  test('renders substrate layer', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('huerto-substrate-layer')).toBeInTheDocument();
  });

  test('shows substrate type label', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('huerto-soil-view')).toHaveTextContent('tierra + compost');
  });

  test('renders native soil layer below substrate', () => {
    render(<HuertoSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('huerto-native-layer')).toBeInTheDocument();
  });
});

describe('HuertoSectionView — graceful with missing detail', () => {
  test('renders without crashing when detail is null', () => {
    expect(() =>
      render(<HuertoSectionView element={baseElement} detail={null} />)
    ).not.toThrow();
  });
});
