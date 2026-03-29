import React from 'react';
import LocationSelector from './LocationSelector.jsx';
import TimeSelector from './TimeSelector.jsx';
import { mergeSolarConfig } from '../utils/solarConfigUtils.js';

const SolarPanel = ({ solarConfig, onConfigChange, onClose }) => {
  const { displayOptions } = solarConfig;

  const toggle = (key) => {
    onConfigChange(mergeSolarConfig(solarConfig, {
      displayOptions: { [key]: !displayOptions[key] },
    }));
  };

  const handleLocationChange = (location) => {
    onConfigChange(mergeSolarConfig(solarConfig, { location }));
  };

  const handleTimeChange = (dateTime) => {
    onConfigChange(mergeSolarConfig(solarConfig, { dateTime }));
  };

  return (
    <div style={{ padding: 16, background: '#fff', border: '1px solid #ccc', minWidth: 280 }}>
      <h3 style={{ margin: '0 0 12px' }}>Configuración Solar</h3>

      <LocationSelector location={solarConfig.location} onChange={handleLocationChange} />
      <TimeSelector dateTime={solarConfig.dateTime} onChange={handleTimeChange} />

      <div style={{ marginTop: 12 }}>
        <label>
          <input
            type="checkbox"
            checked={displayOptions.showCardinals}
            onChange={() => toggle('showCardinals')}
          />
          {' '}Mostrar cardinales
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={displayOptions.showSolarPath}
            onChange={() => toggle('showSolarPath')}
          />
          {' '}Mostrar trayectoria solar
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={displayOptions.showShadows}
            onChange={() => toggle('showShadows')}
          />
          {' '}Mostrar sombras
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={displayOptions.northAtTop}
            onChange={() => toggle('northAtTop')}
          />
          {' '}Norte arriba
        </label>
      </div>

      <button style={{ marginTop: 12 }} onClick={onClose}>Cerrar</button>
    </div>
  );
};

export default SolarPanel;
