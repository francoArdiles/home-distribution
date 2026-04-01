import React from 'react';
import LocationSelector from './LocationSelector.jsx';
import TimeSelector from './TimeSelector.jsx';
import { mergeSolarConfig } from '../utils/solarConfigUtils.js';

const SolarPanel = ({ solarConfig, onConfigChange }) => {
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
    <div className="p-4 bg-white min-w-[280px] text-sm">
      <LocationSelector location={solarConfig.location} onChange={handleLocationChange} />
      <TimeSelector dateTime={solarConfig.dateTime} onChange={handleTimeChange} />

      <div className="mt-3 space-y-1.5">
        {[
          { key: 'showCardinals',  label: 'Mostrar cardinales' },
          { key: 'showSolarPath',  label: 'Mostrar trayectoria solar' },
          { key: 'showShadows',    label: 'Mostrar sombras' },
          { key: 'northAtTop',     label: 'Norte arriba' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={displayOptions[key]}
              onChange={() => toggle(key)}
              className="accent-blue-600"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default SolarPanel;
