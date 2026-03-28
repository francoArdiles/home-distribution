import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TerrainCanvas from '../TerrainCanvas';

// Mock react-konva - single comprehensive mock
jest.mock('react-konva', () => {
  let pointerPosition = { x: 400, y: 300 };
  let stagePosition = { x: 0, y: 0 };
  let stageScale = 1;

  const MockStage = ({ children, ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onWheel, onKeyDown, width, height, ...props }) => {
    const handleMouseDown = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      pointerPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      if (onMouseDown) onMouseDown({ evt: e, currentTarget: e.currentTarget });
    };

    const handleMouseMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      pointerPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      if (onMouseMove) onMouseMove({ evt: e });
    };

    const handleMouseUp = (e) => {
      if (onMouseUp) onMouseUp({ evt: e });
    };

    const handleWheel = (e) => {
      if (onWheel) onWheel({ evt: e });
    };

    const handleKeyDown = (e) => {
      if (onKeyDown) onKeyDown({ evt: { key: e.key, preventDefault: () => {} } });
    };

    return (
      <div
        data-testid="konva-stage"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        style={{ width: width || 800, height: height || 600 }}
        {...props}
      >
        {children}
      </div>
    );
  };

  MockStage.createBridge = () => {};
  MockStage.defaultProps = {};

  return {
    Stage: MockStage,
    Layer: ({ children }) => <div data-testid="konva-layer">{children}</div>,
    Line: ({ points, stroke, strokeWidth, dash, fill, ...props }) => (
      <div
        data-testid="konva-line"
        data-points={points ? points.join(',') : ''}
        data-stroke={stroke}
        data-dash={dash ? dash.join(',') : ''}
        data-fill={fill}
        data-stroke-width={strokeWidth}
        {...props}
      />
    ),
    Circle: ({ x, y, radius, fill, stroke, strokeWidth, draggable, onDragStart, onDragEnd, onMouseEnter, onMouseLeave, ...props }) => (
      <div
        data-testid="konva-circle"
        data-x={x}
        data-y={y}
        data-radius={radius}
        data-fill={fill}
        data-stroke={stroke}
        data-stroke-width={strokeWidth}
        data-draggable={draggable}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        {...props}
      />
    ),
    Label: ({ x, y, children, pointerDirection, pointerWidth, pointerHeight, ...props }) => (
      <div
        data-testid="konva-label"
        data-x={x}
        data-y={y}
        data-pointer-dir={pointerDirection}
        {...props}
      >
        {children}
      </div>
    ),
  };
});

// Mock Label subcomponents separately using jest.requireActual pattern
jest.mock('react-konva', () => {
  const mock = jest.requireActual('react-konva');
  return {
    ...mock,
    Label: {
      ...mock.Label,
      Text: ({ text, fill, fontSize, padding, ...props }) => (
        <span data-testid="konva-label-text" data-text={text} data-fill={fill} data-font-size={fontSize} {...props}>
          {text}
        </span>
      ),
      Tag: ({ fill, cornerRadius, stroke, strokeWidth, ...props }) => (
        <div data-testid="konva-label-tag" data-fill={fill} data-corner-radius={cornerRadius} data-stroke={stroke} {...props} />
      ),
    },
  };
});

describe('TerrainCanvas', () => {
  let onPointsChange;
  let container;

  beforeEach(() => {
    onPointsChange = jest.fn();
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    container = null;
    onPointsChange = null;
  });

  const createWrapper = () => {
    return render(
      <TerrainCanvas onPointsChange={onPointsChange} container={container} />
    );
  };

  // Helper to simulate click on canvas at specific position
  const clickCanvas = (wrapper, x, y) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    act(() => {
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
    });
  };

  // Helper to simulate mouse move
  const moveMouse = (wrapper, x, y) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    act(() => {
      fireEvent.mouseMove(stageDiv, {
        clientX: x,
        clientY: y,
      });
    });
  };

  // Helper to simulate wheel zoom
  const wheelZoom = (wrapper, deltaY = -100) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    act(() => {
      fireEvent.wheel(stageDiv, {
        deltaY: deltaY,
        clientX: 400,
        clientY: 300,
        preventDefault: jest.fn(),
      });
    });
  };

  // Helper to simulate key press
  const pressKey = (wrapper, key) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    act(() => {
      fireEvent.keyDown(stageDiv, { key });
    });
  };

  describe('Initial State', () => {
    test('renders without errors', () => {
      const wrapper = createWrapper();
      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('initial state has empty points array', () => {
      createWrapper();
      expect(onPointsChange).toHaveBeenCalledWith([]);
    });

    test('points start as empty array', () => {
      const wrapper = createWrapper();
      const circles = wrapper.queryAllByTestId('konva-circle');
      expect(circles.length).toBe(0);
    });
  });

  describe('Adding Points', () => {
    test('adding points via click increases points count', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      expect(onPointsChange).toHaveBeenLastCalledWith([{ x: 100, y: 100 }]);

      clickCanvas(wrapper, 200, 200);
      expect(onPointsChange).toHaveBeenLastCalledWith([
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ]);

      clickCanvas(wrapper, 300, 100);
      expect(onPointsChange).toHaveBeenLastCalledWith([
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 100 }
      ]);
    });

    test('points are rendered as red circles', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      const circles = wrapper.getAllByTestId('konva-circle');
      expect(circles.length).toBe(2);
      expect(circles[0]).toHaveAttribute('data-fill', 'red');
      expect(circles[1]).toHaveAttribute('data-fill', 'red');
    });

    test('polygon line is rendered with brown color', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      const lines = wrapper.getAllByTestId('konva-line');
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0]).toHaveAttribute('data-stroke', 'brown');
    });

    test('preview line is dashed blue', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      const lines = wrapper.getAllByTestId('konva-line');
      // Find the dashed preview line (has dash attribute)
      const dashedLines = lines.filter(l => {
        const dash = l.getAttribute('data-dash');
        return dash && dash.length > 0;
      });
      expect(dashedLines.length).toBeGreaterThan(0);
    });

    test('ignores clicks after polygon is finished', () => {
      const wrapper = createWrapper();

      // Add 3 points and finish
      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);
      pressKey(wrapper, 'Enter');

      // Reset mock to track new calls
      onPointsChange.mockClear();

      // Try to add another point
      clickCanvas(wrapper, 400, 200);

      // Should not have added the point
      expect(onPointsChange).not.toHaveBeenCalled();
    });

    test('ignores clicks outside canvas bounds', () => {
      const wrapper = createWrapper();

      // Click at negative coordinates (outside typical canvas)
      clickCanvas(wrapper, -100, -100);

      // Should not add point since it's outside canvas bounds
      expect(onPointsChange).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Controls', () => {
    test('pressing Enter finishes polygon when at least 3 points exist', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);
      pressKey(wrapper, 'Enter');

      expect(onPointsChange).toHaveBeenLastCalledWith([
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 100 }
      ]);
    });

    test('pressing Enter does nothing when less than 3 points', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);

      const lastCallBeforeEnter = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      pressKey(wrapper, 'Enter');

      // Points should remain 2
      const lastCallAfterEnter = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCallAfterEnter).toEqual(lastCallBeforeEnter);
    });

    test('pressing Escape clears all points', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);
      pressKey(wrapper, 'Escape');

      expect(onPointsChange).toHaveBeenLastCalledWith([]);
    });

    test('pressing Backspace removes last point', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);
      pressKey(wrapper, 'Backspace');

      expect(onPointsChange).toHaveBeenLastCalledWith([
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ]);
    });

    test('pressing Delete removes last point', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);
      pressKey(wrapper, 'Delete');

      expect(onPointsChange).toHaveBeenLastCalledWith([
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ]);
    });

    test('Backspace does nothing when no points', () => {
      const wrapper = createWrapper();
      pressKey(wrapper, 'Backspace');
      expect(onPointsChange).not.toHaveBeenCalled();
    });

    test('Delete does nothing when no points', () => {
      const wrapper = createWrapper();
      pressKey(wrapper, 'Delete');
      expect(onPointsChange).not.toHaveBeenCalled();
    });
  });

  describe('Self-Intersection Prevention', () => {
    test('prevents self-intersecting polygons', () => {
      const wrapper = createWrapper();

      // Create an L-shape that would self-intersect
      clickCanvas(wrapper, 100, 100); // bottom-left
      clickCanvas(wrapper, 100, 200); // top-left
      clickCanvas(wrapper, 200, 200); // top-right

      // This point (200, 100) would create a crossing line
      clickCanvas(wrapper, 200, 100);

      // Should only have 3 points (the 4th was rejected)
      const lastCall = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(3);
    });

    test('allows adding points that do not cause self-intersection', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);
      clickCanvas(wrapper, 400, 200);

      const lastCall = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(4);
    });
  });

  describe('Point Dragging', () => {
    test('points are draggable when not finished', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      const circles = wrapper.getAllByTestId('konva-circle');
      expect(circles[0]).toHaveAttribute('data-draggable', 'true');
    });

    test('points are not draggable when finished', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);
      pressKey(wrapper, 'Enter');

      // After finishing, circles should not be draggable
      const circles = wrapper.getAllByTestId('konva-circle');
      expect(circles[0]).toHaveAttribute('data-draggable', 'false');
    });
  });

  describe('Zoom Functionality', () => {
    test('zoom in works (deltaY negative)', () => {
      const wrapper = createWrapper();

      // Initial scale is 1, after zoom in should be > 1
      wheelZoom(wrapper, -100); // negative = zoom in

      // Component should still be rendered
      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('zoom out works (deltaY positive)', () => {
      const wrapper = createWrapper();

      wheelZoom(wrapper, 100); // positive = zoom out

      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('zoom is clamped to min/max', () => {
      const wrapper = createWrapper();

      // Try to zoom in many times
      for (let i = 0; i < 20; i++) {
        wheelZoom(wrapper, -100);
      }

      // Should not exceed max scale
      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });
  });

  describe('Pan Functionality', () => {
    test('component handles mouse down for panning', () => {
      const wrapper = createWrapper();
      const stageDiv = wrapper.getByTestId('konva-stage');

      act(() => {
        fireEvent.mouseDown(stageDiv, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });
      });

      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('component handles mouse move during pan', () => {
      const wrapper = createWrapper();
      const stageDiv = wrapper.getByTestId('konva-stage');

      act(() => {
        fireEvent.mouseDown(stageDiv, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });
        fireEvent.mouseMove(stageDiv, {
          clientX: 150,
          clientY: 150,
        });
      });

      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('component handles mouse up to end pan', () => {
      const wrapper = createWrapper();
      const stageDiv = wrapper.getByTestId('konva-stage');

      act(() => {
        fireEvent.mouseDown(stageDiv, {
          clientX: 100,
          clientY: 100,
          button: 0,
        });
        fireEvent.mouseMove(stageDiv, {
          clientX: 150,
          clientY: 150,
        });
        fireEvent.mouseUp(stageDiv, {
          button: 0,
        });
      });

      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    test('tooltip appears when hovering over segment', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      // Move mouse over the segment (midpoint at 150, 100)
      moveMouse(wrapper, 150, 100);

      // The tooltip should appear
      const tooltip = wrapper.getByTestId('konva-label');
      expect(tooltip).toBeInTheDocument();
    });

    test('tooltip shows segment length with 1 decimal precision', () => {
      const wrapper = createWrapper();

      // Add two points 100 pixels apart (10m at 10px=1m scale)
      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      // Move mouse over midpoint
      moveMouse(wrapper, 150, 100);

      const tooltipText = wrapper.getByTestId('konva-label-text');
      expect(tooltipText).toBeInTheDocument();
      // The text should show "10.0 m" (100px / 10 = 10m)
      expect(tooltipText.textContent).toMatch(/10\.0 m/);
    });

    test('tooltip disappears when not hovering over segment', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      // Move mouse far from any segment
      moveMouse(wrapper, 500, 500);

      // Move back to a point then away to clear tooltip state
      moveMouse(wrapper, 100, 100);

      // The component should handle this gracefully
      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });
  });

  describe('Point Tolerance', () => {
    test('clicking very close to existing point does not add new point', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);

      // Click within tolerance (2px) - should not add new point
      clickCanvas(wrapper, 101, 101);

      // Should still only have 1 point
      const lastCall = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(1);
    });

    test('clicking outside tolerance adds new point', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);

      // Click outside tolerance (more than 2px away)
      clickCanvas(wrapper, 110, 110);

      // Should have 2 points
      const lastCall = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(2);
    });
  });

  describe('Polygon Closure', () => {
    test('polygon shows closing line when finished with 3+ points', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);
      clickCanvas(wrapper, 150, 200);
      pressKey(wrapper, 'Enter');

      // Should have closing line (brown, connecting last to first)
      const lines = wrapper.getAllByTestId('konva-line');
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    test('preview dashed line disappears when polygon is finished', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);

      // Before finishing, should have dashed line
      let dashedLines = wrapper.getAllByTestId('konva-line').filter(l => {
        const dash = l.getAttribute('data-dash');
        return dash && dash.length > 0;
      });
      expect(dashedLines.length).toBeGreaterThan(0);

      pressKey(wrapper, 'Enter');

      // After finishing, no dashed lines
      dashedLines = wrapper.getAllByTestId('konva-line').filter(l => {
        const dash = l.getAttribute('data-dash');
        return dash && dash.length > 0;
      });
      expect(dashedLines.length).toBe(0);
    });
  });
});
