import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import FloatingPanel from '../FloatingPanel.jsx';

describe('FloatingPanel — rendering', () => {
  test('renders title', () => {
    render(<FloatingPanel title="Mi Panel"><p>contenido</p></FloatingPanel>);
    expect(screen.getByText('Mi Panel')).toBeInTheDocument();
  });

  test('renders children', () => {
    render(<FloatingPanel title="P"><span>hola</span></FloatingPanel>);
    expect(screen.getByText('hola')).toBeInTheDocument();
  });

  test('renders close button when onClose provided', () => {
    render(<FloatingPanel title="P" onClose={vi.fn()}><div /></FloatingPanel>);
    expect(screen.getByLabelText('Cerrar')).toBeInTheDocument();
  });

  test('does not render close button when onClose omitted', () => {
    render(<FloatingPanel title="P"><div /></FloatingPanel>);
    expect(screen.queryByLabelText('Cerrar')).not.toBeInTheDocument();
  });
});

describe('FloatingPanel — resize handle', () => {
  test('renders resize handle', () => {
    render(<FloatingPanel title="P"><div /></FloatingPanel>);
    expect(screen.getByTestId('floating-panel-resize')).toBeInTheDocument();
  });

  test('resize handle has resize cursor style', () => {
    render(<FloatingPanel title="P"><div /></FloatingPanel>);
    const handle = screen.getByTestId('floating-panel-resize');
    expect(handle).toHaveStyle({ cursor: 'se-resize' });
  });

  test('panel has explicit width and height after resize drag', () => {
    render(<FloatingPanel title="P" initialSize={{ w: 300, h: 200 }}><div /></FloatingPanel>);
    const panel = screen.getByTestId('floating-panel-container');
    const handle = screen.getByTestId('floating-panel-resize');

    // Start drag at (500, 400), move to (550, 450) → +50w +50h
    fireEvent.mouseDown(handle, { clientX: 500, clientY: 400 });
    fireEvent.mouseMove(window, { clientX: 550, clientY: 450 });
    fireEvent.mouseUp(window);

    const style = panel.getAttribute('style');
    // Width should have grown by ~50px
    expect(style).toMatch(/width:/);
    expect(style).toMatch(/height:/);
  });

  test('panel size does not go below minimum width (200px)', () => {
    render(<FloatingPanel title="P" initialSize={{ w: 300, h: 200 }}><div /></FloatingPanel>);
    const panel = screen.getByTestId('floating-panel-container');
    const handle = screen.getByTestId('floating-panel-resize');

    // Drag far left to try to shrink below minimum
    fireEvent.mouseDown(handle, { clientX: 500, clientY: 400 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 400 });
    fireEvent.mouseUp(window);

    const styleAttr = panel.getAttribute('style');
    const widthMatch = styleAttr.match(/width:\s*([\d.]+)px/);
    expect(widthMatch).not.toBeNull();
    expect(parseFloat(widthMatch[1])).toBeGreaterThanOrEqual(200);
  });

  test('panel size does not go below minimum height (150px)', () => {
    render(<FloatingPanel title="P" initialSize={{ w: 300, h: 200 }}><div /></FloatingPanel>);
    const panel = screen.getByTestId('floating-panel-container');
    const handle = screen.getByTestId('floating-panel-resize');

    fireEvent.mouseDown(handle, { clientX: 500, clientY: 400 });
    fireEvent.mouseMove(window, { clientX: 500, clientY: 100 });
    fireEvent.mouseUp(window);

    const styleAttr = panel.getAttribute('style');
    const heightMatch = styleAttr.match(/height:\s*([\d.]+)px/);
    expect(heightMatch).not.toBeNull();
    expect(parseFloat(heightMatch[1])).toBeGreaterThanOrEqual(150);
  });

  test('resize stops after mouseUp (no further movement changes size)', () => {
    render(<FloatingPanel title="P" initialSize={{ w: 300, h: 200 }}><div /></FloatingPanel>);
    const panel = screen.getByTestId('floating-panel-container');
    const handle = screen.getByTestId('floating-panel-resize');

    fireEvent.mouseDown(handle, { clientX: 500, clientY: 400 });
    fireEvent.mouseMove(window, { clientX: 550, clientY: 450 });
    fireEvent.mouseUp(window);

    const styleAfterRelease = panel.getAttribute('style');

    // Move again after mouseUp — size should not change
    fireEvent.mouseMove(window, { clientX: 700, clientY: 700 });
    expect(panel.getAttribute('style')).toBe(styleAfterRelease);
  });
});

describe('FloatingPanel — close callback', () => {
  test('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<FloatingPanel title="P" onClose={onClose}><div /></FloatingPanel>);
    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
