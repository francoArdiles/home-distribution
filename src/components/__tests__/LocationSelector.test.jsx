import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import LocationSelector from '../LocationSelector.jsx';

const defaultLocation = { latitude: 40.4168, longitude: -3.7038, cityName: 'Madrid' };

describe('LocationSelector', () => {
  let onChange;
  beforeEach(() => { onChange = vi.fn(); });

  test('renderiza selector de ciudades', () => {
    const { getByRole } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    expect(getByRole('combobox')).toBeInTheDocument();
  });

  test('renderiza las ciudades predefinidas (≥5)', () => {
    const { getByRole } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    const options = getByRole('combobox').querySelectorAll('option');
    expect(options.length).toBeGreaterThanOrEqual(5);
  });

  test('la ciudad activa aparece como valor seleccionado', () => {
    const { getByRole } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    expect(getByRole('combobox').value).toBe('Madrid');
  });

  test('cambiar ciudad llama onChange con latitude, longitude, cityName', () => {
    const { getByRole } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    fireEvent.change(getByRole('combobox'), { target: { value: 'Buenos Aires' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      cityName: 'Buenos Aires',
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    }));
  });

  test('renderiza inputs de latitud y longitud', () => {
    const { getByLabelText } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    expect(getByLabelText(/latitud/i)).toBeInTheDocument();
    expect(getByLabelText(/longitud/i)).toBeInTheDocument();
  });

  test('cambiar latitud manualmente llama onChange con cityName Custom', () => {
    const { getByLabelText } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    fireEvent.change(getByLabelText(/latitud/i), { target: { value: '19.43' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 19.43,
      cityName: 'Custom',
    }));
  });

  test('latitud inválida (> 90) NO llama onChange', () => {
    const { getByLabelText } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    fireEvent.change(getByLabelText(/latitud/i), { target: { value: '95' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('latitud inválida (< -90) NO llama onChange', () => {
    const { getByLabelText } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    fireEvent.change(getByLabelText(/latitud/i), { target: { value: '-91' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('longitud inválida (> 180) NO llama onChange', () => {
    const { getByLabelText } = render(<LocationSelector location={defaultLocation} onChange={onChange} />);
    fireEvent.change(getByLabelText(/longitud/i), { target: { value: '181' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
