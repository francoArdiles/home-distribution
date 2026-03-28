import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TerrainCanvas from '../TerrainCanvas';

// Mock react-konva since we can't render canvas in tests easily
jest.mock('react-konva', () => {
  let pointerPosition = { x: 0, y: 0 };
  return {
    Stage: ({ children, ref, ...props }) => {
      const stageRef = { 
        current: { 
          getPointerPosition: () => pointerPosition,
          width: () => 800, 
          height: () => 600 
        } 
      };
      if (ref) ref.current = stageRef.current;
      return <div data-testid="konva-stage" onMouseDown={(e) => {
          pointerPosition = { x: e.clientX, y: e.clientY };
        }} onMouseUp={(e) => {
          pointerPosition = { x: e.clientX, y: e.clientY };
        }} onMouseMove={(e) => {
          pointerPosition = { x: e.clientX, y: e.clientY };
        }}>
        {children}
      </div>;
    },
    Layer: ({ children }) => <div data-testid="konva-layer">{children}</div>,
    Line: ({ points, ...props }) => <div data-testid="konva-line" data-points={points.join(',')}></div>,
    Circle: ({ x, y, ...props }) => <div data-testid="konva-circle" data-x={x} data-y={y}></div>,
    Label: ({ x, y, children, ...props }) => (
      <div data-testid="konva-label" data-x={x} data-y={y}>
        {children}
      </div>
    ),
    Rect: ({ x, y, width, height, ...props }) => (
      <div data-testid="konva-rect" data-x={x} data-y={y} data-width={width} data-height={height}></div>
    ),
  };
});

describe('TerrainCanvas', () => {
  let onPointsChange;

  beforeEach(() => {
    onPointsChange = jest.fn();
  });

  const createWrapper = () => {
    return render(<TerrainCanvas onPointsChange={onPointsChange} />);
  };

  // Helper to simulate click on canvas
  const clickCanvas = (wrapper, x, y) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    fireEvent.mouseDown(stageDiv, {
      clientX: x,
      clientY: y,
      button: 0,
    });
    fireEvent.mouseUp(stageDiv, {
      clientX: x,
      clientY: y,
      button: 0,
    });
  };

  // Helper to simulate key press
  const pressKey = (wrapper, key) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    fireEvent.keyDown(stageDiv, { key });
    fireEvent.keyUp(stageDiv, { key });
  };

  test('renders without errors', () => {
    const wrapper = createWrapper();
    expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
  });

  test('initial state has empty points array', () => {
    const wrapper = createWrapper();
    expect(onPointsChange).toHaveBeenCalledWith([]);
  });

  test('adding points via click increases points count', () => {
    const wrapper = createWrapper();
    
    // Click to add first point
    clickCanvas(wrapper, 100, 100);
    expect(onPointsChange).toHaveBeenLastCalledWith([{ x: 100, y: 100 }]);
    
    // Click to add second point
    clickCanvas(wrapper, 200, 200);
    expect(onPointsChange).toHaveBeenLastCalledWith([{ x: 100, y: 100 }, { x: 200, y: 200 }]);
    
    // Click to add third point
    clickCanvas(wrapper, 300, 100);
    expect(onPointsChange).toHaveBeenLastCalledWith([
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 100 }
    ]);
  });

  test('pressing Enter finishes polygon when at least 3 points exist', () => {
    const wrapper = createWrapper();
    
    // Add 3 points
    clickCanvas(wrapper, 100, 100);
    clickCanvas(wrapper, 200, 200);
    clickCanvas(wrapper, 300, 100);
    
    // Press Enter
    pressKey(wrapper, 'Enter');
    
    // Should keep the same points (finished polygon)
    expect(onPointsChange).toHaveBeenLastCalledWith([
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 100 }
    ]);
  });

  test('pressing Enter does nothing when less than 3 points', () => {
    const wrapper = createWrapper();
    
    // Add only 2 points
    clickCanvas(wrapper, 100, 100);
    clickCanvas(wrapper, 200, 200);
    
    // Press Enter
    pressKey(wrapper, 'Enter');
    
    // Should keep the same 2 points
    expect(onPointsChange).toHaveBeenLastCalledWith([{ x: 100, y: 100 }, { x: 200, y: 200 }]);
  });

  test('pressing Escape clears all points', () => {
    const wrapper = createWrapper();
    
    // Add some points
    clickCanvas(wrapper, 100, 100);
    clickCanvas(wrapper, 200, 200);
    clickCanvas(wrapper, 300, 100);
    
    // Press Escape
    pressKey(wrapper, 'Escape');
    
    // Should clear points
    expect(onPointsChange).toHaveBeenLastCalledWith([]);
  });

  test('pressing Backspace removes last point', () => {
    const wrapper = createWrapper();
    
    // Add 3 points
    clickCanvas(wrapper, 100, 100);
    clickCanvas(wrapper, 200, 200);
    clickCanvas(wrapper, 300, 100);
    
    // Press Backspace
    pressKey(wrapper, 'Backspace');
    
    // Should remove last point
    expect(onPointsChange).toHaveBeenLastCalledWith([
      { x: 100, y: 100 },
      { x: 200, y: 200 }
    ]);
  });

  test('pressing Delete removes last point', () => {
    const wrapper = createWrapper();
    
    // Add 3 points
    clickCanvas(wrapper, 100, 100);
    clickCanvas(wrapper, 200, 200);
    clickCanvas(wrapper, 300, 100);
    
    // Press Delete
    pressKey(wrapper, 'Delete');
    
    // Should remove last point
    expect(onPointsChange).toHaveBeenLastCalledWith([
      { x: 100, y: 100 },
      { x: 200, y: 200 }
    ]);
  });

  test('prevents self-intersecting polygons', () => {
    const wrapper = createWrapper();
    
    // Add points that would create self-intersection if we added the fourth point
    // First points: (100,100), (200,200), (100,200)
    clickCanvas(wrapper, 100, 100);
    clickCanvas(wrapper, 200, 200);
    clickCanvas(wrapper, 100, 200);
    
    // Try to add point (200,100) which would intersect with segment (100,100)-(200,200)
    clickCanvas(wrapper, 200, 100);
    
    // Should not have added the point (prevented self-intersection)
    expect(onPointsChange).toHaveBeenLastCalledWith([
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 100, y: 200 }
    ]);
  });

  test('allows adding points that do not cause self-intersection', () => {
    const wrapper = createWrapper();
    
    // Add points in a safe order
    clickCanvas(wrapper, 100, 100);
    clickCanvas(wrapper, 200, 200);
    clickCanvas(wrapper, 300, 100);
    
    // Add another point that doesn't cause intersection
    clickCanvas(wrapper, 400, 200);
    
    // Should have added the point
    expect(onPointsChange).toHaveBeenLastCalledWith([
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 100 },
      { x: 400, y: 200 }
    ]);
  });

  test('calls onPointsChange prop with updated points', () => {
    const wrapper = createWrapper();
    
    clickCanvas(wrapper, 150, 150);
    
    expect(onPointsChange).toHaveBeenCalledWith([{ x: 150, y: 150 }]);
  });
});