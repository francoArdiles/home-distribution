import React from 'react';

const Toolbar = ({ pointsCount, finished, gridVisible, onFinish, onToggleGrid, onClear, solarVisible, onToggleSolar, onToggleMeasurements }) => {
  const canFinish = pointsCount >= 3 && !finished;

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '8px', background: '#f0f0f0' }}>
      <button onClick={onFinish} disabled={!canFinish}>
        Finalizar terreno
      </button>
      <button onClick={onToggleGrid}>
        {gridVisible ? 'Ocultar cuadrícula' : 'Mostrar cuadrícula'}
      </button>
      {finished && (
        <button onClick={onToggleSolar}>
          Solar
        </button>
      )}
      {finished && (
        <button onClick={onToggleMeasurements}>
          Medidas
        </button>
      )}
      <button onClick={onClear}>
        Limpiar
      </button>
    </div>
  );
};

export default Toolbar;
