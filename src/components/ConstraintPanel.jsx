import React, { useState } from 'react';
import { getDefaultConstraints } from '../utils/constraintUtils.js';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const ConstraintPanel = ({
  constraints = [],
  elements = [],
  onAddConstraint,
  onRemoveConstraint,
  onToggleConstraint,
  validationResults = [],
}) => {
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formTarget, setFormTarget] = useState('terrain');

  const getResult = (id) => validationResults.find(r => r.constraint?.id === id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formName || !formValue) return;
    onAddConstraint?.({
      id: generateId(),
      name: formName,
      type: 'min-distance',
      sourceId: formSource || 'any',
      targetId: formTarget,
      value: parseFloat(formValue),
      enabled: true,
    });
    setFormName('');
    setFormValue('');
  };

  const handleApplyDefaults = () => {
    elements.forEach(el => {
      const defaults = getDefaultConstraints(el.definitionId, el.id);
      defaults.forEach(c => onAddConstraint?.(c));
    });
    // If no elements, add a sample set
    if (elements.length === 0) {
      onAddConstraint?.({
        id: generateId(),
        name: 'Distancia predeterminada',
        type: 'min-distance',
        sourceId: 'any',
        targetId: 'terrain',
        value: 3,
        enabled: true,
      });
    }
  };

  return (
    <div>
      <h3>Restricciones</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {constraints.map(c => {
          const result = getResult(c.id);
          const isValid = !result || result.valid;
          return (
            <li key={c.id} style={{ marginBottom: 8 }}>
              {isValid
                ? <span data-testid="constraint-valid" style={{ color: '#4CAF50', marginRight: 4 }}>✓</span>
                : <span data-testid="constraint-violation" style={{ color: '#F44336', marginRight: 4 }}>✗</span>
              }
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={() => onToggleConstraint?.(c.id)}
                aria-label={`toggle-${c.id}`}
              />
              <span style={{ marginLeft: 4 }}>{c.name} ({c.value}m)</span>
              <button onClick={() => onRemoveConstraint?.(c.id)} style={{ marginLeft: 8 }}>
                Eliminar
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="constraint-name">Nombre</label>
          <input
            id="constraint-name"
            value={formName}
            onChange={e => setFormName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="constraint-value">Valor mínimo (m)</label>
          <input
            id="constraint-value"
            type="number"
            value={formValue}
            onChange={e => setFormValue(e.target.value)}
          />
        </div>
        <button type="submit">Agregar</button>
      </form>

      <button onClick={handleApplyDefaults} style={{ marginTop: 8 }}>
        Aplicar predeterminadas
      </button>
    </div>
  );
};

export default ConstraintPanel;
