import React, { useState } from 'react';
import { getDefaultConstraints, getConstraintDisplayName } from '../utils/constraintUtils.js';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const sourceLabel = (sourceId, elements) => {
  if (!sourceId || sourceId === 'any') return 'Cualquier elemento';
  const el = elements.find(e => e.id === sourceId);
  return el ? (el.label || el.definitionId) : sourceId;
};

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
  const [formSource, setFormSource] = useState('');
  const [formTarget, setFormTarget] = useState('terrain');
  const [formValue, setFormValue] = useState('3');

  const getResult = (id) => validationResults.find(r => r.constraint?.id === id);

  const handleSubmit = (e) => {
    e.preventDefault();
    const distance = parseFloat(formValue);
    if (!formValue || isNaN(distance) || distance <= 0) return;
    if (!formSource) return;

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

  return (
    <div className="p-3 text-sm border-t border-gray-200">
      <h3 className="mt-0 mb-2 text-base font-semibold text-gray-800">Restricciones</h3>

      <ul className="list-none p-0 mb-3 space-y-1.5">
        {constraints.length === 0 && (
          <li className="text-gray-400 italic">Sin restricciones</li>
        )}
        {constraints.map(c => {
          const result = getResult(c.id);
          const isValid = !result || result.valid;
          return (
            <li key={c.id} className="flex items-start gap-1.5">
              <span
                data-testid={isValid ? 'constraint-valid' : 'constraint-violation'}
                className={`font-bold min-w-[14px] ${isValid ? 'text-green-500' : 'text-red-500'}`}
              >
                {isValid ? '✓' : '✗'}
              </span>
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={() => onToggleConstraint?.(c.id)}
                aria-label={`toggle-${c.id}`}
                className="mt-0.5 accent-blue-600"
              />
              <span className={`flex-1 ${c.enabled ? '' : 'opacity-50'}`}>
                {getConstraintDisplayName(c, elements)}
                {result && !result.valid && (
                  <span className="text-red-500 text-xs ml-1">
                    ({result.actualDistance?.toFixed(1)}m / mín. {result.requiredDistance}m)
                  </span>
                )}
              </span>
              <button
                onClick={() => onRemoveConstraint?.(c.id)}
                className="text-xs px-1 py-0 leading-tight border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleSubmit} data-testid="add-constraint-form" className="flex flex-col gap-2">
        <strong className="text-xs text-gray-600 uppercase tracking-wide">Nueva restricción</strong>

        <label className="flex flex-col gap-1">
          <span className="form-label">Origen</span>
          <select
            value={formSource}
            onChange={e => setFormSource(e.target.value)}
            required
            className="form-select"
          >
            <option value="">-- Selecciona un elemento --</option>
            {elements.map(el => (
              <option key={el.id} value={el.id}>
                {el.label || el.definitionId}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="form-label">Destino</span>
          <select
            value={formTarget}
            onChange={e => setFormTarget(e.target.value)}
            className="form-select"
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

        <label className="flex flex-col gap-1">
          <span className="form-label">Distancia mínima (m)</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={formValue}
            onChange={e => setFormValue(e.target.value)}
            required
            className="form-input"
          />
        </label>

        <button type="submit" disabled={!formSource} className="btn-primary">
          Agregar restricción
        </button>
      </form>

      <button onClick={handleApplyDefaults} className="btn mt-2 w-full">
        Aplicar predeterminadas
      </button>
    </div>
  );
};

export default ConstraintPanel;
