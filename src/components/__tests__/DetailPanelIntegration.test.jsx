import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// We test App-level integration by simulating the handlers and state that
// Unit 4 wires up, without mounting the full canvas (Konva doesn't run in jsdom).

import DetailPanel from '../DetailPanel.jsx';
import { getDetailSchema, createDefaultDetail } from '../../utils/detailUtils.js';

// ---------------------------------------------------------------------------
// Helper — simulate the App-level detail handler logic
// ---------------------------------------------------------------------------
function makeDetailState(definitionId) {
  return {
    element: {
      id: 'el-1',
      definitionId,
      label: definitionId === 'piscina' ? 'Piscina' : 'Casa',
      detail: null,
    },
    schema: getDetailSchema(definitionId),
  };
}

describe('Detail panel initializes detail on first open', () => {
  test('detail is null before opening', () => {
    const { element } = makeDetailState('piscina');
    expect(element.detail).toBeNull();
  });

  test('createDefaultDetail produces correct schema tag', () => {
    const detail = createDefaultDetail('piscina');
    expect(detail._schema).toBe('piscina@1');
  });

  test('createDefaultDetail produces correct schema tag for casa', () => {
    const detail = createDefaultDetail('casa');
    expect(detail._schema).toBe('casa@2');
  });
});

describe('DetailPanel wired to App-like onChange', () => {
  test('changing a field calls onChange and updates element detail', () => {
    const onChange = vi.fn();
    const element = {
      id: 'el-1',
      definitionId: 'piscina',
      label: 'Piscina',
      detail: createDefaultDetail('piscina'),
    };
    const schema = getDetailSchema('piscina');

    const { container } = render(
      <DetailPanel element={element} schema={schema} onChange={onChange} onClose={vi.fn()} />
    );

    const depthInput = container.querySelector('input[data-field="depth"]');
    fireEvent.change(depthInput, { target: { value: '3.0' } });

    expect(onChange).toHaveBeenCalledOnce();
    const newDetail = onChange.mock.calls[0][0];
    expect(newDetail.depth).toBe(3.0);
    expect(newDetail._schema).toBe('piscina@1');
  });

  test('detail change includes all existing fields (no data loss)', () => {
    const onChange = vi.fn();
    const element = {
      id: 'el-1',
      definitionId: 'piscina',
      label: 'Piscina',
      detail: { ...createDefaultDetail('piscina'), lining: 'azulejo', heated: true },
    };
    const schema = getDetailSchema('piscina');

    const { container } = render(
      <DetailPanel element={element} schema={schema} onChange={onChange} onClose={vi.fn()} />
    );

    const depthInput = container.querySelector('input[data-field="depth"]');
    fireEvent.change(depthInput, { target: { value: '2.2' } });

    const newDetail = onChange.mock.calls[0][0];
    expect(newDetail.lining).toBe('azulejo');
    expect(newDetail.heated).toBe(true);
    expect(newDetail.depth).toBe(2.2);
  });

  test('undo snapshot before detail change contains old detail', () => {
    // Simulate the pushUndo + setPlacedElements pattern from App
    const snapshots = [];
    const pushUndo = (snap) => snapshots.push(snap);

    const elements = [{
      id: 'el-1', definitionId: 'piscina', label: 'Piscina',
      detail: createDefaultDetail('piscina'),
    }];

    // Simulate handleUpdateElementDetail from App
    const handleUpdateDetail = (id, newDetail) => {
      pushUndo({ placedElements: elements.map(e => ({ ...e })) });
      // (in App this calls setPlacedElements)
    };

    handleUpdateDetail('el-1', { ...elements[0].detail, depth: 4.0 });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].placedElements[0].detail.depth).toBe(1.5); // original default
  });

  test('element without registered schema shows no-detail message', () => {
    const element = { id: 'el-2', definitionId: 'compost', label: 'Compost', detail: null };
    const { getByText } = render(
      <DetailPanel element={element} schema={null} onChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(getByText(/Sin detalle disponible/)).toBeInTheDocument();
  });
});

describe('Detail persistence round-trip', () => {
  test('detail survives JSON serialization', () => {
    const detail = { ...createDefaultDetail('piscina'), depth: 2.8, lining: 'liner' };
    const element = { id: 'el-1', definitionId: 'piscina', detail };
    const json = JSON.stringify(element);
    const restored = JSON.parse(json);
    expect(restored.detail._schema).toBe('piscina@1');
    expect(restored.detail.depth).toBe(2.8);
    expect(restored.detail.lining).toBe('liner');
  });
});
