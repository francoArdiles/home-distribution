import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ConstraintPanel from '../ConstraintPanel.jsx';

const elements = [
  { id: 'e1', label: 'Casa', definitionId: 'casa' },
  { id: 'e2', label: 'Huerto', definitionId: 'huerto' },
  { id: 'e3', label: 'Árbol Frutal', definitionId: 'arbol_frutal' },
];

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
      elements,
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

  test('renders constraint names derived dynamically from element labels', () => {
    const { getByText } = render(<ConstraintPanel {...props} />);
    // c1: Casa → Límite del terreno (mín. 3m)
    expect(getByText(/Casa → Límite del terreno/)).toBeInTheDocument();
    // c2: Huerto → Árbol Frutal (mín. 4m)
    expect(getByText(/Huerto → Árbol Frutal/)).toBeInTheDocument();
  });

  test('invalid constraint shows red violation indicator', () => {
    const { getAllByTestId } = render(<ConstraintPanel {...props} />);
    expect(getAllByTestId('constraint-violation').length).toBeGreaterThan(0);
  });

  test('valid constraint shows green indicator', () => {
    const { getAllByTestId } = render(<ConstraintPanel {...props} />);
    expect(getAllByTestId('constraint-valid').length).toBeGreaterThan(0);
  });

  test('clicking toggle checkbox calls onToggleConstraint', () => {
    const { getAllByRole } = render(<ConstraintPanel {...props} />);
    const checkboxes = getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(props.onToggleConstraint).toHaveBeenCalledWith(constraints[0].id);
  });

  test('clicking remove button (×) calls onRemoveConstraint with id', () => {
    const { getAllByText } = render(<ConstraintPanel {...props} />);
    const removeButtons = getAllByText('×');
    fireEvent.click(removeButtons[0]);
    expect(props.onRemoveConstraint).toHaveBeenCalledWith(constraints[0].id);
  });

  test('form renders source and target dropdowns', () => {
    const { getByLabelText } = render(<ConstraintPanel {...props} />);
    expect(getByLabelText('Origen')).toBeInTheDocument();
    expect(getByLabelText('Destino')).toBeInTheDocument();
    expect(getByLabelText('Distancia mínima (m)')).toBeInTheDocument();
  });

  test('source dropdown lists all elements', () => {
    const { getByLabelText } = render(<ConstraintPanel {...props} />);
    const select = getByLabelText('Origen');
    const options = Array.from(select.options).map(o => o.value);
    expect(options).toContain('e1');
    expect(options).toContain('e2');
    expect(options).toContain('e3');
  });

  test('target dropdown includes "any" and "terrain" options', () => {
    const { getByLabelText } = render(<ConstraintPanel {...props} />);
    const select = getByLabelText('Destino');
    const options = Array.from(select.options).map(o => o.value);
    expect(options).toContain('terrain');
    expect(options).toContain('any');
  });

  test('submitting form with element source and any target calls onAddConstraint', () => {
    const { getByLabelText, getByTestId } = render(<ConstraintPanel {...props} />);
    fireEvent.change(getByLabelText('Origen'), { target: { value: 'e1' } });
    fireEvent.change(getByLabelText('Destino'), { target: { value: 'any' } });
    fireEvent.change(getByLabelText('Distancia mínima (m)'), { target: { value: '10' } });
    fireEvent.submit(getByTestId('add-constraint-form'));
    expect(props.onAddConstraint).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'e1', targetId: 'any', value: 10 })
    );
  });

  test('submit with no source selected does not call onAddConstraint', () => {
    const { getByText } = render(<ConstraintPanel {...props} />);
    fireEvent.click(getByText('Agregar restricción'));
    expect(props.onAddConstraint).not.toHaveBeenCalled();
  });

  test('"Aplicar predeterminadas" calls onAddConstraint for each default constraint', () => {
    props.elements = [{ id: 'e1', label: 'Casa', definitionId: 'casa' }];
    const { getByText } = render(<ConstraintPanel {...props} />);
    fireEvent.click(getByText('Aplicar predeterminadas'));
    expect(props.onAddConstraint).toHaveBeenCalled();
  });

  test('auto-generated name describes source → target relationship', () => {
    const { getByLabelText, getByTestId } = render(<ConstraintPanel {...props} />);
    fireEvent.change(getByLabelText('Origen'), { target: { value: 'e1' } });
    fireEvent.change(getByLabelText('Destino'), { target: { value: 'any' } });
    fireEvent.change(getByLabelText('Distancia mínima (m)'), { target: { value: '5' } });
    fireEvent.submit(getByTestId('add-constraint-form'));
    const call = props.onAddConstraint.mock.calls[0][0];
    expect(call.name).toMatch(/Casa/);
    expect(call.name).toMatch(/Cualquier/);
  });
});
