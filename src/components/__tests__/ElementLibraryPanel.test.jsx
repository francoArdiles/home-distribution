import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import ElementLibraryPanel from '../ElementLibraryPanel.jsx';
import { elementDefinitions } from '../../data/elementDefinitions.js';
import { categories } from '../../data/categories.js';

describe('ElementLibraryPanel', () => {
  test('only one accordion section can be expanded at a time', () => {
    const { getByText, queryByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    fireEvent.click(getByText(/Hogar/));
    expect(queryByText('Casa', { hidden: true })).toBeInTheDocument();
    fireEvent.click(getByText(/Jardín/));
    expect(queryByText('Casa', { hidden: true })).not.toBeVisible();
    expect(queryByText('Piscina', { hidden: true })).toBeVisible();
  });

  test('each element has a clickable button when section is expanded', () => {
    const { getByText, getAllByRole } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    fireEvent.click(getByText(/Sostenibilidad/));
    const buttons = getAllByRole('button');
    expect(buttons.length).toBe(7);
  });

  test('clicking an element calls onSelectElement with its id', () => {
    const onSelect = vi.fn();
    const { getByText } = render(<ElementLibraryPanel onSelectElement={onSelect} selectedElementType={null} />);
    fireEvent.click(getByText(/Hogar/));
    fireEvent.click(getByText('Casa'));
    expect(onSelect).toHaveBeenCalledWith('casa');
  });

  test('selected element has aria-pressed="true"', () => {
    const { getByText, queryByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType="casa" />);
    fireEvent.click(getByText(/Hogar/));
    expect(queryByText('Casa', { hidden: true })?.closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  test('has heading "Elementos"', () => {
    const { getByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    expect(getByText('Elementos')).toBeInTheDocument();
  });

  test('renders category headers with icon and name', () => {
    const { getByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    expect(getByText(/Hogar/)).toBeInTheDocument();
    expect(getByText(/Jardín/)).toBeInTheDocument();
    expect(getByText(/Animales/)).toBeInTheDocument();
    expect(getByText(/Sostenibilidad/)).toBeInTheDocument();
  });

  test('renders elements grouped under their category when section is expanded', () => {
    const { getByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    fireEvent.click(getByText(/Hogar/));
    expect(getByText('Casa')).toBeInTheDocument();
  });

  test('category sections start collapsed (elements not visible)', () => {
    const { queryByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    expect(queryByText('Casa', { hidden: true })).not.toBeVisible();
    expect(queryByText('Piscina', { hidden: true })).not.toBeVisible();
  });

  test('clicking category header expands section', () => {
    const { getByText, queryByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    fireEvent.click(getByText(/Hogar/));
    expect(queryByText('Casa', { hidden: true })).toBeVisible();
  });

  test('clicking expanded category header collapses section', () => {
    const { getByText, queryByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    fireEvent.click(getByText(/Hogar/));
    expect(queryByText('Casa', { hidden: true })).toBeVisible();
    fireEvent.click(getByText(/Hogar/));
    expect(queryByText('Casa', { hidden: true })).not.toBeVisible();
  });

  test('clicking one category collapses the others (accordion behavior)', () => {
    const { getByText, queryByText } = render(<ElementLibraryPanel onSelectElement={vi.fn()} selectedElementType={null} />);
    fireEvent.click(getByText(/Hogar/));
    expect(queryByText('Casa', { hidden: true })).toBeVisible();
    fireEvent.click(getByText(/Jardín/));
    expect(queryByText('Casa', { hidden: true })).not.toBeVisible();
    expect(queryByText('Piscina', { hidden: true })).toBeVisible();
  });
});