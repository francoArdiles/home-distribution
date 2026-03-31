import React from 'react';

const Toolbar = ({ pointsCount, finished, gridVisible, onFinish, onToggleGrid, onClear, solarVisible, onToggleSolar, onToggleMeasurements, terrainEditMode, onToggleTerrainEdit, entranceMode, onToggleEntrance, onSave, onOpen, onCreateCustomElement }) => {
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
        <button
          onClick={onToggleTerrainEdit}
          style={{ background: terrainEditMode ? '#ffd700' : undefined, fontWeight: terrainEditMode ? 'bold' : undefined }}
        >
          Ajustar terreno
        </button>
      )}
      {finished && (
        <button
          onClick={onToggleEntrance}
          style={{ background: entranceMode ? '#ffd700' : undefined, fontWeight: entranceMode ? 'bold' : undefined }}
        >
          Entrada
        </button>
      )}
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
      <button onClick={onCreateCustomElement} title="Crear un objeto de forma personalizada">
        Crear objeto
      </button>
      <button onClick={onSave} title="Guardar proyecto como archivo JSON">
        Guardar
      </button>
      <button onClick={onOpen} title="Abrir un proyecto guardado">
        Abrir
      </button>
      <button onClick={onClear}>
        Limpiar
      </button>
    </div>
  );
};

export default Toolbar;
