import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import PlacedElementsLayer from '../PlacedElementsLayer.jsx';

vi.mock('react-konva', () => {
  const Stage = React.forwardRef(({ children, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({ getPointerPosition: () => ({ x: 0, y: 0 }) }));
    return <div data-testid="konva-stage" {...props}>{children}</div>;
  });
  return {
    Stage,
    Layer: ({ children }) => <div data-testid="konva-layer">{children}</div>,
    Rect: ({ stroke, ...props }) => (
      <div data-testid="konva-rect" data-stroke={stroke} {...props} />
    ),
    Circle: ({ stroke, ...props }) => {
      const testId = props['data-testid'] || 'konva-circle-element';
      return <div data-testid={testId} data-stroke={stroke} {...props} />;
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

describe('F4-U9: violatingIds prop in PlacedElementsLayer', () => {
  test('element with violatingIds set has red stroke', () => {
    const { getAllByTestId } = render(
      <PlacedElementsLayer
        {...baseProps}
        elements={[rectElement]}
        violatingIds={new Set(['el-1'])}
      />
    );
    const rect = getAllByTestId('konva-rect')[0];
    expect(rect.getAttribute('data-stroke')).toBe('#F44336');
  });

  test('element without violatingIds has normal stroke', () => {
    const { getAllByTestId } = render(
      <PlacedElementsLayer
        {...baseProps}
        elements={[rectElement]}
        violatingIds={new Set()}
      />
    );
    const rect = getAllByTestId('konva-rect')[0];
    expect(rect.getAttribute('data-stroke')).toBe(rectElement.borderColor);
  });

  test('violation stroke overrides selection stroke', () => {
    const selected = { ...rectElement, isSelected: true };
    const { getAllByTestId } = render(
      <PlacedElementsLayer
        {...baseProps}
        elements={[selected]}
        violatingIds={new Set(['el-1'])}
      />
    );
    const rect = getAllByTestId('konva-rect')[0];
    expect(rect.getAttribute('data-stroke')).toBe('#F44336');
  });
});
