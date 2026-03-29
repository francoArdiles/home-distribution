import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import TimeSelector from '../TimeSelector.jsx';

const defaultDateTime = { year: 2024, month: 5, day: 15, hour: 12, minute: 0 };

describe('TimeSelector', () => {
  let onChange;
  beforeEach(() => { onChange = vi.fn(); });

  test('renderiza slider o input de hora', () => {
    const { container } = render(<TimeSelector dateTime={defaultDateTime} onChange={onChange} />);
    const hourInput = container.querySelector('input[type="range"], input[type="number"][aria-label*="hora" i], input[data-testid="hour-input"]');
    expect(hourInput).toBeInTheDocument();
  });

  test('renderiza input de fecha', () => {
    const { container } = render(<TimeSelector dateTime={defaultDateTime} onChange={onChange} />);
    const dateInput = container.querySelector('input[type="date"], input[data-testid="date-input"]');
    expect(dateInput).toBeInTheDocument();
  });

  test('botón "Solsticio Verano" establece month=5, day=21', () => {
    const { getByText } = render(<TimeSelector dateTime={defaultDateTime} onChange={onChange} />);
    fireEvent.click(getByText(/solsticio.+verano/i));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ month: 5, day: 21 }));
  });

  test('botón "Solsticio Invierno" establece month=11, day=21', () => {
    const { getByText } = render(<TimeSelector dateTime={defaultDateTime} onChange={onChange} />);
    fireEvent.click(getByText(/solsticio.+invierno/i));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ month: 11, day: 21 }));
  });

  test('botón "Equinoccio" establece month=2, day=21', () => {
    const { getByText } = render(<TimeSelector dateTime={defaultDateTime} onChange={onChange} />);
    fireEvent.click(getByText(/equinoccio/i));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ month: 2, day: 21 }));
  });

  test('botón "Ahora" llama onChange con fecha y hora actuales', () => {
    const { getByText } = render(<TimeSelector dateTime={defaultDateTime} onChange={onChange} />);
    fireEvent.click(getByText(/ahora/i));
    expect(onChange).toHaveBeenCalled();
    const called = onChange.mock.calls[0][0];
    const now = new Date();
    expect(called.year).toBe(now.getFullYear());
  });

  test('cambiar slider/input de hora llama onChange con nuevo hour', () => {
    const { container } = render(<TimeSelector dateTime={defaultDateTime} onChange={onChange} />);
    const hourInput = container.querySelector('input[type="range"]') ||
                      container.querySelector('input[data-testid="hour-input"]');
    fireEvent.change(hourInput, { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hour: 15 }));
  });

  test('valor del slider refleja dateTime.hour', () => {
    const { container } = render(<TimeSelector dateTime={{ ...defaultDateTime, hour: 8 }} onChange={onChange} />);
    const hourInput = container.querySelector('input[type="range"]') ||
                      container.querySelector('input[data-testid="hour-input"]');
    expect(Number(hourInput.value)).toBe(8);
  });
});
