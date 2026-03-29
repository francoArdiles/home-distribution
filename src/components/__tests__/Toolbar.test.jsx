import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import Toolbar from '../Toolbar';

describe('Toolbar', () => {
  let onFinish, onToggleGrid, onClear;

  beforeEach(() => {
    onFinish = vi.fn();
    onToggleGrid = vi.fn();
    onClear = vi.fn();
  });

  const createWrapper = (props = {}) => {
    const defaults = {
      pointsCount: 0,
      finished: false,
      gridVisible: false,
      onFinish,
      onToggleGrid,
      onClear,
    };
    return render(<Toolbar {...defaults} {...props} />);
  };

  test('renders "Finalizar terreno" button', () => {
    const { getByText } = createWrapper();
    expect(getByText('Finalizar terreno')).toBeInTheDocument();
  });

  test('renders "Mostrar cuadrícula" button when grid is hidden', () => {
    const { getByText } = createWrapper({ gridVisible: false });
    expect(getByText('Mostrar cuadrícula')).toBeInTheDocument();
  });

  test('renders "Ocultar cuadrícula" button when grid is visible', () => {
    const { getByText } = createWrapper({ gridVisible: true });
    expect(getByText('Ocultar cuadrícula')).toBeInTheDocument();
  });

  test('renders "Limpiar" button', () => {
    const { getByText } = createWrapper();
    expect(getByText('Limpiar')).toBeInTheDocument();
  });

  test('clicking "Finalizar terreno" calls onFinish', () => {
    const { getByText } = createWrapper({ pointsCount: 3 });
    fireEvent.click(getByText('Finalizar terreno'));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('clicking grid toggle calls onToggleGrid', () => {
    const { getByText } = createWrapper();
    fireEvent.click(getByText('Mostrar cuadrícula'));
    expect(onToggleGrid).toHaveBeenCalledTimes(1);
  });

  test('clicking "Limpiar" calls onClear', () => {
    const { getByText } = createWrapper();
    fireEvent.click(getByText('Limpiar'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('"Finalizar" is disabled when pointsCount < 3', () => {
    const { getByText } = createWrapper({ pointsCount: 2 });
    expect(getByText('Finalizar terreno')).toBeDisabled();
  });

  test('"Finalizar" is disabled when finished === true', () => {
    const { getByText } = createWrapper({ pointsCount: 5, finished: true });
    expect(getByText('Finalizar terreno')).toBeDisabled();
  });

  test('"Finalizar" is enabled when pointsCount >= 3 and not finished', () => {
    const { getByText } = createWrapper({ pointsCount: 3, finished: false });
    expect(getByText('Finalizar terreno')).not.toBeDisabled();
  });
});
