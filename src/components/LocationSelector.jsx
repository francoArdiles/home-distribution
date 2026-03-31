import React from 'react';

export const PRESET_CITIES = [
  { name: 'Madrid',            latitude: 40.4168,  longitude: -3.7038,  utcOffset: 1  },
  { name: 'Buenos Aires',      latitude: -34.6037, longitude: -58.3816, utcOffset: -3 },
  { name: 'Ciudad de México',  latitude: 19.4326,  longitude: -99.1332, utcOffset: -6 },
  { name: 'Santiago de Chile', latitude: -33.4489, longitude: -70.6693, utcOffset: -4 },
  { name: 'Bogotá',            latitude: 4.7110,   longitude: -74.0721, utcOffset: -5 },
  { name: 'Lima',              latitude: -12.0464, longitude: -77.0428, utcOffset: -5 },
];

const LocationSelector = ({ location, onChange }) => {
  const handleCityChange = (e) => {
    const city = PRESET_CITIES.find(c => c.name === e.target.value);
    if (city) onChange({ latitude: city.latitude, longitude: city.longitude, cityName: city.name, utcOffset: city.utcOffset });
  };

  const handleLatChange = (e) => {
    const lat = parseFloat(e.target.value);
    if (isNaN(lat) || lat < -90 || lat > 90) return;
    onChange({ ...location, latitude: lat, cityName: 'Custom' });
  };

  const handleLonChange = (e) => {
    const lon = parseFloat(e.target.value);
    if (isNaN(lon) || lon < -180 || lon > 180) return;
    onChange({ ...location, longitude: lon, cityName: 'Custom' });
  };

  const handleUtcOffsetChange = (e) => {
    const offset = parseInt(e.target.value, 10);
    if (isNaN(offset) || offset < -12 || offset > 14) return;
    onChange({ ...location, utcOffset: offset, cityName: 'Custom' });
  };

  return (
    <div>
      <select value={location.cityName} onChange={handleCityChange}>
        {PRESET_CITIES.map(c => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
        {!PRESET_CITIES.find(c => c.name === location.cityName) && (
          <option value="Custom">Custom</option>
        )}
      </select>
      <div>
        <label htmlFor="lat-input">Latitud</label>
        <input
          id="lat-input"
          type="number"
          min="-90" max="90" step="0.0001"
          value={location.latitude}
          onChange={handleLatChange}
        />
      </div>
      <div>
        <label htmlFor="lon-input">Longitud</label>
        <input
          id="lon-input"
          type="number"
          min="-180" max="180" step="0.0001"
          value={location.longitude}
          onChange={handleLonChange}
        />
      </div>
      <div>
        <label htmlFor="utcoffset-input">Huso horario (UTC)</label>
        <input
          id="utcoffset-input"
          type="number"
          min="-12" max="14" step="1"
          value={location.utcOffset ?? 0}
          onChange={handleUtcOffsetChange}
        />
      </div>
    </div>
  );
};

export default LocationSelector;
