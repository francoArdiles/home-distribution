import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import SolarPanel from '../SolarPanel.jsx';
import { defaultSolarConfig } from '../../utils/solarConfigUtils.js';

vi.mock('../LocationSelector.jsx', () => ({
  default: ({ onChange }) => (
    <div data-testid="location-selector">
      <button onClick={() => onChange({ latitude: 0, longitude: 0, cityName: 'Test' })}>
        change-location
      </button>
    </div>
  ),
}));

vi.mock('../TimeSelector.jsx', () => ({
  default: ({ onChange }) => (
    <div data-testid="time-selector">
      <button onClick={() => onChange({ year: 2024, month: 5, day: 21, hour: 15, minute: 0 })}>
        change-time
      </button>
    </div>
  ),
}));

describe('SolarPanel', () => {
  let onConfigChange, onClose;
  beforeEach(() => {
    onConfigChange = vi.fn();
    onClose = vi.fn();
  });

  test('renderiza LocationSelector y TimeSelector (sin título propio — está en FloatingPanel)', () => {
    const { getByTestId } = render(
      <SolarPanel solarConfig={defaultSolarConfig} onConfigChange={onConfigChange} />
    );
    expect(getByTestId('location-selector')).toBeInTheDocument();
    expect(getByTestId('time-selector')).toBeInTheDocument();
  });

  test('renderiza LocationSelector', () => {
    const { getByTestId } = render(
      <SolarPanel solarConfig={defaultSolarConfig} onConfigChange={onConfigChange} onClose={onClose} />
    );
    expect(getByTestId('location-selector')).toBeInTheDocument();
  });

  test('renderiza TimeSelector', () => {
    const { getByTestId } = render(
      <SolarPanel solarConfig={defaultSolarConfig} onConfigChange={onConfigChange} onClose={onClose} />
    );
    expect(getByTestId('time-selector')).toBeInTheDocument();
  });

  test('checkbox "Mostrar sombras" llama onConfigChange con showShadows alternado', () => {
    const { getByLabelText } = render(
      <SolarPanel solarConfig={defaultSolarConfig} onConfigChange={onConfigChange} onClose={onClose} />
    );
    fireEvent.click(getByLabelText(/mostrar sombras/i));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOptions: expect.objectContaining({ showShadows: true }),
      })
    );
  });

  test('checkbox "Norte arriba" llama onConfigChange con northAtTop alternado', () => {
    const { getByLabelText } = render(
      <SolarPanel solarConfig={defaultSolarConfig} onConfigChange={onConfigChange} onClose={onClose} />
    );
    fireEvent.click(getByLabelText(/norte arriba/i));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOptions: expect.objectContaining({ northAtTop: false }),
      })
    );
  });

  // El botón Cerrar fue movido a FloatingPanel; SolarPanel ya no lo renderiza.

  test('cambio en LocationSelector llama onConfigChange con nueva location', () => {
    const { getByText } = render(
      <SolarPanel solarConfig={defaultSolarConfig} onConfigChange={onConfigChange} onClose={onClose} />
    );
    fireEvent.click(getByText('change-location'));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ location: expect.objectContaining({ cityName: 'Test' }) })
    );
  });

  test('cambio en TimeSelector llama onConfigChange con nuevo dateTime', () => {
    const { getByText } = render(
      <SolarPanel solarConfig={defaultSolarConfig} onConfigChange={onConfigChange} onClose={onClose} />
    );
    fireEvent.click(getByText('change-time'));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateTime: expect.objectContaining({ hour: 15 }) })
    );
  });
});
