import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import MeasurementToolkit from '../MeasurementToolkit.jsx';

describe('MeasurementToolkit', () => {
  let props;
  beforeEach(() => {
    props = {
      activeTool: 'none',
      onSelectTool: vi.fn(),
      onClearMeasurements: vi.fn(),
      showMeasurements: true,
      showConstraints: true,
      onToggleMeasurements: vi.fn(),
      onToggleConstraints: vi.fn(),
    };
  });

  test('renders heading "Medidas"', () => {
    const { getByText } = render(<MeasurementToolkit {...props} />);
    expect(getByText('Medidas')).toBeInTheDocument();
  });

  test('renders buttons Regla, Área, Limpiar', () => {
    const { getByText } = render(<MeasurementToolkit {...props} />);
    expect(getByText('Regla')).toBeInTheDocument();
    expect(getByText('Área')).toBeInTheDocument();
    expect(getByText('Limpiar')).toBeInTheDocument();
  });

  test('click Regla calls onSelectTool("distance")', () => {
    const { getByText } = render(<MeasurementToolkit {...props} />);
    fireEvent.click(getByText('Regla'));
    expect(props.onSelectTool).toHaveBeenCalledWith('distance');
  });

  test('click Área calls onSelectTool("area")', () => {
    const { getByText } = render(<MeasurementToolkit {...props} />);
    fireEvent.click(getByText('Área'));
    expect(props.onSelectTool).toHaveBeenCalledWith('area');
  });

  test('click Limpiar calls onClearMeasurements()', () => {
    const { getByText } = render(<MeasurementToolkit {...props} />);
    fireEvent.click(getByText('Limpiar'));
    expect(props.onClearMeasurements).toHaveBeenCalled();
  });

  test('active tool has aria-pressed="true"', () => {
    const { getByText } = render(<MeasurementToolkit {...props} activeTool="distance" />);
    expect(getByText('Regla').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(getByText('Área').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  test('checkbox Mostrar mediciones calls onToggleMeasurements', () => {
    const { getByLabelText } = render(<MeasurementToolkit {...props} />);
    fireEvent.click(getByLabelText('Mostrar mediciones'));
    expect(props.onToggleMeasurements).toHaveBeenCalled();
  });

  test('checkbox Mostrar restricciones calls onToggleConstraints', () => {
    const { getByLabelText } = render(<MeasurementToolkit {...props} />);
    fireEvent.click(getByLabelText('Mostrar restricciones'));
    expect(props.onToggleConstraints).toHaveBeenCalled();
  });
});
