import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import PathsLayer from '../PathsLayer.jsx';
import { createPath, addPointToPath, finishPath } from '../../utils/pathUtils.js';

// Capture drag handlers from vertex circles keyed by index
const capturedVertices = {};

vi.mock('react-konva', () => ({
  Layer: ({ children, ...props }) => <div data-testid="konva-layer" {...props}>{children}</div>,
  Line: ({ points, strokeWidth, stroke, ...props }) => (
    <div
      data-testid="path-line"
      data-points={JSON.stringify(points)}
      data-stroke-width={strokeWidth}
      data-stroke={stroke}
      {...props}
    />
  ),
  Circle: ({ onDragMove, onDragEnd, 'data-vertex-index': idx, ...props }) => {
    if (onDragMove !== undefined && idx !== undefined) {
      capturedVertices[idx] = { onDragMove, onDragEnd };
    }
    return <div data-testid="path-vertex" data-vertex-index={idx} {...props} />;
  },
  Text: ({ text, ...props }) => <span data-testid="path-label" {...props}>{text}</span>,
}));

// Helper: build a fake Konva drag event with the given stage coords
const makeDragEvent = (x, y) => ({ target: { x: () => x, y: () => y } });

const baseProps = {
  scale: 1,
  position: { x: 0, y: 0 },
  baseScale: 10,
};

const makePath = (...pts) => {
  let p = createPath(pts[0]);
  for (let i = 1; i < pts.length; i++) p = addPointToPath(p, pts[i]);
  return finishPath(p);
};

describe('PathsLayer — rendering', () => {
  test('renders nothing when paths is empty', () => {
    const { queryAllByTestId } = render(<PathsLayer {...baseProps} paths={[]} />);
    expect(queryAllByTestId('path-line')).toHaveLength(0);
  });

  test('renders a line for each finished path', () => {
    const paths = [
      makePath({ x: 0, y: 0 }, { x: 5, y: 0 }),
      makePath({ x: 0, y: 0 }, { x: 0, y: 3 }, { x: 4, y: 3 }),
    ];
    const { getAllByTestId } = render(<PathsLayer {...baseProps} paths={paths} />);
    expect(getAllByTestId('path-line')).toHaveLength(2);
  });

  test('line stroke-width corresponds to path width in stage pixels', () => {
    // width=2m, baseScale=10, scale=1 → strokeWidth should be 2*10*1=20
    const path = { ...makePath({ x: 0, y: 0 }, { x: 5, y: 0 }), width: 2 };
    const { getByTestId } = render(<PathsLayer {...baseProps} paths={[path]} />);
    expect(Number(getByTestId('path-line').getAttribute('data-stroke-width'))).toBe(20);
  });

  test('line points are converted from meters to stage pixels', () => {
    // (0,0) → (5,0) in meters with baseScale=10, position=(0,0) → (0,0)→(50,0) in stage px
    const path = makePath({ x: 0, y: 0 }, { x: 5, y: 0 });
    const { getByTestId } = render(<PathsLayer {...baseProps} paths={[path]} />);
    const pts = JSON.parse(getByTestId('path-line').getAttribute('data-points'));
    expect(pts).toEqual([0, 0, 50, 0]);
  });

  test('applies stage position offset in point conversion', () => {
    const path = makePath({ x: 0, y: 0 }, { x: 1, y: 0 });
    const { getByTestId } = render(
      <PathsLayer {...baseProps} position={{ x: 100, y: 50 }} paths={[path]} />
    );
    const pts = JSON.parse(getByTestId('path-line').getAttribute('data-points'));
    expect(pts).toEqual([100, 50, 110, 50]);
  });

  test('applies scale in point conversion', () => {
    const path = makePath({ x: 0, y: 0 }, { x: 2, y: 0 });
    const { getByTestId } = render(
      <PathsLayer {...baseProps} scale={2} position={{ x: 0, y: 0 }} paths={[path]} />
    );
    const pts = JSON.parse(getByTestId('path-line').getAttribute('data-points'));
    expect(pts).toEqual([0, 0, 40, 0]);
  });

  test('renders a label with total path length', () => {
    // 3-4-5 right triangle → 5m
    const path = makePath({ x: 0, y: 0 }, { x: 3, y: 4 });
    const { getByTestId } = render(<PathsLayer {...baseProps} paths={[path]} />);
    expect(getByTestId('path-label').textContent).toMatch(/5\.00m/);
  });
});

describe('PathsLayer — selection and deletion', () => {
  test('clicking a path calls onSelectPath with its id', () => {
    const onSelect = vi.fn();
    const path = makePath({ x: 0, y: 0 }, { x: 5, y: 0 });
    const { getByTestId } = render(
      <PathsLayer {...baseProps} paths={[path]} onSelectPath={onSelect} />
    );
    getByTestId('path-line').click();
    expect(onSelect).toHaveBeenCalledWith(path.id);
  });

  test('selected path line has a distinct visual indicator (data-selected)', () => {
    const path = { ...makePath({ x: 0, y: 0 }, { x: 5, y: 0 }), id: 'p1' };
    const { getByTestId } = render(
      <PathsLayer {...baseProps} paths={[path]} selectedPathId="p1" />
    );
    expect(getByTestId('path-line')).toHaveAttribute('data-selected', 'true');
  });

  test('unselected path does not have data-selected', () => {
    const path = makePath({ x: 0, y: 0 }, { x: 5, y: 0 });
    const { getByTestId } = render(
      <PathsLayer {...baseProps} paths={[path]} selectedPathId={null} />
    );
    expect(getByTestId('path-line')).not.toHaveAttribute('data-selected', 'true');
  });

  test('no delete button inside PathsLayer (editing panel is external)', () => {
    const path = { ...makePath({ x: 0, y: 0 }, { x: 5, y: 0 }), id: 'p1' };
    const { queryByTestId } = render(
      <PathsLayer {...baseProps} paths={[path]} selectedPathId="p1" />
    );
    // Edit controls live in PathEditPanel, not inside the Konva layer
    expect(queryByTestId('path-delete-btn')).toBeNull();
  });
});

describe('PathsLayer — draft (in-progress path)', () => {
  test('renders draft path when draftPath prop is provided', () => {
    // Draft has 1 confirmed point + cursor preview
    const draft = createPath({ x: 0, y: 0 });
    const { getAllByTestId } = render(
      <PathsLayer {...baseProps} paths={[]} draftPath={draft} cursorPoint={{ x: 3, y: 4 }} />
    );
    expect(getAllByTestId('path-line')).toHaveLength(1);
  });

  test('draft line includes cursor point as last point', () => {
    const draft = addPointToPath(createPath({ x: 0, y: 0 }), { x: 5, y: 0 });
    const cursorPoint = { x: 5, y: 3 };
    const { getAllByTestId } = render(
      <PathsLayer {...baseProps} paths={[]} draftPath={draft} cursorPoint={cursorPoint} />
    );
    const lines = getAllByTestId('path-line');
    const draftLine = lines[lines.length - 1];
    const pts = JSON.parse(draftLine.getAttribute('data-points'));
    // Last two values should be cursorPoint in stage px: x=50, y=30
    expect(pts[pts.length - 2]).toBe(50);
    expect(pts[pts.length - 1]).toBe(30);
  });

  test('vertex dots are shown for each confirmed draft point', () => {
    let draft = createPath({ x: 0, y: 0 });
    draft = addPointToPath(draft, { x: 2, y: 0 });
    draft = addPointToPath(draft, { x: 2, y: 3 });
    const { getAllByTestId } = render(
      <PathsLayer {...baseProps} paths={[]} draftPath={draft} cursorPoint={{ x: 5, y: 3 }} />
    );
    expect(getAllByTestId('path-vertex').length).toBe(3);
  });

  test('renders no draft when draftPath is null', () => {
    const { queryAllByTestId } = render(
      <PathsLayer {...baseProps} paths={[]} draftPath={null} cursorPoint={null} />
    );
    expect(queryAllByTestId('path-line')).toHaveLength(0);
  });
});

describe('PathsLayer — vertex drag', () => {
  const { act } = require('@testing-library/react');

  test('selected path shows draggable vertex handles', () => {
    const path = { ...makePath({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 3 }), id: 'p1' };
    const { getAllByTestId } = render(
      <PathsLayer {...baseProps} paths={[path]} selectedPathId="p1" onUpdatePath={vi.fn()} />
    );
    const handles = getAllByTestId('path-vertex').filter(
      el => el.getAttribute('data-vertex-index') !== null
    );
    expect(handles).toHaveLength(3);
  });

  test('unselected path shows no vertex handles', () => {
    const path = makePath({ x: 0, y: 0 }, { x: 5, y: 0 });
    const { queryAllByTestId } = render(
      <PathsLayer {...baseProps} paths={[path]} selectedPathId={null} onUpdatePath={vi.fn()} />
    );
    const handles = queryAllByTestId('path-vertex').filter(
      el => el.getAttribute('data-vertex-index') !== null
    );
    expect(handles).toHaveLength(0);
  });

  test('dragging a vertex live-updates the path line points', () => {
    const onUpdatePath = vi.fn();
    const path = { ...makePath({ x: 0, y: 0 }, { x: 5, y: 0 }), id: 'p1' };
    const { getAllByTestId } = render(
      <PathsLayer {...baseProps} paths={[path]} selectedPathId="p1" onUpdatePath={onUpdatePath} />
    );

    // Drag vertex 1 (index 1) to stage coords (80, 30) → meters (8, 3)
    act(() => {
      capturedVertices[1]?.onDragMove(makeDragEvent(80, 30));
    });

    // The line points should reflect the live-updated position
    const linePts = JSON.parse(getAllByTestId('path-line')[0].getAttribute('data-points'));
    // vertex 0 stays at (0,0)→(0,0) stage; vertex 1 moves to (80,30)
    expect(linePts[2]).toBe(80);
    expect(linePts[3]).toBe(30);
  });

  test('drag end commits the new points via onUpdatePath', () => {
    const onUpdatePath = vi.fn();
    const path = { ...makePath({ x: 0, y: 0 }, { x: 5, y: 0 }), id: 'p1' };
    render(
      <PathsLayer {...baseProps} paths={[path]} selectedPathId="p1" onUpdatePath={onUpdatePath} />
    );

    act(() => { capturedVertices[1]?.onDragEnd(makeDragEvent(80, 30)); });

    expect(onUpdatePath).toHaveBeenCalledWith('p1', {
      points: [{ x: 0, y: 0 }, { x: 8, y: 3 }],
    });
  });

  test('drag move does not call onUpdatePath (only drag end does)', () => {
    const onUpdatePath = vi.fn();
    const path = { ...makePath({ x: 0, y: 0 }, { x: 5, y: 0 }), id: 'p1' };
    render(
      <PathsLayer {...baseProps} paths={[path]} selectedPathId="p1" onUpdatePath={onUpdatePath} />
    );

    act(() => { capturedVertices[1]?.onDragMove(makeDragEvent(80, 30)); });

    expect(onUpdatePath).not.toHaveBeenCalled();
  });
});
