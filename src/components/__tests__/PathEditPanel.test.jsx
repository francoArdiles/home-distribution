import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import PathEditPanel from '../PathEditPanel.jsx';
import { createPath, addPointToPath, finishPath } from '../../utils/pathUtils.js';

const makePath = (id, width = 1) => ({
  ...finishPath(addPointToPath(createPath({ x: 0, y: 0 }, width), { x: 5, y: 0 })),
  id,
});

describe('PathEditPanel', () => {
  test('renders nothing when no path is selected', () => {
    const { container } = render(<PathEditPanel path={null} onDelete={vi.fn()} onUpdate={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows the path label', () => {
    const path = { ...makePath('p1'), label: 'Camino sur' };
    const { getByText } = render(<PathEditPanel path={path} onDelete={vi.fn()} onUpdate={vi.fn()} />);
    expect(getByText(/Camino sur/)).toBeInTheDocument();
  });

  test('shows total path length', () => {
    const path = makePath('p1'); // 5m
    const { getByTestId } = render(<PathEditPanel path={path} onDelete={vi.fn()} onUpdate={vi.fn()} />);
    expect(getByTestId('path-length').textContent).toMatch(/5\.00m/);
  });

  test('width input reflects current path width', () => {
    const path = makePath('p1', 2.5);
    const { getByTestId } = render(<PathEditPanel path={path} onDelete={vi.fn()} onUpdate={vi.fn()} />);
    expect(Number(getByTestId('path-width-input').value)).toBe(2.5);
  });

  test('changing width calls onUpdate with new width', () => {
    const onUpdate = vi.fn();
    const path = makePath('p1', 1);
    const { getByTestId } = render(<PathEditPanel path={path} onDelete={onUpdate} onUpdate={onUpdate} />);
    fireEvent.change(getByTestId('path-width-input'), { target: { value: '3' } });
    expect(onUpdate).toHaveBeenCalledWith('p1', { width: 3 });
  });

  test('delete button calls onDelete with path id', () => {
    const onDelete = vi.fn();
    const path = makePath('p1');
    const { getByTestId } = render(<PathEditPanel path={path} onDelete={onDelete} onUpdate={vi.fn()} />);
    fireEvent.click(getByTestId('path-delete-btn'));
    expect(onDelete).toHaveBeenCalledWith('p1');
  });
});
