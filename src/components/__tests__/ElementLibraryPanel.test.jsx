import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import ElementLibraryPanel from '../ElementLibraryPanel.jsx';
import { elementDefinitions } from '../../data/elementDefinitions.js';

describe('ElementLibraryPanel', () => {
  test('renders all 8 element names', () => {
    const { getByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    elementDefinitions.forEach(el => {
      expect(getByText(el.name)).toBeInTheDocument();
    });
  });

  test('each element has a clickable button', () => {
    const { getAllByRole } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    const buttons = getAllByRole('button');
    expect(buttons.length).toBe(8);
  });

  test('clicking an element calls onSelectElement with its id', () => {
    const onSelect = vi.fn();
    const { getByText } = render(<ElementLibraryPanel onSelectElement={onSelect} selectedElementType={null} />);
    fireEvent.click(getByText('Casa'));
    expect(onSelect).toHaveBeenCalledWith('casa');
  });

  test('selected element has aria-pressed="true"', () => {
    const { getByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType="casa" />);
    expect(getByText('Casa').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(getByText('Piscina').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  test('has heading "Elementos"', () => {
    const { getByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    expect(getByText('Elementos')).toBeInTheDocument();
  });
});
