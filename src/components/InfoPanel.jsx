import React, { useState, useEffect } from 'react';
import { getConstraintDisplayName } from '../utils/constraintUtils.js';

const InfoPanel = ({
  points, finished, area, perimeter, baseScale,
  selectedElement, onRenameElement,
  constraints = [], validationResults = [], elements = [],
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  useEffect(() => {
    if (selectedElement) {
      setNameValue(selectedElement.label);
      setEditingName(false);
    }
  }, [selectedElement?.id]);

  const commitRename = () => {
    if (selectedElement && nameValue.trim()) {
      onRenameElement(selectedElement.id, nameValue);
    }
    setEditingName(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') { setNameValue(selectedElement.label); setEditingName(false); }
  };

  const getResult = (id) => validationResults.find(r => r.constraint?.id === id);
  const violations = constraints.filter(c => c.enabled && getResult(c.id) && !getResult(c.id).valid);
  const passing   = constraints.filter(c => c.enabled && (!getResult(c.id) || getResult(c.id).valid));
  const disabled  = constraints.filter(c => !c.enabled);

  return (
    <div className="p-3 bg-white border-l border-gray-300 min-w-[240px] overflow-y-auto text-sm flex flex-col gap-3">

      {/* Terrain */}
      <div>
        <div className="mb-1"><strong>Área:</strong> {area.toFixed(1)} m²</div>
        <div className="mb-1"><strong>Perímetro:</strong> {perimeter.toFixed(1)} m</div>
        <div className="text-gray-500 italic">
          {finished ? 'Polígono cerrado' : 'Polígono abierto'}
        </div>
        {points.length > 0 && (
          <div className="mt-2">
            <strong>Vértices:</strong>
            <ul className="mt-1 ml-4 space-y-0.5 text-xs text-gray-600">
              {points.map((p, i) => (
                <li key={i}>({(p.x / baseScale).toFixed(1)}, {(p.y / baseScale).toFixed(1)})</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Selected element */}
      {selectedElement && (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Elemento seleccionado</div>
          {editingName ? (
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                className="form-input flex-1 text-sm"
              />
              <button onClick={commitRename} className="btn text-xs px-2">✓</button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 group cursor-pointer"
              onClick={() => { setNameValue(selectedElement.label); setEditingName(true); }}
              title="Clic para renombrar"
            >
              <span className="font-semibold text-gray-800">{selectedElement.label}</span>
              <span className="text-gray-300 group-hover:text-gray-500 text-xs transition-colors">✎</span>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-500 space-y-0.5">
            <div>Tipo: <span className="text-gray-700">{selectedElement.definitionId}</span></div>
            <div>Pos: <span className="text-gray-700">
              {(selectedElement.x / baseScale).toFixed(1)} m, {(selectedElement.y / baseScale).toFixed(1)} m
            </span></div>
          </div>
        </div>
      )}

      {/* Constraints */}
      {constraints.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Restricciones</div>

          {/* Summary badges */}
          <div className="flex gap-2 mb-2 text-xs">
            {violations.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                {violations.length} violación{violations.length > 1 ? 'es' : ''}
              </span>
            )}
            {passing.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">
                {passing.length} ok
              </span>
            )}
            {disabled.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                {disabled.length} desact.
              </span>
            )}
          </div>

          <ul className="space-y-1.5">
            {constraints.map(c => {
              const result = getResult(c.id);
              const isValid = !result || result.valid;
              return (
                <li key={c.id} className={`text-xs flex items-start gap-1.5 ${!c.enabled ? 'opacity-40' : ''}`}>
                  <span className={`mt-0.5 font-bold shrink-0 ${isValid ? 'text-green-500' : 'text-red-500'}`}>
                    {c.enabled ? (isValid ? '✓' : '✗') : '–'}
                  </span>
                  <span className="flex-1 leading-snug">
                    {getConstraintDisplayName(c, elements)}
                    {result && !result.valid && (
                      <span className="block text-red-400 mt-0.5">
                        {result.actualDistance?.toFixed(1)} m / mín. {result.requiredDistance} m
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InfoPanel;
