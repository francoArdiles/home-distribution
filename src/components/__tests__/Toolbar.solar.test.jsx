import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import Toolbar from '../Toolbar.jsx';

describe('Toolbar — botón Solar (F3-U10)', () => {
  const baseProps = {
    pointsCount: 3,
    finished: true,
    gridVisible: false,
    onFinish: vi.fn(),
    onToggleGrid: vi.fn(),
    onClear: vi.fn(),
  };

  test('muestra botón Solar cuando finished=true', () => {
    const onToggleSolar = vi.fn();
    const { getByText } = render(<Toolbar {...baseProps} onToggleSolar={onToggleSolar} solarVisible={false} />);
    expect(getByText(/solar/i)).toBeInTheDocument();
  });

  test('click en Solar llama onToggleSolar', () => {
    const onToggleSolar = vi.fn();
    const { getByText } = render(<Toolbar {...baseProps} onToggleSolar={onToggleSolar} solarVisible={false} />);
    fireEvent.click(getByText(/solar/i));
    expect(onToggleSolar).toHaveBeenCalled();
  });

  test('no muestra botón Solar cuando finished=false', () => {
    const { queryByText } = render(
      <Toolbar {...baseProps} finished={false} onToggleSolar={vi.fn()} solarVisible={false} />
    );
    expect(queryByText(/^solar$/i)).toBeNull();
  });
});
