import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect } from 'vitest';
import DetailPanel from '../DetailPanel.jsx';
import { getDetailSchema, createDefaultDetail } from '../../utils/detailUtils.js';

const piscinaSchema = getDetailSchema('piscina');
const casaSchema = getDetailSchema('casa');

const piscinaElement = {
  id: 'el-1',
  definitionId: 'piscina',
  label: 'Piscina principal',
  detail: createDefaultDetail('piscina'),
};

const casaElement = {
  id: 'el-2',
  definitionId: 'casa',
  label: 'Casa',
  detail: createDefaultDetail('casa'),
};

const noSchemaElement = {
  id: 'el-3',
  definitionId: 'compost',
  label: 'Compost',
  detail: null,
};

describe('DetailPanel — renders fields from schema', () => {
  test('renders a label for each non-list field', () => {
    const { getByText } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getByText(/Profundidad/)).toBeInTheDocument();
    expect(getByText(/Revestimiento/)).toBeInTheDocument();
  });

  test('renders number input for number fields', () => {
    const { container } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    const numberInputs = container.querySelectorAll('input[type="number"]');
    expect(numberInputs.length).toBeGreaterThan(0);
  });

  test('renders select for select fields', () => {
    const { container } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  test('renders text input for text fields in casa schema', () => {
    const { container } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    const textInputs = container.querySelectorAll('input[type="text"]');
    expect(textInputs.length).toBeGreaterThan(0);
  });

  test('shows element label as title', () => {
    const { getByText } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getByText(/Piscina principal/)).toBeInTheDocument();
  });

  test('shows "Sin detalle disponible" when schema is null', () => {
    const { getByText } = render(
      <DetailPanel element={noSchemaElement} schema={null} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getByText(/Sin detalle disponible/)).toBeInTheDocument();
  });
});

describe('DetailPanel — onChange', () => {
  test('changing a number input calls onChange with updated detail', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={onChange} onClose={vi.fn()} />
    );
    const depthInput = container.querySelector('input[data-field="depth"]');
    fireEvent.change(depthInput, { target: { value: '2.5' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ depth: 2.5, _schema: 'piscina@1' })
    );
  });

  test('changing a select calls onChange with updated detail', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={onChange} onClose={vi.fn()} />
    );
    const liningSelect = container.querySelector('select[data-field="lining"]');
    fireEvent.change(liningSelect, { target: { value: 'azulejo' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ lining: 'azulejo' })
    );
  });

  test('changing a text input calls onChange with updated detail', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={onChange} onClose={vi.fn()} />
    );
    const notesInput = container.querySelector('input[data-field="notes"]');
    fireEvent.change(notesInput, { target: { value: 'Casa principal' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'Casa principal' })
    );
  });
});

describe('DetailPanel — list fields', () => {
  test('renders "Agregar" button for list fields', () => {
    const { getByTestId } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getByTestId('list-add-steps')).toBeInTheDocument();
  });

  test('clicking Agregar calls onChange with a new item appended', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={onChange} onClose={vi.fn()} />
    );
    fireEvent.click(getByTestId('list-add-steps'));
    const called = onChange.mock.calls[0][0];
    expect(called.steps).toHaveLength(1);
  });

  test('renders existing list items', () => {
    const elWithSteps = {
      ...piscinaElement,
      detail: { ...piscinaElement.detail, steps: [{ width: 0.8, depth: 0.3 }, { width: 1.0, depth: 0.3 }] },
    };
    const { getAllByTestId } = render(
      <DetailPanel element={elWithSteps} schema={piscinaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getAllByTestId(/list-item-steps-/)).toHaveLength(2);
  });

  test('clicking delete on a list item calls onChange with item removed', () => {
    const onChange = vi.fn();
    const elWithSteps = {
      ...piscinaElement,
      detail: { ...piscinaElement.detail, steps: [{ width: 0.8, depth: 0.3 }] },
    };
    const { getByTestId } = render(
      <DetailPanel element={elWithSteps} schema={piscinaSchema} onChange={onChange} onClose={vi.fn()} />
    );
    fireEvent.click(getByTestId('list-delete-steps-0'));
    const called = onChange.mock.calls[0][0];
    expect(called.steps).toHaveLength(0);
  });
});

describe('DetailPanel — close', () => {
  test('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={vi.fn()} onClose={onClose} />
    );
    fireEvent.click(getByTestId('detail-panel-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('DetailPanel — two-column layout (casa)', () => {
  test('renders two-column container when schema has layout two-column', () => {
    const { getByTestId } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getByTestId('detail-layout-two-col')).toBeInTheDocument();
  });

  test('renders fields column', () => {
    const { getByTestId } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getByTestId('detail-fields-col')).toBeInTheDocument();
  });

  test('renders views column', () => {
    const { getByTestId } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getByTestId('detail-views-col')).toBeInTheDocument();
  });

  test('piscina does NOT use two-column layout', () => {
    const { queryByTestId } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(queryByTestId('detail-layout-two-col')).not.toBeInTheDocument();
  });
});

describe('DetailPanel — integer number fields (casa)', () => {
  test('floors input has step=1', () => {
    const { container } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    const floorsInput = container.querySelector('input[data-field="floors"]');
    expect(floorsInput).toHaveAttribute('step', '1');
  });

  test('bedrooms input has step=1', () => {
    const { container } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.querySelector('input[data-field="bedrooms"]')).toHaveAttribute('step', '1');
  });

  test('bathrooms input has step=1', () => {
    const { container } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.querySelector('input[data-field="bathrooms"]')).toHaveAttribute('step', '1');
  });

  test('integer field onChange emits an integer value', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DetailPanel element={casaElement} schema={casaSchema} onChange={onChange} onClose={vi.fn()} />
    );
    const floorsInput = container.querySelector('input[data-field="floors"]');
    fireEvent.change(floorsInput, { target: { value: '2' } });
    const newDetail = onChange.mock.calls[0][0];
    expect(Number.isInteger(newDetail.floors)).toBe(true);
    expect(newDetail.floors).toBe(2);
  });

  test('piscina depth input (non-integer) keeps step=0.1', () => {
    const { container } = render(
      <DetailPanel element={piscinaElement} schema={piscinaSchema} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.querySelector('input[data-field="depth"]')).toHaveAttribute('step', '0.1');
  });
});
