import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import MeasurementOverlay from '../MeasurementOverlay.jsx';

// Capture handlers from the Rect hitbox
const capturedLayer = { onClick: null, onMouseMove: null };

vi.mock('react-konva', () => ({
  Layer: ({ children, ...props }) => (
    <div data-testid={props['data-testid'] || undefined} {...props}>{children}</div>
  ),
  Rect: ({ onClick, onMouseMove, onTap, ...props }) => {
    if (onClick) {
      capturedLayer.onClick = onClick;
      capturedLayer.onMouseMove = onMouseMove;
    }
    return <div data-testid="measurement-hitbox" {...props} />;
  },
  Line: ({ points, closed, ...props }) => <div data-testid={props['data-testid'] || 'konva-line'} data-closed={closed ? 'true' : undefined} {...props} />,
  Circle: (props) => <div data-testid={props['data-testid'] || 'konva-circle'} {...props} />,
  Text: ({ text, ...props }) => <span data-testid={props['data-testid'] || 'konva-text'} {...props}>{text}</span>,
  Group: ({ children, ...props }) => <div data-testid={props['data-testid'] || 'konva-group'} {...props}>{children}</div>,
}));

const baseProps = {
  activeTool: 'none',
  activeMeasurements: [],
  scale: 1,
  position: { x: 0, y: 0 },
  baseScale: 10,
  width: 800,
  height: 600,
  onAddMeasurement: vi.fn(),
  onCancel: vi.fn(),
  showMeasurements: true,
  showConstraints: true,
  elements: [],
  terrainPoints: [],
  constraints: [],
  validationResults: [],
  selectedElementId: null,
};

const makeKonvaEvent = (stageX, stageY) => ({
  target: {
    getStage: () => ({
      getPointerPosition: () => ({ x: stageX, y: stageY }),
    }),
  },
});

// Call the captured layer handler with a Konva-like event
const clickAt = (_layer, stageX, stageY) => {
  // Also trigger mousemove to set mousePoint, so preview becomes visible
  capturedLayer.onMouseMove?.(makeKonvaEvent(stageX, stageY));
  capturedLayer.onClick?.(makeKonvaEvent(stageX, stageY));
};

describe('F4-U5: MeasurementOverlay — distance tool', () => {
  beforeEach(() => {
    baseProps.onAddMeasurement = vi.fn();
    baseProps.onCancel = vi.fn();
  });

  test('with activeTool="none", no measurement-layer rendered', () => {
    const { queryByTestId } = render(<MeasurementOverlay {...baseProps} activeTool="none" />);
    // Layer still renders but no interactive elements
    expect(queryByTestId('measurement-layer')).toBeNull();
  });

  test('with activeTool="distance", renders measurement-layer', () => {
    const { getByTestId } = render(<MeasurementOverlay {...baseProps} activeTool="distance" />);
    expect(getByTestId('measurement-layer')).toBeInTheDocument();
  });

  test('saved measurements render as lines with labels', () => {
    const measurements = [
      { id: 'm1', type: 'distance', value: 5.5, p1: { x: 0, y: 0 }, p2: { x: 55, y: 0 } },
    ];
    const { getAllByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="distance" activeMeasurements={measurements} />
    );
    expect(getAllByTestId('measurement-line').length).toBeGreaterThan(0);
    expect(getAllByTestId('measurement-label').length).toBeGreaterThan(0);
  });

  test('measurement label shows distance in meters with 2 decimals', () => {
    const measurements = [
      { id: 'm1', type: 'distance', value: 5.55, p1: { x: 0, y: 0 }, p2: { x: 55.5, y: 0 } },
    ];
    const { getByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="distance" activeMeasurements={measurements} />
    );
    expect(getByTestId('measurement-label').textContent).toContain('5.55');
  });

  test('preview line appears after first click', () => {
    const { getByTestId, queryByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="distance" />
    );
    expect(queryByTestId('measurement-preview')).toBeNull();

    const layer = getByTestId('measurement-layer');
    act(() => { clickAt(layer, 100, 100); });

    expect(queryByTestId('measurement-preview')).toBeInTheDocument();
  });

  test('second click completes measurement and calls onAddMeasurement', () => {
    const { getByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="distance" />
    );
    const layer = getByTestId('measurement-layer');
    act(() => { clickAt(layer, 0, 0); });
    act(() => { clickAt(layer, 30, 40); }); // distance = 5m (30px/10, 40px/10 → 3,4 → dist=5)
    expect(baseProps.onAddMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'distance', value: expect.any(Number) })
    );
  });

  test('Escape cancels measurement in progress', () => {
    const { getByTestId, queryByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="distance" />
    );
    const layer = getByTestId('measurement-layer');
    act(() => { clickAt(layer, 100, 100); });
    expect(queryByTestId('measurement-preview')).toBeInTheDocument();

    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(queryByTestId('measurement-preview')).toBeNull();
  });
});

describe('F4-U6: MeasurementOverlay — area tool', () => {
  beforeEach(() => {
    baseProps.onAddMeasurement = vi.fn();
  });

  test('with activeTool="area", renders measurement-layer', () => {
    const { getByTestId } = render(<MeasurementOverlay {...baseProps} activeTool="area" />);
    expect(getByTestId('measurement-layer')).toBeInTheDocument();
  });

  test('area preview polygon appears after 2+ clicks with mousemove', () => {
    const { getByTestId, queryByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="area" />
    );
    const layer = getByTestId('measurement-layer');
    expect(queryByTestId('area-preview')).toBeNull();
    act(() => { clickAt(layer, 0, 0); });
    act(() => { clickAt(layer, 100, 0); });
    // mousePoint needed for preview to show (clickAt already calls onMouseMove)
    expect(queryByTestId('area-preview')).toBeInTheDocument();
  });

  test('Space key finishes polygon and calls onAddMeasurement with type=area', () => {
    const { getByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="area" />
    );
    const layer = getByTestId('measurement-layer');
    act(() => { clickAt(layer, 0, 0); });
    act(() => { clickAt(layer, 100, 0); });
    act(() => { clickAt(layer, 100, 100); });
    act(() => { fireEvent.keyDown(window, { key: ' ' }); });
    expect(baseProps.onAddMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'area', value: expect.any(Number) })
    );
  });

  test('Space with fewer than 3 vertices does not call onAddMeasurement', () => {
    const { getByTestId } = render(<MeasurementOverlay {...baseProps} activeTool="area" />);
    const layer = getByTestId('measurement-layer');
    act(() => { clickAt(layer, 0, 0); });
    act(() => { clickAt(layer, 100, 0); });
    act(() => { fireEvent.keyDown(window, { key: ' ' }); });
    expect(baseProps.onAddMeasurement).not.toHaveBeenCalled();
  });

  test('area value is correct for a 10×10m square (baseScale=10 → 100px×100px)', () => {
    const { getByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="area" baseScale={10} />
    );
    const layer = getByTestId('measurement-layer');
    act(() => { clickAt(layer, 0, 0); });
    act(() => { clickAt(layer, 100, 0); });
    act(() => { clickAt(layer, 100, 100); });
    act(() => { clickAt(layer, 0, 100); });
    act(() => { fireEvent.keyDown(window, { key: ' ' }); });
    const call = baseProps.onAddMeasurement.mock.calls[0][0];
    expect(call.value).toBeCloseTo(100, 1);
  });

  test('vertex dots are shown while drawing', () => {
    const { getByTestId, getAllByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="area" />
    );
    const layer = getByTestId('measurement-layer');
    act(() => { clickAt(layer, 0, 0); });
    act(() => { clickAt(layer, 100, 0); });
    expect(getAllByTestId('area-vertex').length).toBe(2);
  });

  test('saved area polygons are rendered', () => {
    const measurements = [
      {
        id: 'a1',
        type: 'area',
        value: 50,
        vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
      },
    ];
    const { getAllByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="area" activeMeasurements={measurements} />
    );
    expect(getAllByTestId('area-polygon').length).toBeGreaterThan(0);
  });

  test('area label is shown for saved area measurements', () => {
    const measurements = [
      {
        id: 'a1',
        type: 'area',
        value: 100,
        vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
      },
    ];
    const { getAllByTestId } = render(
      <MeasurementOverlay {...baseProps} activeTool="area" activeMeasurements={measurements} />
    );
    const labels = getAllByTestId('measurement-label');
    expect(labels.some(l => l.textContent.includes('100'))).toBe(true);
  });
});

describe('F4-U7: Auto-distance measurements', () => {
  beforeEach(() => {
    baseProps.onAddMeasurement = vi.fn();
  });

  const squareTerrain = [
    { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 },
  ];

  test('without selected element, no auto-distance-lines', () => {
    const { queryAllByTestId } = render(
      <MeasurementOverlay
        {...baseProps}
        activeTool="none"
        selectedElementId={null}
        elements={[{ id: 'e1', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' }]}
        terrainPoints={squareTerrain}
      />
    );
    expect(queryAllByTestId('auto-distance-line').length).toBe(0);
  });

  test('with selected element and showMeasurements=true, renders auto-distance-line to terrain', () => {
    const elements = [{ id: 'e1', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' }];
    const { getAllByTestId } = render(
      <MeasurementOverlay
        {...baseProps}
        activeTool="none"
        selectedElementId="e1"
        elements={elements}
        terrainPoints={squareTerrain}
        showMeasurements={true}
      />
    );
    expect(getAllByTestId('auto-distance-line').length).toBeGreaterThan(0);
  });

  test('with showMeasurements=false, no auto-distance-lines even with selected element', () => {
    const elements = [{ id: 'e1', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' }];
    const { queryAllByTestId } = render(
      <MeasurementOverlay
        {...baseProps}
        activeTool="none"
        selectedElementId="e1"
        elements={elements}
        terrainPoints={squareTerrain}
        showMeasurements={false}
      />
    );
    expect(queryAllByTestId('auto-distance-line').length).toBe(0);
  });

  test('two close elements (<10m) show inter-element distance', () => {
    const elements = [
      { id: 'e1', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' },
      { id: 'e2', x: 9, y: 5, width: 2, height: 2, shape: 'rectangle' },
    ];
    const { getAllByTestId } = render(
      <MeasurementOverlay
        {...baseProps}
        activeTool="none"
        selectedElementId="e1"
        elements={elements}
        terrainPoints={squareTerrain}
        showMeasurements={true}
      />
    );
    // Should have at least 2 auto-distance-lines (to terrain + to element)
    expect(getAllByTestId('auto-distance-line').length).toBeGreaterThanOrEqual(2);
  });
});

describe('F4-U9: Violation indicators', () => {
  const squareTerrain = [
    { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 },
  ];

  test('violation-line appears when there are violation results', () => {
    const elements = [
      { id: 'e1', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' },
      { id: 'e2', x: 6, y: 5, width: 2, height: 2, shape: 'rectangle' },
    ];
    const validationResults = [
      {
        valid: false,
        actualDistance: 0.5,
        requiredDistance: 3,
        constraint: { id: 'c1', sourceId: 'e1', targetId: 'e2', value: 3, enabled: true },
      },
    ];
    const { getAllByTestId } = render(
      <MeasurementOverlay
        {...baseProps}
        activeTool="none"
        elements={elements}
        terrainPoints={squareTerrain}
        validationResults={validationResults}
        showConstraints={true}
      />
    );
    expect(getAllByTestId('violation-line').length).toBeGreaterThan(0);
  });

  test('violation label shows actual/minimum format', () => {
    const elements = [
      { id: 'e1', x: 5, y: 5, width: 2, height: 2, shape: 'rectangle' },
      { id: 'e2', x: 6, y: 5, width: 2, height: 2, shape: 'rectangle' },
    ];
    const validationResults = [
      {
        valid: false,
        actualDistance: 0.5,
        requiredDistance: 3,
        constraint: { id: 'c1', sourceId: 'e1', targetId: 'e2', value: 3, enabled: true },
      },
    ];
    const { getAllByTestId } = render(
      <MeasurementOverlay
        {...baseProps}
        activeTool="none"
        elements={elements}
        terrainPoints={squareTerrain}
        validationResults={validationResults}
        showConstraints={true}
      />
    );
    const labels = getAllByTestId('violation-label');
    expect(labels[0].textContent).toMatch(/0\.50/);
    expect(labels[0].textContent).toMatch(/3/);
  });

  test('with showConstraints=false, no violation indicators', () => {
    const validationResults = [
      {
        valid: false,
        actualDistance: 0.5,
        requiredDistance: 3,
        constraint: { id: 'c1', sourceId: 'e1', targetId: 'e2', value: 3, enabled: true },
      },
    ];
    const { queryAllByTestId } = render(
      <MeasurementOverlay
        {...baseProps}
        activeTool="none"
        validationResults={validationResults}
        showConstraints={false}
      />
    );
    expect(queryAllByTestId('violation-line').length).toBe(0);
  });
});
