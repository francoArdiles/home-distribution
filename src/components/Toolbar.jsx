import React from 'react';

const Toolbar = ({ pointsCount, finished, gridVisible, onFinish, onToggleGrid, onClear, solarVisible, onToggleSolar, onToggleMeasurements, terrainEditMode, onToggleTerrainEdit, entranceMode, onToggleEntrance, onSave, onOpen, onCreateCustomElement }) => {
  const canFinish = pointsCount >= 3 && !finished;

  return (
    <div className="flex flex-wrap gap-2 px-3 py-2 bg-gray-100 border-b border-gray-300 shadow-sm">
      <button className="btn" onClick={onFinish} disabled={!canFinish}>
        Finalizar terreno
      </button>
      <button className="btn" onClick={onToggleGrid}>
        {gridVisible ? 'Ocultar cuadrícula' : 'Mostrar cuadrícula'}
      </button>
      {finished && (
        <button
          className={`btn ${terrainEditMode ? 'btn-active' : ''}`}
          onClick={onToggleTerrainEdit}
        >
          Ajustar terreno
        </button>
      )}
      {finished && (
        <button
          className={`btn ${entranceMode ? 'btn-active' : ''}`}
          onClick={onToggleEntrance}
        >
          Entrada
        </button>
      )}
      {finished && (
        <button className="btn" onClick={onToggleSolar}>
          Solar
        </button>
      )}
      {finished && (
        <button className="btn" onClick={onToggleMeasurements}>
          Medidas
        </button>
      )}
      <button className="btn" onClick={onCreateCustomElement} title="Crear un objeto de forma personalizada">
        Crear objeto
      </button>
      <button className="btn" onClick={onSave} title="Guardar proyecto como archivo JSON">
        Guardar
      </button>
      <button className="btn" onClick={onOpen} title="Abrir un proyecto guardado">
        Abrir
      </button>
      <button className="btn" onClick={onClear}>
        Limpiar
      </button>
    </div>
  );
};

export default Toolbar;
