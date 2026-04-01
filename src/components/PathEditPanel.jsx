import React from 'react';
import { pathTotalLength } from '../utils/pathUtils.js';

const PathEditPanel = ({ path, onDelete, onUpdate }) => {
  if (!path) return null;

  return (
    <div className="p-3 text-sm border-t border-gray-300">
      <h4 className="font-semibold text-gray-700 mb-2">{path.label || 'Camino'}</h4>
      <div className="mb-2 text-xs text-gray-500">
        Longitud: <span data-testid="path-length">{pathTotalLength(path).toFixed(2)}m</span>
      </div>
      <div className="mb-2">
        <label className="text-xs text-gray-600 block mb-1">Grosor (m)</label>
        <input
          type="number"
          min="0.5"
          max="10"
          step="0.5"
          data-testid="path-width-input"
          value={path.width}
          onChange={e => onUpdate(path.id, { width: Number(e.target.value) })}
          className="form-input w-full text-xs"
        />
      </div>
      <button
        data-testid="path-delete-btn"
        className="btn w-full text-xs text-red-600 border-red-300 hover:bg-red-50"
        onClick={() => onDelete(path.id)}
      >
        Eliminar camino
      </button>
    </div>
  );
};

export default PathEditPanel;
