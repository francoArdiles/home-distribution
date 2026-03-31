import React, { useState } from 'react';
import { getDefaultConstraints } from '../utils/constraintUtils.js';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// Human-readable label for a sourceId
const sourceLabel = (sourceId, elements) => {
  if (!sourceId || sourceId === 'any') return 'Cualquier elemento';
  const el = elements.find(e => e.id === sourceId);
  return el ? (el.label || el.definitionId) : sourceId;
};

// Human-readable label for a targetId
const targetLabel = (targetId, elements) => {
  if (targetId === 'terrain') return 'Límite del terreno';
  if (targetId === 'any') return 'Cualquier otro elemento';
  const el = elements.find(e => e.id === targetId);
  return el ? (el.label || el.definitionId) : targetId;
};

const ConstraintPanel = ({
  constraints = [],
  elements = [],
  onAddConstraint,
  onRemoveConstraint,
  onToggleConstraint,
  validationResults = [],
}) => {
  const [formSource, setFormSource] = useState('');     // element id or '' (any)
  const [formTarget, setFormTarget] = useState('terrain');
  const [formValue, setFormValue] = useState('3');

  const getResult = (id) => validationResults.find(r => r.constraint?.id === id);

  const handleSubmit = (e) => {
    e.preventDefault();
    const distance = parseFloat(formValue);
    if (!formValue || isNaN(distance) || distance <= 0) return;
    if (!formSource) return; // source is required

    const srcLabel = sourceLabel(formSource, elements);
    const tgtLabel = targetLabel(formTarget, elements);
    const name = `${srcLabel} → ${tgtLabel} (mín. ${distance}m)`;

    onAddConstraint?.({
      id: generateId(),
      name,
      type: 'min-distance',
      sourceId: formSource,
      targetId: formTarget,
      value: distance,
      enabled: true,
    });
    setFormSource('');
    setFormTarget('terrain');
    setFormValue('3');
  };

  const handleApplyDefaults = () => {
    elements.forEach(el => {
      const defaults = getDefaultConstraints(el.definitionId, el.id);
      defaults.forEach(c => onAddConstraint?.(c));
    });
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div style={{ fontSize: 13 }} onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
      <h3 style={{ marginBottom: 8 }}>Restricciones</h3>

      {/* Constraint list */}
      <ul style={{ listStyle: 'none', padding: 0, marginBottom: 12 }}>
        {constraints.length === 0 && (
          <li style={{ color: '#999', fontStyle: 'italic' }}>Sin restricciones</li>
        )}
        {constraints.map(c => {
          const result = getResult(c.id);
          const isValid = !result || result.valid;
          return (
            <li key={c.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <span
                data-testid={isValid ? 'constraint-valid' : 'constraint-violation'}
                style={{ color: isValid ? '#4CAF50' : '#F44336', fontWeight: 'bold', minWidth: 14 }}
              >
                {isValid ? '✓' : '✗'}
              </span>
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={() => onToggleConstraint?.(c.id)}
                aria-label={`toggle-${c.id}`}
                style={{ marginTop: 2 }}
              />
              <span style={{ flex: 1, opacity: c.enabled ? 1 : 0.5 }}>
                {c.name}
                {result && !result.valid && (
                  <span style={{ color: '#F44336', fontSize: 11, marginLeft: 4 }}>
                    ({result.actualDistance?.toFixed(1)}m / mín. {result.requiredDistance}m)
                  </span>
                )}
              </span>
              <button
                onClick={() => onRemoveConstraint?.(c.id)}
                style={{ fontSize: 11, padding: '1px 5px' }}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {/* Add constraint form */}
      <form onSubmit={handleSubmit} data-testid="add-constraint-form" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong>Nueva restricción</strong>

        {/* Source */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>Origen</span>
          <select
            value={formSource}
            onChange={e => setFormSource(e.target.value)}
            required
            style={{ width: '100%' }}
          >
            <option value="">-- Selecciona un elemento --</option>
            {elements.map(el => (
              <option key={el.id} value={el.id}>
                {el.label || el.definitionId}
              </option>
            ))}
          </select>
        </label>

        {/* Target */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>Destino</span>
          <select
            value={formTarget}
            onChange={e => setFormTarget(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="terrain">Límite del terreno</option>
            <option value="any">Cualquier otro elemento</option>
            {elements
              .filter(el => el.id !== formSource)
              .map(el => (
                <option key={el.id} value={el.id}>
                  {el.label || el.definitionId}
                </option>
              ))}
          </select>
        </label>

        {/* Minimum distance */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>Distancia mínima (m)</span>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={formValue}
            onChange={e => setFormValue(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </label>

        <button type="submit" disabled={!formSource}>Agregar restricción</button>
      </form>

      <button onClick={handleApplyDefaults} style={{ marginTop: 10, width: '100%' }}>
        Aplicar predeterminadas
      </button>
    </div>
  );
};

export default ConstraintPanel;
