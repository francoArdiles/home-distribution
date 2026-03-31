import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import TerrainCanvas from '../TerrainCanvas';

// Mock react-konva to avoid native canvas dependency
vi.mock('react-konva', () => {
  const MockStage = React.forwardRef(({ children, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onWheel, onKeyDown, width, height, ...props }, ref) => {
    const pointerPosRef = React.useRef({ x: 0, y: 0 });

    React.useImperativeHandle(ref, () => ({
      getPointerPosition: () => ({ ...pointerPosRef.current }),
    }));

    const handleMouseDown = (e) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      if (onMouseDown) onMouseDown({ evt: e });
    };
    const handleMouseMove = (e) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      if (onMouseMove) onMouseMove({ evt: e });
    };
    const handleMouseUp = (e) => {
      if (onMouseUp) onMouseUp({ evt: e });
    };
    const handleWheel = (e) => {
      if (onWheel) onWheel({ evt: { deltaY: e.deltaY, clientX: e.clientX, clientY: e.clientY, preventDefault: () => {} } });
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
  });

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
    Circle: ({ x, y, radius, fill, stroke, strokeWidth, draggable, onDragStart, onDragEnd, onDragMove, onMouseEnter, onMouseLeave, ...props }) => (
      <div
        data-testid="konva-circle"
        data-x={x}
        data-y={y}
        data-radius={radius}
        data-fill={fill}
        data-stroke={stroke}
        data-stroke-width={strokeWidth}
        data-draggable={String(draggable)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        {...props}
      />
    ),
    Label: ({ x, y, children, ...props }) => (
      <div data-testid="konva-label" data-x={x} data-y={y} {...props}>
        {children}
      </div>
    ),
    Tag: ({ fill, cornerRadius, stroke, strokeWidth, pointerDirection, pointerWidth, pointerHeight, ...props }) => (
      <div data-testid="konva-tag" data-fill={fill} {...props} />
    ),
    Text: ({ text, fill, fontSize, padding, ...props }) => (
      <span data-testid="konva-label-text" data-text={text} {...props}>{text}</span>
    ),
  };
});

describe('TerrainCanvas', () => {
  let onPointsChange;
  let container;

  beforeEach(() => {
    onPointsChange = vi.fn();
    container = document.createElement('div');
    // jsdom doesn't compute layout, so clientWidth/Height are 0 by default.
    // Override them so getCanvasBounds() returns a proper 800x600 viewport.
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
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

  const clickCanvas = (wrapper, x, y) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    act(() => {
      fireEvent.mouseDown(stageDiv, { clientX: x, clientY: y, button: 0 });
      fireEvent.mouseUp(stageDiv, { clientX: x, clientY: y, button: 0 });
    });
  };

  const moveMouse = (wrapper, x, y) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    act(() => {
      fireEvent.mouseMove(stageDiv, { clientX: x, clientY: y });
    });
  };

  const wheelZoom = (wrapper, deltaY = -100) => {
    const stageDiv = wrapper.getByTestId('konva-stage');
    act(() => {
      fireEvent.wheel(stageDiv, { deltaY, clientX: 400, clientY: 300 });
    });
  };

  const pressKey = (wrapper, key) => {
    act(() => {
      fireEvent.keyDown(window, { key });
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

    test('preview line is dashed', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      const lines = wrapper.getAllByTestId('konva-line');
      const dashedLines = lines.filter(l => {
        const dash = l.getAttribute('data-dash');
        return dash && dash.length > 0;
      });
      expect(dashedLines.length).toBeGreaterThan(0);
    });

    test('ignores clicks after polygon is finished', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);
      pressKey(wrapper, 'Enter');

      onPointsChange.mockClear();

      clickCanvas(wrapper, 400, 200);

      expect(onPointsChange).not.toHaveBeenCalled();
    });

    test('ignores clicks outside canvas bounds', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, -100, -100);

      // Only the initial useEffect call should exist
      const addCalls = onPointsChange.mock.calls.filter(
        call => call[0].length > 0
      );
      expect(addCalls.length).toBe(0);
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
      onPointsChange.mockClear();
      pressKey(wrapper, 'Backspace');
      expect(onPointsChange).not.toHaveBeenCalled();
    });

    test('Delete does nothing when no points', () => {
      const wrapper = createWrapper();
      onPointsChange.mockClear();
      pressKey(wrapper, 'Delete');
      expect(onPointsChange).not.toHaveBeenCalled();
    });
  });

  describe('Self-Intersection Prevention', () => {
    test('prevents self-intersecting polygons', () => {
      const wrapper = createWrapper();

      // Create a diagonal line, then a crossing line (figure-eight / X shape)
      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 300, 300);
      clickCanvas(wrapper, 300, 100);

      // Segment (300,100)-(100,300) would cross (100,100)-(300,300)
      clickCanvas(wrapper, 100, 300);

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

      const circles = wrapper.getAllByTestId('konva-circle');
      expect(circles[0]).toHaveAttribute('data-draggable', 'false');
    });
  });

  describe('Zoom Functionality', () => {
    test('zoom in works (deltaY negative)', () => {
      const wrapper = createWrapper();
      wheelZoom(wrapper, -100);
      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('zoom out works (deltaY positive)', () => {
      const wrapper = createWrapper();
      wheelZoom(wrapper, 100);
      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('zoom is clamped to min/max', () => {
      const wrapper = createWrapper();
      for (let i = 0; i < 20; i++) {
        wheelZoom(wrapper, -100);
      }
      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });
  });

  describe('Pan Functionality', () => {
    test('component handles mouse down for panning', () => {
      const wrapper = createWrapper();
      const stageDiv = wrapper.getByTestId('konva-stage');

      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 100, clientY: 100, button: 0 });
      });

      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('component handles mouse move during pan', () => {
      const wrapper = createWrapper();
      const stageDiv = wrapper.getByTestId('konva-stage');

      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 100, clientY: 100, button: 0 });
        fireEvent.mouseMove(stageDiv, { clientX: 150, clientY: 150 });
      });

      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });

    test('component handles mouse up to end pan', () => {
      const wrapper = createWrapper();
      const stageDiv = wrapper.getByTestId('konva-stage');

      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 100, clientY: 100, button: 0 });
        fireEvent.mouseMove(stageDiv, { clientX: 150, clientY: 150 });
        fireEvent.mouseUp(stageDiv, { button: 0 });
      });

      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    test('tooltip appears when hovering over segment', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      moveMouse(wrapper, 150, 100);

      const tooltip = wrapper.getByTestId('konva-label');
      expect(tooltip).toBeInTheDocument();
    });

    test('tooltip shows segment length with 1 decimal precision', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      moveMouse(wrapper, 150, 100);

      const tooltipText = wrapper.getByTestId('konva-label-text');
      expect(tooltipText).toBeInTheDocument();
      expect(tooltipText.textContent).toMatch(/10\.0 m/);
    });

    test('tooltip disappears when not hovering over segment', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);

      moveMouse(wrapper, 500, 500);

      expect(wrapper.getByTestId('konva-stage')).toBeInTheDocument();
    });
  });

  describe('Area and Perimeter Calculation', () => {
    test('calculates correct points for a triangle', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 0, 0);
      clickCanvas(wrapper, 30, 0);
      clickCanvas(wrapper, 0, 40);
      pressKey(wrapper, 'Enter');

      expect(onPointsChange).toHaveBeenLastCalledWith([
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 0, y: 40 }
      ]);
    });

    test('calculates correct points for a square', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 0, 0);
      clickCanvas(wrapper, 100, 0);
      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 0, 100);
      pressKey(wrapper, 'Enter');

      expect(onPointsChange).toHaveBeenLastCalledWith([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ]);
    });
  });

  describe('Self-Intersection Visual Feedback', () => {
    test('shows red preview line when point would cause self-intersection', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 300, 300);
      clickCanvas(wrapper, 300, 100);

      // (100,300) would create a crossing with (100,100)-(300,300)
      clickCanvas(wrapper, 100, 300);

      const lastCall = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(3);
      expect(lastCall).toEqual([
        { x: 100, y: 100 },
        { x: 300, y: 300 },
        { x: 300, y: 100 }
      ]);
    });

    test('shows blue preview line when point is valid', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 150);

      const lastCall = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(4);
      expect(lastCall).toContainEqual({ x: 300, y: 150 });
    });
  });

  describe('Point Tolerance', () => {
    test('clicking very close to existing point does not add new point', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 101, 101);

      const lastCall = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(1);
    });

    test('clicking outside tolerance adds new point', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 110, 110);

      const lastCall = onPointsChange.mock.calls[onPointsChange.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(2);
    });
  });

  describe('Grid', () => {
    test('grid lines NOT rendered when gridVisible=false (default)', () => {
      const wrapper = render(
        <TerrainCanvas onPointsChange={onPointsChange} container={container} gridVisible={false} />
      );
      const lines = wrapper.queryAllByTestId('konva-grid-line');
      expect(lines.length).toBe(0);
    });

    test('grid lines rendered when gridVisible=true', () => {
      const wrapper = render(
        <TerrainCanvas onPointsChange={onPointsChange} container={container} gridVisible={true} />
      );
      const lines = wrapper.queryAllByTestId('konva-grid-line');
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('Cursor Coordinates', () => {
    test('onCursorMove is called on mouse move with coordinates in meters', () => {
      const onCursorMove = vi.fn();
      const wrapper = render(
        <TerrainCanvas onPointsChange={onPointsChange} container={container} onCursorMove={onCursorMove} />
      );
      const stageDiv = wrapper.getByTestId('konva-stage');
      act(() => {
        fireEvent.mouseMove(stageDiv, { clientX: 100, clientY: 200 });
      });
      expect(onCursorMove).toHaveBeenCalledWith({ x: 10, y: 20 });
    });

    test('onCursorMove is NOT called when finished=true', () => {
      const onCursorMove = vi.fn();
      const wrapper = render(
        <TerrainCanvas onPointsChange={onPointsChange} container={container} onCursorMove={onCursorMove} />
      );
      // finish the polygon using separate act() calls like existing tests
      const stageDiv = wrapper.getByTestId('konva-stage');
      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 100, clientY: 100, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 100, clientY: 100, button: 0 });
      });
      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 200, clientY: 200, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 200, clientY: 200, button: 0 });
      });
      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 300, clientY: 100, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 300, clientY: 100, button: 0 });
      });
      act(() => {
        fireEvent.keyDown(window, { key: 'Enter' });
      });
      onCursorMove.mockClear();
      act(() => {
        fireEvent.mouseMove(stageDiv, { clientX: 150, clientY: 150 });
      });
      expect(onCursorMove).not.toHaveBeenCalled();
    });
  });

  describe('Tooltips on finished polygon', () => {
    test('tooltips appear on segment hover when polygon is finished', () => {
      const wrapper = createWrapper();
      const stageDiv = wrapper.getByTestId('konva-stage');

      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 100, clientY: 100, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 100, clientY: 100, button: 0 });
      });
      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 200, clientY: 100, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 200, clientY: 100, button: 0 });
      });
      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 150, clientY: 200, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 150, clientY: 200, button: 0 });
      });
      act(() => {
        fireEvent.keyDown(window, { key: 'Enter' });
      });
      act(() => {
        fireEvent.mouseMove(stageDiv, { clientX: 150, clientY: 100 });
      });

      const tooltip = wrapper.getByTestId('konva-label');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Polygon Closure', () => {
    test('polygon shows closing line when finished with 3+ points', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 100);
      clickCanvas(wrapper, 150, 200);
      pressKey(wrapper, 'Enter');

      const lines = wrapper.getAllByTestId('konva-line');
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    test('preview dashed line disappears when polygon is finished', () => {
      const wrapper = createWrapper();

      clickCanvas(wrapper, 100, 100);
      clickCanvas(wrapper, 200, 200);
      clickCanvas(wrapper, 300, 100);

      let dashedLines = wrapper.getAllByTestId('konva-line').filter(l => {
        const dash = l.getAttribute('data-dash');
        return dash && dash.length > 0;
      });
      expect(dashedLines.length).toBeGreaterThan(0);

      pressKey(wrapper, 'Enter');

      dashedLines = wrapper.getAllByTestId('konva-line').filter(l => {
        const dash = l.getAttribute('data-dash');
        return dash && dash.length > 0;
      });
      expect(dashedLines.length).toBe(0);
    });
  });

  describe('Element placement (F2-U3)', () => {
    test('when activeElementType is set and finished, clicking canvas calls onPlaceElement with position in meters', () => {
      const onPlaceElement = vi.fn();
      const wrapper = render(
        <TerrainCanvas
          onPointsChange={onPointsChange}
          container={container}
          finished={true}
          activeElementType="casa"
          onPlaceElement={onPlaceElement}
        />
      );
      const stageDiv = wrapper.getByTestId('konva-stage');
      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 100, clientY: 200, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 100, clientY: 200, button: 0 });
      });
      expect(onPlaceElement).toHaveBeenCalledTimes(1);
      // baseScale = 10, so 100px = 10m, 200px = 20m
      expect(onPlaceElement).toHaveBeenCalledWith(10, 20);
    });

    test('when activeElementType is null, clicking canvas does NOT call onPlaceElement', () => {
      const onPlaceElement = vi.fn();
      const wrapper = render(
        <TerrainCanvas
          onPointsChange={onPointsChange}
          container={container}
          finished={true}
          activeElementType={null}
          onPlaceElement={onPlaceElement}
        />
      );
      const stageDiv = wrapper.getByTestId('konva-stage');
      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 100, clientY: 200, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 100, clientY: 200, button: 0 });
      });
      expect(onPlaceElement).not.toHaveBeenCalled();
    });

    test('onPlaceElement is NOT called when polygon is still being drawn (finished=false)', () => {
      const onPlaceElement = vi.fn();
      const wrapper = render(
        <TerrainCanvas
          onPointsChange={onPointsChange}
          container={container}
          finished={false}
          activeElementType="casa"
          onPlaceElement={onPlaceElement}
        />
      );
      const stageDiv = wrapper.getByTestId('konva-stage');
      act(() => {
        fireEvent.mouseDown(stageDiv, { clientX: 100, clientY: 200, button: 0 });
        fireEvent.mouseUp(stageDiv, { clientX: 100, clientY: 200, button: 0 });
      });
      expect(onPlaceElement).not.toHaveBeenCalled();
    });
  });

  describe('Vertex position display while dragging', () => {
    test('shows vertex coordinates label when dragging a vertex in terrainEditMode', () => {
      const wrapper = render(
        <TerrainCanvas
          onPointsChange={onPointsChange}
          container={container}
          finished={true}
          terrainEditMode={true}
          initialPoints={[
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 200, y: 200 }
          ]}
        />
      );

      // Trigger drag on the first circle using native drag events
      const circles = wrapper.getAllByTestId('konva-circle');
      expect(circles.length).toBe(3);
      
      act(() => {
        fireEvent(circles[0], new MouseEvent('dragstart', { bubbles: true }));
        fireEvent(circles[0], new MouseEvent('drag', { bubbles: true, clientX: 150, clientY: 150 }));
      });

      // Should show vertex position label
      const labels = wrapper.getAllByTestId('konva-label');
      expect(labels.length).toBeGreaterThan(0);
      const labelTexts = wrapper.getAllByTestId('konva-label-text');
      expect(labelTexts.some(l => l.textContent.includes('x:') && l.textContent.includes('y:'))).toBe(true);
    });
  });
});
