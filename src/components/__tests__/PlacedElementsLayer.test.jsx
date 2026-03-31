import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import PlacedElementsLayer from '../PlacedElementsLayer.jsx';

// Module-level object — mocks close over this by reference (run at render time, not hoist time)
const captured = { moveHandler: null, resizeHandlers: [], rotateHandler: null };

vi.mock('react-konva', () => {
  const Stage = React.forwardRef(({ children, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({ getPointerPosition: () => ({ x: 0, y: 0 }) }));
    return <div data-testid="konva-stage" {...props}>{children}</div>;
  });
  return {
    Stage,
    Layer: ({ children }) => <div data-testid="konva-layer">{children}</div>,
    Rect: ({ x, y, width, height, fill, stroke, strokeWidth, draggable, onClick, onDragEnd, rotation, ...props }) => {
      if (onDragEnd) captured.moveHandler = onDragEnd;
      return (
        <div
          data-testid="konva-rect"
          data-x={x} data-y={y} data-width={width} data-height={height}
          data-fill={fill} data-stroke={stroke} data-stroke-width={strokeWidth}
          data-draggable={String(draggable)} data-rotation={rotation}
          onClick={onClick}
          {...props}
        />
      );
    },
    Circle: ({ x, y, radius, fill, stroke, strokeWidth, draggable, onClick, onDragEnd, rotation, ...props }) => {
      const testId = props['data-testid'] || 'konva-circle-element';
      if (testId === 'konva-circle-element' && onDragEnd) captured.moveHandler = onDragEnd;
      if (testId === 'resize-handle' && onDragEnd) captured.resizeHandlers.push(onDragEnd);
      if (testId === 'rotation-handle' && onDragEnd) captured.rotateHandler = onDragEnd;
      return (
        <div
          data-testid="konva-circle-element"
          data-x={x} data-y={y} data-radius={radius}
          data-fill={fill} data-stroke={stroke}
          data-draggable={String(draggable)}
          onClick={onClick}
          {...props}
        />
      );
    },
    Text: ({ text, ...props }) => <span data-testid="konva-text" {...props}>{text}</span>,
    Line: () => <div data-testid="konva-line" />,
    Label: ({ children, ...props }) => <div data-testid="konva-label" {...props}>{children}</div>,
    Tag: (props) => <div data-testid="konva-tag" {...props} />,
    Group: ({ children, ...props }) => <div data-testid="konva-group" {...props}>{children}</div>,
  };
});

const baseProps = {
  scale: 1,
  position: { x: 0, y: 0 },
  baseScale: 10,
  onSelectElement: vi.fn(),
  onMoveElement: vi.fn(),
  onResizeElement: vi.fn(),
  onRotateElement: vi.fn(),
};


const rectElement = {
  id: 'el-1',
  definitionId: 'taller',
  shape: 'rectangle',
  x: 5, y: 5,
  width: 5, height: 4,
  radius: 0,
  rotation: 0,
  label: 'Taller',
  isSelected: false,
  color: '#808080',
  borderColor: '#696969',
  borderWidth: 1,
};

const circleElement = {
  id: 'el-2',
  definitionId: 'arbol_frutal',
  x: 3, y: 3,
  width: 4, height: 4,
  radius: 2,
  rotation: 0,
  label: 'Árbol',
  isSelected: false,
  color: '#228B22',
  borderColor: '#006400',
  borderWidth: 1,
  shape: 'circle',
};

describe('PlacedElementsLayer', () => {
  beforeEach(() => {
    baseProps.onSelectElement = vi.fn();
    baseProps.onMoveElement = vi.fn();
    baseProps.onResizeElement = vi.fn();
    baseProps.onRotateElement = vi.fn();
    captured.moveHandler = null;
    captured.resizeHandlers = [];
    captured.rotateHandler = null;
  });

  test('renders correct number of elements', () => {
    const { getAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[rectElement, circleElement]} />
    );
    // At least 2 groups rendered
    const groups = getAllByTestId('konva-group');
    expect(groups.length).toBe(2);
  });

  test('rectangle element renders a Rect', () => {
    const { getAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[rectElement]} />
    );
    expect(getAllByTestId('konva-rect').length).toBeGreaterThan(0);
  });

  test('circle element renders a Circle', () => {
    const { getAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[{ ...circleElement, shape: 'circle' }]} />
    );
    expect(getAllByTestId('konva-circle-element').length).toBeGreaterThan(0);
  });

  test('selected element has different stroke', () => {
    const selected = { ...rectElement, isSelected: true };
    const { getAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[selected]} />
    );
    const rect = getAllByTestId('konva-rect')[0];
    // Selected element should have a selection stroke (blue or different)
    expect(rect.getAttribute('data-stroke')).not.toBe(rectElement.borderColor);
  });

  test('clicking element calls onSelectElement with element id', () => {
    const { getAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[rectElement]} />
    );
    const rect = getAllByTestId('konva-rect')[0];
    act(() => { fireEvent.click(rect); });
    expect(baseProps.onSelectElement).toHaveBeenCalledWith(rectElement.id);
  });

  test('renders element label', () => {
    const { getByText } = render(
      <PlacedElementsLayer {...baseProps} elements={[rectElement]} />
    );
    expect(getByText('Taller')).toBeInTheDocument();
  });

  test('renders nothing when elements array is empty', () => {
    const { queryAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[]} />
    );
    expect(queryAllByTestId('konva-group').length).toBe(0);
  });
});

describe('Resize handles (F2-U7)', () => {
  test('selected rectangle shows 4 resize handles', () => {
    const selected = { ...rectElement, isSelected: true };
    const { getAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[selected]} />
    );
    const handles = getAllByTestId('resize-handle');
    expect(handles.length).toBe(4);
  });

  test('non-selected element shows no resize handles', () => {
    const { queryAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[rectElement]} />
    );
    expect(queryAllByTestId('resize-handle').length).toBe(0);
  });

  test('selected circle shows 1 resize handle', () => {
    const selected = { ...circleElement, shape: 'circle', isSelected: true };
    const { getAllByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[selected]} />
    );
    const handles = getAllByTestId('resize-handle');
    expect(handles.length).toBe(1);
  });
});

describe('Rotation handle (F2-U8)', () => {
  beforeEach(() => {
    captured.resizeHandlers = [];
    captured.rotateHandler = null;
    baseProps.onRotateElement = vi.fn();
  });

  test('selected element shows rotation handle', () => {
    const selected = { ...rectElement, isSelected: true };
    const { getByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[selected]} />
    );
    expect(getByTestId('rotation-handle')).toBeInTheDocument();
  });

  test('non-selected element shows no rotation handle', () => {
    const { queryByTestId } = render(
      <PlacedElementsLayer {...baseProps} elements={[rectElement]} />
    );
    expect(queryByTestId('rotation-handle')).toBeNull();
  });

  test('dragging rotation handle calls onRotateElement with angle', () => {
    const selected = { ...rectElement, isSelected: true };
    render(<PlacedElementsLayer {...baseProps} elements={[selected]} />);

    expect(captured.rotateHandler).toBeDefined();
    // element center at sx=50, sy=50; drag handle to the right → ~90°
    captured.rotateHandler({ target: { x: () => 70, y: () => 50 } });
    expect(baseProps.onRotateElement).toHaveBeenCalledWith(rectElement.id, expect.any(Number));
    const angle = baseProps.onRotateElement.mock.calls[0][1];
    expect(angle).toBeCloseTo(90, 0);
  });
});

// terrain: 20x20 meter square → layer pixels 0-200
const squareTerrain = [
  { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 },
];

describe('F2-U10: Snap to grid on drag', () => {
  beforeEach(() => {
    captured.moveHandler = null;
    baseProps.onMoveElement = vi.fn();
  });

  test('with snapToGridEnabled, position is rounded to nearest meter', () => {
    // rectElement: x=5,y=5 (center meters), w=10,h=8. Rect rendered at sx-w/2=0,sy-h/2=10
    render(<PlacedElementsLayer {...baseProps} elements={[rectElement]} snapToGridEnabled={true} terrainPoints={squareTerrain} />);
    expect(captured.moveHandler).toBeDefined();
    // drag rect center to (73, 77) → 7.3m, 7.7m → snapped to 7m, 8m
    captured.moveHandler({ target: { x: () => 73, y: () => 77, position: vi.fn() } });
    expect(baseProps.onMoveElement).toHaveBeenCalledWith(rectElement.id, 7, 8);
  });

  test('without snapToGridEnabled, position is exact', () => {
    render(<PlacedElementsLayer {...baseProps} elements={[rectElement]} snapToGridEnabled={false} terrainPoints={squareTerrain} />);
    // drag rect center to (73, 77) → 7.3m, 7.7m
    captured.moveHandler({ target: { x: () => 73, y: () => 77, position: vi.fn() } });
    expect(baseProps.onMoveElement).toHaveBeenCalledWith(rectElement.id, 7.3, 7.7);
  });

  test('snap works for circle elements', () => {
    const circ = { ...circleElement, shape: 'circle' };
    render(<PlacedElementsLayer {...baseProps} elements={[circ]} snapToGridEnabled={true} terrainPoints={squareTerrain} />);
    // circle center at sx=30,sy=30. Drag to (34,37) → 3.4m,3.7m → snapped to 3m,4m
    captured.moveHandler({ target: { x: () => 34, y: () => 37, position: vi.fn() } });
    expect(baseProps.onMoveElement).toHaveBeenCalledWith(circ.id, 3, 4);
  });
});

describe('F2-U6: Collision detection on drag', () => {
  beforeEach(() => {
    captured.moveHandler = null;
    baseProps.onMoveElement = vi.fn();
  });

  test('drag within terrain calls onMoveElement', () => {
    render(<PlacedElementsLayer {...baseProps} elements={[rectElement]} terrainPoints={squareTerrain} />);
    // center → (100,100) stage px → 10m,10m. Rect from (5,6) to (15,14) meters — inside 20x20m
    captured.moveHandler({ target: { x: () => 50, y: () => 60, position: vi.fn() } });
    expect(baseProps.onMoveElement).toHaveBeenCalled();
  });

  test('drag outside terrain does NOT call onMoveElement', () => {
    render(<PlacedElementsLayer {...baseProps} elements={[rectElement]} terrainPoints={squareTerrain} />);
    // center → (300,100) stage px → 30m,10m. Rect right edge = 35m = 350px > 200px → outside
    captured.moveHandler({ target: { x: () => 250, y: () => 60, position: vi.fn() } });
    expect(baseProps.onMoveElement).not.toHaveBeenCalled();
  });

  test('drag outside terrain resets Konva node position', () => {
    const mockReset = vi.fn();
    render(<PlacedElementsLayer {...baseProps} elements={[rectElement]} terrainPoints={squareTerrain} />);
    captured.moveHandler({ target: { x: () => 250, y: () => 60, position: mockReset } });
    expect(mockReset).toHaveBeenCalled();
  });

  test('without terrainPoints no collision check, always calls onMoveElement', () => {
    render(<PlacedElementsLayer {...baseProps} elements={[rectElement]} terrainPoints={[]} />);
    captured.moveHandler({ target: { x: () => 250, y: () => 60, position: vi.fn() } });
    expect(baseProps.onMoveElement).toHaveBeenCalled();
  });

  test('circle drag outside terrain does NOT call onMoveElement', () => {
    const circ = { ...circleElement, shape: 'circle' };
    render(<PlacedElementsLayer {...baseProps} elements={[circ]} terrainPoints={squareTerrain} />);
    // circle center → (190,30) px → 19m,3m. radius=2m=20px → right edge at (190+20=210 > 200) → outside
    captured.moveHandler({ target: { x: () => 190, y: () => 30, position: vi.fn() } });
    expect(baseProps.onMoveElement).not.toHaveBeenCalled();
  });
});

describe('Resize drag (F2-U7 functional)', () => {
  beforeEach(() => {
    captured.resizeHandlers = [];
    captured.rotateHandler = null;
    baseProps.onResizeElement = vi.fn();
  });

  test('dragging br resize handle calls onResizeElement with new dimensions', () => {
    // rectElement: x=5,y=5, w=5,h=4, scale=1, baseScale=10 → sx=50,sy=50
    // tl anchor at (25,30), br at (75,70)
    const selected = { ...rectElement, isSelected: true };
    render(<PlacedElementsLayer {...baseProps} elements={[selected]} />);

    // 4 handles: tl=0, tr=1, br=2, bl=3
    expect(captured.resizeHandlers.length).toBe(4);
    const brHandler = captured.resizeHandlers[2];
    // drag br to (95,80): new w=(95-25)/10=7, h=(80-30)/10=5
    brHandler({ target: { x: () => 95, y: () => 80 } });
    expect(baseProps.onResizeElement).toHaveBeenCalledWith(rectElement.id, expect.objectContaining({
      width: expect.any(Number),
      height: expect.any(Number),
    }));
    const updates = baseProps.onResizeElement.mock.calls[0][1];
    expect(updates.width).toBeCloseTo(7);
    expect(updates.height).toBeCloseTo(5);
  });

  test('dragging circle resize handle calls onResizeElement with new radius', () => {
    const selected = { ...circleElement, isSelected: true };
    render(<PlacedElementsLayer {...baseProps} elements={[selected]} />);

    expect(captured.resizeHandlers.length).toBe(1);
    // circle center at sx=30,sy=30; drag to (60,30) → dist=30px → radius=3m
    captured.resizeHandlers[0]({ target: { x: () => 60, y: () => 30 } });
    expect(baseProps.onResizeElement).toHaveBeenCalledWith(circleElement.id, expect.objectContaining({
      radius: expect.any(Number),
    }));
    const updates = baseProps.onResizeElement.mock.calls[0][1];
    expect(updates.radius).toBeCloseTo(3);
  });
});
