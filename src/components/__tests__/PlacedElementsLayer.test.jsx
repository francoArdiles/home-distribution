import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import PlacedElementsLayer from '../PlacedElementsLayer.jsx';

// Module-level object — Circle mock closes over this by reference, so it works
// even though vi.mock is hoisted (the Circle function body runs at render time)
const captured = { resizeHandlers: [], rotateHandler: null };

vi.mock('react-konva', () => {
  const Stage = React.forwardRef(({ children, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({ getPointerPosition: () => ({ x: 0, y: 0 }) }));
    return <div data-testid="konva-stage" {...props}>{children}</div>;
  });
  return {
    Stage,
    Layer: ({ children }) => <div data-testid="konva-layer">{children}</div>,
    Rect: ({ x, y, width, height, fill, stroke, strokeWidth, draggable, onClick, onDragEnd, rotation, ...props }) => (
      <div
        data-testid="konva-rect"
        data-x={x} data-y={y} data-width={width} data-height={height}
        data-fill={fill} data-stroke={stroke} data-stroke-width={strokeWidth}
        data-draggable={String(draggable)} data-rotation={rotation}
        onClick={onClick}
        {...props}
      />
    ),
    Circle: ({ x, y, radius, fill, stroke, strokeWidth, draggable, onClick, onDragEnd, rotation, ...props }) => {
      const testId = props['data-testid'] || 'konva-circle-element';
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
  definitionId: 'casa',
  x: 5, y: 5,
  width: 10, height: 8,
  radius: 0,
  rotation: 0,
  label: 'Casa',
  isSelected: false,
  color: '#E8D5B7',
  borderColor: '#8B6914',
  borderWidth: 2,
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
    expect(getByText('Casa')).toBeInTheDocument();
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

describe('Resize drag (F2-U7 functional)', () => {
  beforeEach(() => {
    captured.resizeHandlers = [];
    captured.rotateHandler = null;
    baseProps.onResizeElement = vi.fn();
  });

  test('dragging br resize handle calls onResizeElement with new dimensions', () => {
    // rectElement: x=5,y=5, w=10,h=8, scale=1, baseScale=10 → sx=50,sy=50, br at (100,90)
    const selected = { ...rectElement, isSelected: true };
    render(<PlacedElementsLayer {...baseProps} elements={[selected]} />);

    // 4 handles: tl=0, tr=1, br=2, bl=3
    expect(captured.resizeHandlers.length).toBe(4);
    const brHandler = captured.resizeHandlers[2];
    // drag to (120,110): expected w=12, h=10
    brHandler({ target: { x: () => 120, y: () => 110 } });
    expect(baseProps.onResizeElement).toHaveBeenCalledWith(rectElement.id, expect.objectContaining({
      width: expect.any(Number),
      height: expect.any(Number),
    }));
    const updates = baseProps.onResizeElement.mock.calls[0][1];
    expect(updates.width).toBeCloseTo(12);
    expect(updates.height).toBeCloseTo(10);
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
