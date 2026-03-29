import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import Toolbar from '../Toolbar.jsx';

describe('F4-U10: Toolbar Medidas button', () => {
  test('Medidas button appears when finished=true', () => {
    const { getByText } = render(
      <Toolbar
        pointsCount={4}
        finished={true}
        gridVisible={false}
        onFinish={vi.fn()}
        onToggleGrid={vi.fn()}
        onClear={vi.fn()}
        solarVisible={false}
        onToggleSolar={vi.fn()}
        onToggleMeasurements={vi.fn()}
      />
    );
    expect(getByText('Medidas')).toBeInTheDocument();
  });

  test('Medidas button not shown when finished=false', () => {
    const { queryByText } = render(
      <Toolbar
        pointsCount={1}
        finished={false}
        gridVisible={false}
        onFinish={vi.fn()}
        onToggleGrid={vi.fn()}
        onClear={vi.fn()}
        solarVisible={false}
        onToggleSolar={vi.fn()}
        onToggleMeasurements={vi.fn()}
      />
    );
    expect(queryByText('Medidas')).toBeNull();
  });

  test('clicking Medidas calls onToggleMeasurements', () => {
    const onToggleMeasurements = vi.fn();
    const { getByText } = render(
      <Toolbar
        pointsCount={4}
        finished={true}
        gridVisible={false}
        onFinish={vi.fn()}
        onToggleGrid={vi.fn()}
        onClear={vi.fn()}
        solarVisible={false}
        onToggleSolar={vi.fn()}
        onToggleMeasurements={onToggleMeasurements}
      />
    );
    fireEvent.click(getByText('Medidas'));
    expect(onToggleMeasurements).toHaveBeenCalled();
  });
});
