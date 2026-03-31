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
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
      <h3>Medidas</h3>
      <div>
        <button
          aria-pressed={activeTool === 'distance' ? 'true' : 'false'}
          onClick={() => onSelectTool('distance')}
        >
          Regla
        </button>
        <button
          aria-pressed={activeTool === 'area' ? 'true' : 'false'}
          onClick={() => onSelectTool('area')}
        >
          Área
        </button>
        <button onClick={onClearMeasurements}>Limpiar</button>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={showMeasurements}
            onChange={onToggleMeasurements}
            aria-label="Mostrar mediciones"
          />
          Mostrar mediciones
        </label>
        <label>
          <input
            type="checkbox"
            checked={showConstraints}
            onChange={onToggleConstraints}
            aria-label="Mostrar restricciones"
          />
          Mostrar restricciones
        </label>
      </div>
    </div>
  );
};

export default MeasurementToolkit;
