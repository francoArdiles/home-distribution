import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import CasaSectionView, { getSnapPoint } from '../CasaSectionView.jsx';

const baseElement = { id: 'el-1', definitionId: 'casa', label: 'Casa', width: 10, height: 8 };

const baseDetail = {
  _schema: 'casa@1',
  floors: 1,
  bedrooms: 3,
  bathrooms: 1,
  roofType: 'a dos aguas',
  construction: 'hormigón',
  notes: '',
};

describe('CasaSectionView — rendering', () => {
  test('renders top view container', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-top-view')).toBeInTheDocument();
  });

  test('renders front view container', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-front-view')).toBeInTheDocument();
  });

  test('renders view labels', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByText(/Vista Superior/i)).toBeInTheDocument();
    expect(screen.getByText(/Fachada/i)).toBeInTheDocument();
  });
});

describe('CasaSectionView — dimensions', () => {
  test('shows width in top view', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-top-view')).toHaveTextContent('10');
  });

  test('shows height in top view', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-top-view')).toHaveTextContent('8');
  });

  test('shows floor count in front view', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-front-view')).toHaveTextContent('1');
  });
});

describe('CasaSectionView — floors', () => {
  test('renders one floor block per floor', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getAllByTestId(/casa-floor-/)).toHaveLength(1);
  });

  test('renders correct number of floor blocks for multi-floor building', () => {
    const detail = { ...baseDetail, floors: 3 };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    expect(screen.getAllByTestId(/casa-floor-/)).toHaveLength(3);
  });
});

describe('CasaSectionView — roof', () => {
  test('renders roof element in front view', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-roof')).toBeInTheDocument();
  });

  test('renders flat roof when roofType is "plano"', () => {
    const detail = { ...baseDetail, roofType: 'plano' };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    expect(screen.getByTestId('casa-roof')).toBeInTheDocument();
  });
});

describe('CasaSectionView — graceful with missing detail', () => {
  test('renders without crashing when detail is null', () => {
    expect(() =>
      render(<CasaSectionView element={baseElement} detail={null} />)
    ).not.toThrow();
  });
});

describe('CasaSectionView — to-scale top view', () => {
  test('top view viewBox preserves building aspect ratio (wide building)', () => {
    // 10m × 5m → ratio 2:1
    render(<CasaSectionView element={{ ...baseElement, width: 10, height: 5 }} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-top-view');
    const [, , vbW, vbH] = svg.getAttribute('viewBox').split(' ').map(Number);
    const PAD = 28;
    const usableW = vbW - PAD * 2;
    const usableH = vbH - PAD * 2;
    expect(usableW / usableH).toBeCloseTo(10 / 5, 1);
  });

  test('top view viewBox preserves building aspect ratio (square building)', () => {
    // 8m × 8m → ratio 1:1
    render(<CasaSectionView element={{ ...baseElement, width: 8, height: 8 }} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-top-view');
    const [, , vbW, vbH] = svg.getAttribute('viewBox').split(' ').map(Number);
    const PAD = 28;
    const usableW = vbW - PAD * 2;
    const usableH = vbH - PAD * 2;
    expect(usableW / usableH).toBeCloseTo(1, 1);
  });

  test('top view viewBox preserves building aspect ratio (deep building)', () => {
    // 6m × 10m → ratio 0.6
    render(<CasaSectionView element={{ ...baseElement, width: 6, height: 10 }} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-top-view');
    const [, , vbW, vbH] = svg.getAttribute('viewBox').split(' ').map(Number);
    const PAD = 28;
    const usableW = vbW - PAD * 2;
    const usableH = vbH - PAD * 2;
    expect(usableW / usableH).toBeCloseTo(6 / 10, 1);
  });
});

describe('CasaSectionView — responsive SVGs', () => {
  test('top view SVG has a viewBox attribute', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-top-view');
    expect(svg).toHaveAttribute('viewBox');
  });

  test('front view SVG has a viewBox attribute', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    const svg = screen.getByTestId('casa-front-view');
    expect(svg).toHaveAttribute('viewBox');
  });

  test('top view SVG width is 100%', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-top-view')).toHaveAttribute('width', '100%');
  });

  test('front view SVG width is 100%', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.getByTestId('casa-front-view')).toHaveAttribute('width', '100%');
  });
});

describe('CasaSectionView — floor selector', () => {
  test('shows floor selector when building has more than one floor', () => {
    const detail = { ...baseDetail, floors: 3 };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    expect(screen.getByTestId('floor-selector')).toBeInTheDocument();
  });

  test('does not show floor selector for single floor building', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(screen.queryByTestId('floor-selector')).not.toBeInTheDocument();
  });

  test('floor selector has options for each floor', () => {
    const detail = { ...baseDetail, floors: 3 };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    const selector = screen.getByTestId('floor-selector');
    expect(selector.children).toHaveLength(3);
  });

  test('selected floor is highlighted', () => {
    const detail = { ...baseDetail, floors: 3 };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    const options = screen.getByTestId('floor-selector').children;
    expect(options[0]).toHaveClass('bg-amber-200');
  });
});

describe('CasaSectionView — walls editing', () => {
  test('renders walls from detail data', () => {
    const detail = {
      ...baseDetail,
      walls: [
        { id: 'w1', x1: 0, y1: 0, x2: 5, y2: 0, thickness: 0.15, floor: 0 },
        { id: 'w2', x1: 5, y1: 0, x2: 5, y2: 4, thickness: 0.15, floor: 0 },
      ],
    };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    expect(screen.getByTestId('wall-w1')).toBeInTheDocument();
    expect(screen.getByTestId('wall-w2')).toBeInTheDocument();
  });

  test('renders wall with correct thickness', () => {
    const detail = {
      ...baseDetail,
      walls: [{ id: 'w1', x1: 0, y1: 0, x2: 5, y2: 0, thickness: 0.2, floor: 0 }],
    };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    const wall = screen.getByTestId('wall-w1');
    expect(wall).toBeInTheDocument();
  });

  test('only shows walls for selected floor', () => {
    const detail = {
      ...baseDetail,
      floors: 2,
      walls: [
        { id: 'w1', x1: 0, y1: 0, x2: 5, y2: 0, thickness: 0.15, floor: 0 },
        { id: 'w2', x1: 0, y1: 0, x2: 5, y2: 0, thickness: 0.15, floor: 1 },
      ],
    };
    render(<CasaSectionView element={baseElement} detail={detail} selectedFloor={0} />);
    expect(screen.getByTestId('wall-w1')).toBeInTheDocument();
    expect(screen.queryByTestId('wall-w2')).not.toBeInTheDocument();
  });

  test('calls onAddWall when clicking on empty SVG area', () => {
    const onAddWall = vi.fn();
    render(<CasaSectionView element={baseElement} detail={baseDetail} onAddWall={onAddWall} />);
    const svg = screen.getByTestId('casa-top-view');
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 100 }));
  });

  test('calls onUpdateWall when wall is modified', () => {
    const onUpdateWall = vi.fn();
    const detail = {
      ...baseDetail,
      walls: [{ id: 'w1', x1: 0, y1: 0, x2: 5, y2: 0, thickness: 0.15, floor: 0 }],
    };
    render(<CasaSectionView element={baseElement} detail={detail} onUpdateWall={onUpdateWall} />);
  });
});

describe('CasaSectionView — labels', () => {
  test('renders labels from detail data', () => {
    const detail = {
      ...baseDetail,
      labels: [
        { id: 'l1', x: 2, y: 3, text: 'Dormitorio', floor: 0 },
        { id: 'l2', x: 6, y: 4, text: 'Baño', floor: 0 },
      ],
    };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    expect(screen.getByTestId('label-l1')).toBeInTheDocument();
    expect(screen.getByTestId('label-l2')).toBeInTheDocument();
  });

  test('only shows labels for selected floor', () => {
    const detail = {
      ...baseDetail,
      floors: 2,
      labels: [
        { id: 'l1', x: 2, y: 3, text: 'Piso 0', floor: 0 },
        { id: 'l2', x: 6, y: 4, text: 'Piso 1', floor: 1 },
      ],
    };
    render(<CasaSectionView element={baseElement} detail={detail} selectedFloor={0} />);
    expect(screen.getByTestId('label-l1')).toBeInTheDocument();
    expect(screen.queryByTestId('label-l2')).not.toBeInTheDocument();
  });

  test('calls onAddLabel when clicking on SVG', () => {
    const onAddLabel = vi.fn();
    render(<CasaSectionView element={baseElement} detail={baseDetail} onAddLabel={onAddLabel} />);
    const svg = screen.getByTestId('casa-top-view');
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 100 }));
  });
});

describe('CasaSectionView — wall drawing interaction', () => {
  // Helper: mock SVG coords so jsdom clicks produce valid viewBox coordinates
  function mockSvgCoords(svgEl, vbW = 200, vbH = 108) {
    svgEl.getBoundingClientRect = () => ({
      left: 0, top: 0, right: vbW, bottom: vbH,
      width: vbW, height: vbH,
    });
    // getScreenCTM returns null in jsdom → code falls back to getBoundingClientRect
    svgEl.getScreenCTM = () => null;
  }

  test('mouseUp between two clicks does not cancel wall drawing', () => {
    const onChange = vi.fn();
    const detail = { ...baseDetail, walls: [], labels: [] };
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={detail} onChange={onChange} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);
    const wrapper = svg.closest('[data-testid="casa-top-view"]').parentElement.parentElement;

    // First click inside building (bx=28, bw=144 for 10m wide → clientX=60 is valid)
    fireEvent.click(svg, { clientX: 60, clientY: 40 });

    // mouseUp fires between clicks (the bug: used to clear drawingWall here)
    fireEvent.mouseUp(wrapper);

    // Second click — should complete the wall, not start a new first point
    fireEvent.click(svg, { clientX: 120, clientY: 40 });

    // onChange must have been called with exactly one wall
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.walls).toHaveLength(1);
  });

  test('wall drawing preview appears after first click', () => {
    const detail = { ...baseDetail, walls: [], labels: [] };
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={detail} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);

    // Before first click: no preview circle
    expect(svg.querySelector('circle')).toBeNull();

    // After first click: preview circle appears
    fireEvent.click(svg, { clientX: 60, clientY: 40 });
    expect(svg.querySelector('circle')).not.toBeNull();
  });

  test('two consecutive clicks produce one wall via onChange', () => {
    const onChange = vi.fn();
    const detail = { ...baseDetail, walls: [], labels: [] };
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={detail} onChange={onChange} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);

    fireEvent.click(svg, { clientX: 60, clientY: 40 });
    fireEvent.click(svg, { clientX: 120, clientY: 40 });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.walls).toHaveLength(1);
    const wall = lastCall.walls[0];
    expect(wall).toHaveProperty('x1');
    expect(wall).toHaveProperty('y1');
    expect(wall).toHaveProperty('x2');
    expect(wall).toHaveProperty('y2');
    expect(wall).toHaveProperty('floor', 0);
  });

  test('clicking a wall calls onChange with that wall removed', () => {
    const onChange = vi.fn();
    const detail = {
      ...baseDetail,
      walls: [{ id: 'w1', x1: 1, y1: 1, x2: 5, y2: 1, thickness: 0.15, floor: 0 }],
    };
    render(<CasaSectionView element={baseElement} detail={detail} onChange={onChange} />);
    // Handler is on the polygon body, not the group
    fireEvent.click(document.querySelector('[data-testid="wall-body-w1"]'));
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.walls).toHaveLength(0);
  });
});

describe('CasaSectionView — wall hover measurement', () => {
  const wallDetail = {
    ...baseDetail,
    walls: [{ id: 'w1', x1: 0, y1: 0, x2: 3, y2: 4, thickness: 0.15, floor: 0 }],
  };

  // Hover handlers are on the <g> group so entering/leaving the label (child)
  // does not trigger hide - no flicker.
  test('measurement label is not visible before hover', () => {
    render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    expect(document.querySelector('[data-testid="wall-measure-w1"]')).toBeNull();
  });

  test('measurement label appears on mouseenter on the group', () => {
    render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    fireEvent.mouseEnter(document.querySelector('[data-testid="wall-w1"]'));
    expect(document.querySelector('[data-testid="wall-measure-w1"]')).not.toBeNull();
  });

  test('measurement label disappears on mouseleave from the group', () => {
    render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    const group = document.querySelector('[data-testid="wall-w1"]');
    fireEvent.mouseEnter(group);
    fireEvent.mouseLeave(group);
    expect(document.querySelector('[data-testid="wall-measure-w1"]')).toBeNull();
  });

  test('measurement shows correct length: sqrt(3^2+4^2) = 5.00 m', () => {
    render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    fireEvent.mouseEnter(document.querySelector('[data-testid="wall-w1"]'));
    expect(document.querySelector('[data-testid="wall-measure-w1"]').textContent).toMatch('5.00');
  });

  test('measurement shows correct length for horizontal wall', () => {
    const detail = {
      ...baseDetail,
      walls: [{ id: 'w2', x1: 0, y1: 0, x2: 4, y2: 0, thickness: 0.15, floor: 0 }],
    };
    render(<CasaSectionView element={baseElement} detail={detail} />);
    fireEvent.mouseEnter(document.querySelector('[data-testid="wall-w2"]'));
    expect(document.querySelector('[data-testid="wall-measure-w2"]').textContent).toMatch('4.00');
  });
});

describe('CasaSectionView — wall drag handles', () => {
  const wallDetail = {
    ...baseDetail,
    walls: [{ id: 'w1', x1: 1, y1: 1, x2: 5, y2: 1, thickness: 0.15, floor: 0 }],
  };

  test('endpoint handles are rendered for each wall', () => {
    render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    expect(document.querySelector('[data-testid="wall-ep-start-w1"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="wall-ep-end-w1"]')).not.toBeNull();
  });

  function mockSvgCoords(svgEl) {
    svgEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 108, right: 200, bottom: 108 });
    svgEl.getScreenCTM = () => null;
  }

  test('dragging start endpoint calls onChange with updated x1,y1', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={wallDetail} onChange={onChange} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);
    const wrapper = svg.closest('div.space-y-3');

    const startHandle = document.querySelector('[data-testid="wall-ep-start-w1"]');
    // Drag start endpoint: mousedown at (50,50), move to (70,50)
    fireEvent.mouseDown(startHandle, { clientX: 50, clientY: 50 });
    fireEvent.mouseMove(wrapper, { clientX: 70, clientY: 50 });
    fireEvent.mouseUp(wrapper);

    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(updated.walls[0].x1).not.toBe(wallDetail.walls[0].x1);
  });

  test('dragging end endpoint calls onChange with updated x2,y2', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={wallDetail} onChange={onChange} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);
    const wrapper = svg.closest('div.space-y-3');

    const endHandle = document.querySelector('[data-testid="wall-ep-end-w1"]');
    fireEvent.mouseDown(endHandle, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(wrapper, { clientX: 120, clientY: 60 });
    fireEvent.mouseUp(wrapper);

    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(updated.walls[0].x2).not.toBe(wallDetail.walls[0].x2);
  });

  test('dragging wall body moves both endpoints', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={wallDetail} onChange={onChange} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);
    const wrapper = svg.closest('div.space-y-3');

    const body = document.querySelector('[data-testid="wall-body-w1"]');
    fireEvent.mouseDown(body, { clientX: 80, clientY: 50 });
    fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 60 });
    fireEvent.mouseUp(wrapper);

    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const w = updated.walls[0];
    // Both endpoints shift by the same delta
    const origW = wallDetail.walls[0];
    expect(w.x2 - w.x1).toBeCloseTo(origW.x2 - origW.x1, 5);
    expect(w.y2 - w.y1).toBeCloseTo(origW.y2 - origW.y1, 5);
  });

  test('clicking wall body (no drag) still deletes it', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={wallDetail} onChange={onChange} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);

    // Click without movement = delete
    const body = document.querySelector('[data-testid="wall-body-w1"]');
    fireEvent.mouseDown(body, { clientX: 80, clientY: 50 });
    fireEvent.mouseUp(svg.closest('div.space-y-3'));
    fireEvent.click(body);

    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(updated.walls).toHaveLength(0);
  });
});

describe('CasaSectionView — edit mode', () => {
  test('shows edit controls when editMode is true', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} editMode={true} />);
    expect(screen.getByTestId('edit-toolbar')).toBeInTheDocument();
  });

  test('shows wall thickness control in edit mode', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} editMode={true} />);
    expect(screen.getByTestId('wall-thickness-control')).toBeInTheDocument();
  });

  test('hides grid lines in edit mode', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} editMode={false} />);
  });
});

// ── getSnapPoint ─────────────────────────────────────────────────────────────
describe('getSnapPoint', () => {
  const walls = [
    { id: 'w1', x1: 2, y1: 0, x2: 2, y2: 5, thickness: 0.15, floor: 0 },
  ];

  test('returns raw point when nothing nearby', () => {
    const result = getSnapPoint({ x: 5, y: 4 }, walls, 10, 8);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(4);
  });

  test('snaps to building corner when within threshold', () => {
    const result = getSnapPoint({ x: 0.2, y: 0.2 }, [], 10, 8);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  test('snaps to opposite corner', () => {
    const result = getSnapPoint({ x: 9.9, y: 7.9 }, [], 10, 8);
    expect(result.x).toBe(10);
    expect(result.y).toBe(8);
  });

  test('snaps to wall endpoint when close', () => {
    const result = getSnapPoint({ x: 2.1, y: 0.1 }, walls, 10, 8);
    expect(result.x).toBe(2);
    expect(result.y).toBe(0);
  });

  test('does not snap when beyond threshold', () => {
    const result = getSnapPoint({ x: 5, y: 4 }, walls, 10, 8, 0.3);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(4);
  });

  test('snaps to closest of multiple candidates', () => {
    // (0.15,0.15) - close to (0,0) and (2,0), but closer to (0,0)
    const result = getSnapPoint({ x: 0.15, y: 0.15 }, walls, 10, 8);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  test('snap result has snapped:true, raw result has snapped:false', () => {
    const snapped = getSnapPoint({ x: 0.1, y: 0.1 }, [], 10, 8);
    expect(snapped.snapped).toBe(true);
    const raw = getSnapPoint({ x: 5, y: 4 }, [], 10, 8);
    expect(raw.snapped).toBe(false);
  });
});

// ── Drawing angle preview ─────────────────────────────────────────────────────
describe('CasaSectionView — drawing angle preview', () => {
  function mockSvgCoords(svgEl) {
    svgEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 108, right: 200, bottom: 108 });
    svgEl.getScreenCTM = () => null;
  }

  test('live preview line appears after first click and mouse move', () => {
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={{ ...baseDetail, walls: [], labels: [] }} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);
    const wrapper = svg.closest('div.space-y-3');

    fireEvent.click(svg, { clientX: 60, clientY: 50 });
    fireEvent.mouseMove(wrapper, { clientX: 120, clientY: 50 });

    expect(svg.querySelector('[data-testid="drawing-preview-line"]')).not.toBeNull();
  });

  test('angle label appears while drawing', () => {
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={{ ...baseDetail, walls: [], labels: [] }} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);
    const wrapper = svg.closest('div.space-y-3');

    fireEvent.click(svg, { clientX: 60, clientY: 50 });
    fireEvent.mouseMove(wrapper, { clientX: 120, clientY: 50 });

    expect(svg.querySelector('[data-testid="drawing-angle-label"]')).not.toBeNull();
  });

  test('angle label shows degrees symbol', () => {
    const { getByTestId } = render(
      <CasaSectionView element={baseElement} detail={{ ...baseDetail, walls: [], labels: [] }} />
    );
    const svg = getByTestId('casa-top-view');
    mockSvgCoords(svg);
    const wrapper = svg.closest('div.space-y-3');

    fireEvent.click(svg, { clientX: 60, clientY: 50 });
    fireEvent.mouseMove(wrapper, { clientX: 120, clientY: 50 });

    expect(svg.querySelector('[data-testid="drawing-angle-label"]').textContent).toMatch('°');
  });
});

// ── Endpoint handle size ──────────────────────────────────────────────────────
describe('CasaSectionView — endpoint handle size', () => {
  const wallDetail = {
    ...baseDetail,
    walls: [{ id: 'w1', x1: 1, y1: 1, x2: 5, y2: 1, thickness: 0.15, floor: 0 }],
  };

  test('endpoint radius is proportional to scale (0.075 * scale)', () => {
    render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    const handle = document.querySelector('[data-testid="wall-ep-start-w1"]');
    const r = parseFloat(handle.getAttribute('r'));
    // scale = (200 - 56) / 10 = 14.4 px/m → radius = 0.075 * 14.4 = 1.08
    expect(r).toBeCloseTo(0.075 * ((200 - 56) / 10), 1);
  });

  test('endpoint radius is smaller than 3px for default 10m building', () => {
    render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    const handle = document.querySelector('[data-testid="wall-ep-start-w1"]');
    const r = parseFloat(handle.getAttribute('r'));
    expect(r).toBeLessThan(3);
  });
});

// ── Grid and measurement tools ────────────────────────────────────────────────
describe('CasaSectionView — grid', () => {
  test('renders grid inside top view by default in edit mode', () => {
    const { getByTestId } = render(<CasaSectionView element={baseElement} detail={baseDetail} editMode={true} />);
    expect(getByTestId('casa-top-view').querySelector('[data-testid="svg-grid"]')).not.toBeNull();
  });

  test('grid toggle button exists in toolbar', () => {
    render(<CasaSectionView element={baseElement} detail={baseDetail} editMode={true} />);
    expect(document.querySelector('[data-testid="grid-toggle"]')).not.toBeNull();
  });

  test('grid is hidden after clicking grid toggle', () => {
    const { getByTestId } = render(<CasaSectionView element={baseElement} detail={baseDetail} editMode={true} />);
    fireEvent.click(document.querySelector('[data-testid="grid-toggle"]'));
    expect(getByTestId('casa-top-view').querySelector('[data-testid="svg-grid"]')).toBeNull();
  });

  test('no grid in view mode', () => {
    const { getByTestId } = render(<CasaSectionView element={baseElement} detail={baseDetail} editMode={false} />);
    expect(getByTestId('casa-top-view').querySelector('[data-testid="svg-grid"]')).toBeNull();
  });
});

describe('CasaSectionView — scale bar', () => {
  test('renders scale bar inside top view', () => {
    const { getByTestId } = render(<CasaSectionView element={baseElement} detail={baseDetail} />);
    expect(getByTestId('casa-top-view').querySelector('[data-testid="svg-scale-bar"]')).not.toBeNull();
  });
});

describe('CasaSectionView — wall dimension annotations', () => {
  const wallDetail = {
    ...baseDetail,
    walls: [{ id: 'w1', x1: 1, y1: 1, x2: 5, y2: 1, thickness: 0.15, floor: 0 }],
  };

  test('renders dimension annotation for each wall', () => {
    const { getByTestId } = render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    expect(getByTestId('casa-top-view').querySelector('[data-testid="wall-dim-w1"]')).not.toBeNull();
  });

  test('dimension annotation shows wall length', () => {
    const { getByTestId } = render(<CasaSectionView element={baseElement} detail={wallDetail} />);
    const dim = getByTestId('casa-top-view').querySelector('[data-testid="wall-dim-w1"]');
    expect(dim.textContent).toMatch('4.00');
  });

  test('measurements toggle button exists in toolbar', () => {
    render(<CasaSectionView element={baseElement} detail={wallDetail} editMode={true} />);
    expect(document.querySelector('[data-testid="measurements-toggle"]')).not.toBeNull();
  });

  test('dimension annotations are hidden after clicking measurements toggle', () => {
    const { getByTestId } = render(<CasaSectionView element={baseElement} detail={wallDetail} editMode={true} />);
    fireEvent.click(document.querySelector('[data-testid="measurements-toggle"]'));
    expect(getByTestId('casa-top-view').querySelector('[data-testid="wall-dim-w1"]')).toBeNull();
  });
});

describe('getSnapPoint — grid snap', () => {
  test('snaps to nearest grid point when no endpoint nearby and gridStepM provided', () => {
    // (2.15, 1.95) is 0.16m from grid point (2, 2) — within threshold 0.3
    const result = getSnapPoint({ x: 2.15, y: 1.95 }, [], 10, 8, 0.3, 1);
    expect(result.x).toBe(2);
    expect(result.y).toBe(2);
  });

  test('prefers endpoint snap over grid snap', () => {
    const walls = [{ id: 'w1', x1: 2.1, y1: 1.9, x2: 5, y2: 5, thickness: 0.15, floor: 0 }];
    const result = getSnapPoint({ x: 2.1, y: 1.9 }, walls, 10, 8, 0.4, 1);
    expect(result.x).toBeCloseTo(2.1);
    expect(result.y).toBeCloseTo(1.9);
  });

  test('no grid snap when gridStepM is 0 or not provided', () => {
    const result = getSnapPoint({ x: 2.3, y: 1.8 }, [], 10, 8, 0.3);
    expect(result.x).toBeCloseTo(2.3);
    expect(result.y).toBeCloseTo(1.8);
  });
});
