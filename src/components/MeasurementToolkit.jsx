import React from 'react';

const MeasurementToolkit = ({
  activeTool,
  onSelectTool,
  onClearMeasurements,
  showMeasurements,
  showConstraints,
  onToggleMeasurements,
  onToggleConstraints,
}) => {
  return (
    <div className="p-3 text-sm">
      <h3 className="mt-0 mb-2 text-base font-semibold text-gray-800">Medidas</h3>
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          aria-pressed={activeTool === 'distance' ? 'true' : 'false'}
          className={`btn ${activeTool === 'distance' ? 'btn-active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'distance' ? 'none' : 'distance')}
        >
          Regla
        </button>
        <button
          aria-pressed={activeTool === 'area' ? 'true' : 'false'}
          className={`btn ${activeTool === 'area' ? 'btn-active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'area' ? 'none' : 'area')}
        >
          Área
        </button>
        <button
          aria-pressed={activeTool === 'eraser' ? 'true' : 'false'}
          className={`btn ${activeTool === 'eraser' ? 'btn-active' : ''}`}
          onClick={() => onSelectTool(activeTool === 'eraser' ? 'none' : 'eraser')}
          title="Borrador: haz clic sobre una medida para eliminarla"
        >
          Borrador
        </button>
        <button className="btn" onClick={onClearMeasurements}>Limpiar</button>
      </div>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showMeasurements}
            onChange={onToggleMeasurements}
            aria-label="Mostrar mediciones"
            className="accent-blue-600"
          />
          Mostrar mediciones
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showConstraints}
            onChange={onToggleConstraints}
            aria-label="Mostrar restricciones"
            className="accent-blue-600"
          />
          Mostrar restricciones
        </label>
      </div>
    </div>
  );
};

export default MeasurementToolkit;
