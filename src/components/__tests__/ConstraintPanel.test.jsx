import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ConstraintPanel from '../ConstraintPanel.jsx';

const constraints = [
  { id: 'c1', name: 'Casa al límite', value: 3, type: 'min-distance', sourceId: 'e1', targetId: 'terrain', enabled: true },
  { id: 'c2', name: 'Árbol a árbol', value: 4, type: 'min-distance', sourceId: 'e2', targetId: 'e3', enabled: true },
];

const validationResults = [
  { constraint: constraints[0], valid: false, actualDistance: 1, requiredDistance: 3 },
  { constraint: constraints[1], valid: true, actualDistance: 5, requiredDistance: 4 },
];

describe('ConstraintPanel', () => {
  let props;
  beforeEach(() => {
    props = {
      constraints,
      elements: [],
      onAddConstraint: vi.fn(),
      onRemoveConstraint: vi.fn(),
      onToggleConstraint: vi.fn(),
      validationResults,
    };
  });

  test('renders heading "Restricciones"', () => {
    const { getByText } = render(<ConstraintPanel {...props} />);
    expect(getByText('Restricciones')).toBeInTheDocument();
  });

  test('renders constraint names and values', () => {
    const { getByText } = render(<ConstraintPanel {...props} />);
    expect(getByText(/Casa al límite/)).toBeInTheDocument();
    expect(getByText(/Árbol a árbol/)).toBeInTheDocument();
  });

  test('invalid constraint shows red violation indicator', () => {
    const { getAllByTestId } = render(<ConstraintPanel {...props} />);
    const violations = getAllByTestId('constraint-violation');
    expect(violations.length).toBeGreaterThan(0);
  });

  test('valid constraint shows green indicator', () => {
    const { getAllByTestId } = render(<ConstraintPanel {...props} />);
    const valid = getAllByTestId('constraint-valid');
    expect(valid.length).toBeGreaterThan(0);
  });

  test('clicking toggle checkbox calls onToggleConstraint', () => {
    const { getAllByRole } = render(<ConstraintPanel {...props} />);
    const checkboxes = getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(props.onToggleConstraint).toHaveBeenCalledWith(constraints[0].id);
  });

  test('clicking remove button calls onRemoveConstraint with id', () => {
    const { getAllByText } = render(<ConstraintPanel {...props} />);
    const removeButtons = getAllByText('Eliminar');
    fireEvent.click(removeButtons[0]);
    expect(props.onRemoveConstraint).toHaveBeenCalledWith(constraints[0].id);
  });

  test('form for adding new constraint', () => {
    const { getByLabelText } = render(<ConstraintPanel {...props} />);
    expect(getByLabelText('Nombre')).toBeInTheDocument();
    expect(getByLabelText('Valor mínimo (m)')).toBeInTheDocument();
  });

  test('submit form calls onAddConstraint', () => {
    const { getByLabelText, getByText } = render(<ConstraintPanel {...props} />);
    fireEvent.change(getByLabelText('Nombre'), { target: { value: 'Test' } });
    fireEvent.change(getByLabelText('Valor mínimo (m)'), { target: { value: '2' } });
    fireEvent.click(getByText('Agregar'));
    expect(props.onAddConstraint).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test', value: 2 })
    );
  });

  test('"Aplicar predeterminadas" button calls onAddConstraint for each default', () => {
    const { getByText } = render(<ConstraintPanel {...props} />);
    fireEvent.click(getByText('Aplicar predeterminadas'));
    expect(props.onAddConstraint).toHaveBeenCalled();
  });
});
